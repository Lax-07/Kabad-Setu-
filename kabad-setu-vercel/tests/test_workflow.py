"""Integration checks with isolated SQL databases and real HTTP requests."""
import base64
import http.cookiejar
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch
import server

PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXRkAAAAASUVORK5CYII='

class Workflow(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_data = server.DATA
        server.DATA = Path(self.temp.name)
        server.init_db()
        self.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.http.server_port}'
        self.collector = self.client()
        self.recycler = self.client()
        self.stranger = self.client()
        self.env = patch.dict(os.environ, {'RECYCLER_PASSWORD': 'test-password'})
        self.env.start()
        for client in (self.collector, self.recycler, self.stranger):
            self.call("/api/demo/role", {"role":"admin", "password":"test-password"}, client)

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.env.stop()
        server.DATA = self.old_data
        self.temp.cleanup()

    def client(self):
        return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, path, body=None, client=None, origin=None):
        headers = {'Content-Type': 'application/json'}
        if origin:
            headers['Origin'] = origin
        req = urllib.request.Request(self.base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
        try:
            with (client or self.collector).open(req) as r:
                raw = r.read()
                return r.status, json.loads(raw) if 'application/json' in r.headers.get('Content-Type', '') else raw
        except urllib.error.HTTPError as e:
            with e:
                return e.code, json.load(e)

    def register(self, client=None, phone='9876543210'):
        client = client or self.collector
        status, sent = self.call('/api/otp/send', {'phone':phone}, client)
        if status != 201:
            return status, sent
        status, checked = self.call('/api/otp/check', {'phone':phone, 'code':sent['demo_code']}, client)
        if status != 200:
            return status, checked
        return self.call('/api/register', {'name':'Test Collector','phone':phone,'verification_token':checked['verification_token'],'address':'Test Lane, Delhi 110020','lat':28.53,'lng':77.27,'consent':True}, client)

    def make_lot(self):
        status, lot = self.call('/api/lots', {'image':PHOTO,'items':[{'name':'Newspapers','category':'Paper','kg':5,'rate':99999}]})
        self.assertEqual(status, 201, lot)
        self.assertEqual(lot['items'][0]['rate'], 12)
        return lot

    def book(self, lot):
        return self.call('/api/pickups', {'lot_id':lot['id'],'recycler_id':1,'pickup_date':(date.today()+timedelta(days=1)).isoformat(),'slot':'09:00–12:00','total':99999})

    def test_complete_transaction_and_duplicate_protection(self):
        self.assertEqual(self.register()[0], 201)
        _, initial = self.call('/api/bootstrap')
        self.assertEqual(initial['user']['verification_status'], 'phone_verified')
        self.assertNotIn('id_type', initial['user'])
        self.assertNotIn('id_last4', initial['user'])
        self.assertLess(initial['recyclers'][0]['distance'], 1)
        lot = self.make_lot()
        status, pickup = self.book(lot)
        self.assertEqual(status, 201, pickup)
        self.assertEqual(pickup['total'], 60)
        self.assertEqual(self.book(lot)[0], 409)
        self.assertEqual(self.call('/api/recycler/login', {'recycler_id':1,'password':'test-password'}, self.recycler)[0], 200)
        _, data = self.call('/api/pickups?role=recycler', client=self.recycler)
        self.assertEqual(len(data['notifications']), 1)
        self.assertEqual(data['pickups'][0]['collector_name'], 'Test Collector')
        proof = {'pickup_id':pickup['id'],'image':PHOTO,'captured_at':server.now(),'lat':28.53,'lng':77.27,'accuracy':9}
        self.assertEqual(self.call('/api/proofs', proof, self.collector)[0], 401)
        self.assertEqual(self.call('/api/proofs', {**proof,'lat':None}, self.recycler)[0], 400)
        self.assertEqual(self.call('/api/proofs', proof, self.recycler)[0], 201)
        self.assertEqual(self.call('/api/proofs', proof, self.recycler)[0], 409)
        _, history = self.call('/api/pickups')
        self.assertEqual(history['pickups'][0]['status'], 'completed')
        self.assertEqual(len(history['pickups'][0]['sha256']), 64)
        self.assertEqual(self.call(f"/api/photos/proof/{pickup['id']}")[0], 200)
        with server.db() as c:
            self.assertEqual(c.execute('SELECT COUNT(*) FROM evidence.proofs').fetchone()[0], 1)
            self.assertNotIn('Aadhaar', str([tuple(r) for r in c.execute('SELECT * FROM collectors')]))
        self.assertTrue((server.DATA/'transactions.sqlite3').exists())

    def test_ewaste_subcategories_pricing_and_storage(self):
        self.register()
        _, config = self.call('/api/bootstrap')
        self.assertEqual(len(config['ewaste_rates']), 9)
        items = [
            {'name':'Old laptops', 'category':'E-waste', 'subcategory':'Laptops', 'kg':2, 'rate':99999},
            {'name':'Insulated wires', 'category':'E-waste', 'subcategory':'Wires & cables', 'kg':3},
            {'name':'PCBs', 'category':'E-waste', 'subcategory':'Circuit boards', 'kg':1},
        ]
        status, lot = self.call('/api/lots', {'image':PHOTO, 'items':items})
        self.assertEqual(status, 201, lot)
        self.assertEqual([i['rate'] for i in lot['items']], [180, 120, 200])
        booking = {'lot_id':lot['id'], 'recycler_id':1, 'pickup_date':(date.today()+timedelta(days=1)).isoformat(), 'slot':'09:00–12:00'}
        self.assertEqual(self.call('/api/pickups', booking)[0], 400)
        status, pickup = self.call('/api/pickups', {**booking, 'recycler_id':3})
        self.assertEqual(status, 201, pickup)
        self.assertEqual(pickup['total'], 920)
        _, history = self.call('/api/pickups')
        self.assertEqual([i['subcategory'] for i in history['pickups'][0]['items']], ['Laptops', 'Wires & cables', 'Circuit boards'])
        self.assertEqual(server.clean_items([{'name':'Legacy electronic lot','category':'E-waste','kg':2}])[0]['subcategory'], 'Mixed e-waste')
        self.assertEqual(self.call('/api/lots', {'image':PHOTO, 'items':[{**items[0], 'subcategory':'Made up'}]})[0], 400)
        # AI output is parsed through the same category/rate validation as manual estimates.
        from io import BytesIO
        model_response = {'output':[{'content':[{'type':'output_text', 'text':json.dumps({'items':items})}]}]}
        with patch.dict(os.environ, {'OPENAI_API_KEY':'test-only'}), patch('server.urllib.request.urlopen', return_value=BytesIO(json.dumps(model_response).encode())):
            analyzed=server.analyze(PHOTO)
        self.assertEqual(analyzed[2]['subcategory'], 'Circuit boards')
        self.assertEqual(analyzed[0]['total'], 360)

    def test_edit_location_and_preserve_booking_address(self):
        change={'address':'New collection point, Mayapuri','lat':28.628,'lng':77.123}
        self.assertEqual(self.call('/api/profile/location',change)[0],401)
        self.register()
        lot=self.make_lot()
        self.assertEqual(self.book(lot)[0],201)
        self.assertEqual(self.call('/api/profile/location',change)[0],200)
        _,config=self.call('/api/bootstrap')
        self.assertEqual(config['user']['address'],change['address'])
        self.assertEqual(config['recyclers'][0]['id'],2)
        _,history=self.call('/api/pickups')
        self.assertEqual(history['pickups'][0]['address'],'Test Lane, Delhi 110020')
        self.assertEqual(history['pickups'][0]['pickup_lat'],28.53)
        second=self.make_lot()
        self.assertEqual(self.book(second)[0],201)
        _,history=self.call('/api/pickups')
        self.assertEqual(history['pickups'][0]['address'],change['address'])
        self.assertEqual(history['pickups'][0]['pickup_lat'],28.628)
        for invalid in [{**change,'lat':100},{**change,'lng':None},{'address':'Missing coordinates'},{**change,'address':''}]:
            self.assertEqual(self.call('/api/profile/location',invalid)[0],400)
        self.register(self.stranger,'9876543211')
        self.call('/api/profile/location',{**change,'address':'Other collector address','collector_id':1},self.stranger)
        self.assertEqual(self.call('/api/bootstrap')[1]['user']['address'],change['address'])
        self.assertEqual(self.call('/api/profile/location',{'address':'Address only','lat':None,'lng':None})[0],200)
        _,config=self.call('/api/bootstrap')
        self.assertIsNone(config['user']['lat'])
        self.assertTrue(all('distance' not in r for r in config['recyclers']))
        # Starting again must not overwrite a booking's snapshot with the latest profile.
        server.init_db()
        self.assertEqual(self.call('/api/pickups')[1]['pickups'][-1]['address'],'Test Lane, Delhi 110020')

    def test_generated_description_metadata(self):
        self.register()
        automatic={'name':'Laptops','name_key':'Laptops','category':'E-waste','subcategory':'Laptops','kg':2}
        code,lot=self.call('/api/lots',{'image':PHOTO,'source':'local_ai','items':[automatic]})
        self.assertEqual(code,201)
        self.assertEqual(lot['items'][0]['name'],'Laptops')
        self.assertEqual(lot['items'][0]['name_key'],'Laptops')
        custom={**automatic,'name':'मेरे दो पुराने लैपटॉप','name_key':None}
        code,lot=self.call('/api/lots',{'image':PHOTO,'items':[custom]})
        self.assertEqual(code,201)
        self.assertEqual(lot['items'][0]['name'],custom['name'])
        self.assertIsNone(lot['items'][0]['name_key'])
        self.assertEqual(self.call('/api/lots',{'image':PHOTO,'items':[{**automatic,'name_key':'Copper'}]})[0],400)

    def test_local_ai_source_and_public_assets(self):
        self.register()
        status, lot=self.call('/api/lots', {'image':PHOTO, 'source':'local_ai', 'items':[{'name':'Laptop','category':'E-waste','subcategory':'Laptops','kg':2,'rate':9999}]})
        self.assertEqual(status,201)
        self.assertEqual(lot['source'],'local_ai')
        self.assertEqual(lot['items'][0]['total'],360)
        for path in ['/analysis-worker.js','/local-analysis.js','/i18n.js']:
            self.assertEqual(self.call(path)[0],200)
        for path in ['/models/../../data/marketplace.sqlite3','/vendor/../app.js']:
            self.assertEqual(self.call(path)[0],404)

    def test_bundled_audio_and_byte_ranges(self):
        import io
        import struct
        import wave
        for prefix in ['', 'en-', 'mr-', 'kn-']:
            for name in ['welcome','registration-name','registration-phone','registration-address','registration-complete','sell']:
                status, raw = self.call(f'/audio/{prefix}{name}.wav')
                self.assertEqual(status, 200)
                with wave.open(io.BytesIO(raw)) as audio:
                    self.assertGreater(audio.getnframes()/audio.getframerate(), 1)
                    samples=audio.readframes(audio.getnframes())
                    self.assertGreater(max(abs(v) for v in struct.unpack('<'+'h'*(len(samples)//2), samples)), 100)
        req=urllib.request.Request(self.base+'/audio/welcome.wav', headers={'Range':'bytes=0-43'})
        with self.collector.open(req) as response:
            self.assertEqual(response.status, 206)
            self.assertEqual(len(response.read()), 44)
            self.assertTrue(response.headers['Content-Range'].startswith('bytes 0-43/'))
        self.assertEqual(self.call('/audio/missing.wav')[0], 404)

    def test_access_control(self):
        self.register()
        lot = self.make_lot()
        self.book(lot)
        self.assertEqual(self.call('/api/pickups', client=self.stranger)[0], 401)
        self.assertEqual(self.call(f"/api/photos/lot/{lot['id']}", client=self.stranger)[0], 404)
        self.register(self.stranger, '9876543211')
        self.assertEqual(self.call('/api/pickups', client=self.stranger)[1]['pickups'], [])
        self.assertEqual(self.call(f"/api/photos/lot/{lot['id']}", client=self.stranger)[0], 404)
        self.call('/api/recycler/login', {'recycler_id':2,'password':'test-password'}, self.recycler)
        self.assertEqual(self.call('/api/pickups?role=recycler', client=self.recycler)[1]['pickups'], [])
        self.assertEqual(self.call(f"/api/photos/lot/{lot['id']}", client=self.recycler)[0], 404)
        self.assertEqual(self.call('/data/marketplace.sqlite3')[0], 404)
        self.assertEqual(self.call('/api/logout', {'role':'collector'}, origin='https://evil.example')[0], 403)

    def test_demo_role_restrictions(self):
        self.register()
        lot = self.make_lot()
        self.book(lot)
        self.assertEqual(self.call('/api/demo/role', {'role':'user'})[0], 200)
        self.assertIsNone(self.call('/api/bootstrap')[1]['recycler_id'])
        self.assertEqual(self.call('/api/pickups?role=recycler')[0], 403)
        self.assertEqual(self.call('/api/recycler/login', {'recycler_id':1,'password':'test-password'})[0], 403)
        self.assertEqual(self.call('/api/demo/role', {'role':'admin','password':'wrong'})[0], 401)
        self.assertEqual(self.call('/api/demo/role', {'role':'recycler','password':'test-password','recycler_id':2})[0], 200)
        self.assertIsNone(self.call('/api/bootstrap')[1]['user'])
        self.assertEqual(self.call('/api/pickups')[0], 403)
        self.assertEqual(self.call('/api/pickups?role=recycler')[1]['pickups'], [])
        self.assertEqual(self.call(f"/api/photos/lot/{lot['id']}")[0], 404)
        self.assertEqual(self.register()[0], 403)
        profile = {'address':'Updated recycler address','lat':12.34,'lng':56.78,
                   'materials':['E-waste','Copper'],'operating_hours':'08:30–17:30, Monday–Friday'}
        self.assertEqual(self.call('/api/recycler/profile', profile)[0], 200)
        recyclers = {item['id']:item for item in self.call('/api/bootstrap')[1]['recyclers']}
        self.assertEqual(recyclers[2]['address'], profile['address'])
        self.assertEqual(recyclers[2]['materials'], 'Copper,E-waste')
        self.assertEqual(recyclers[2]['operating_hours'], profile['operating_hours'])
        self.assertNotEqual(recyclers[1]['address'], profile['address'])
        self.assertEqual(self.call('/api/recycler/profile', {**profile,'materials':[]})[0], 400)
        self.assertEqual(self.call('/api/demo/role', {'role':'admin','password':'test-password'})[0], 200)
        self.assertIsNotNone(self.call('/api/bootstrap')[1]['user'])

    def test_validation_and_no_fake_ai(self):
        self.assertEqual(self.call('/api/lots', {'image':PHOTO,'items':[]})[0], 401)
        self.register()
        self.assertEqual(self.register()[0], 409)
        for kg in [-1,0,10001,'NaN',float('inf')]:
            self.assertEqual(self.call('/api/lots', {'image':PHOTO,'items':[{'name':'Paper','category':'Paper','kg':kg}]})[0], 400)
        self.assertEqual(self.call('/api/lots', {'image':'data:image/png;base64,'+base64.b64encode(b'x'*60).decode(),'items':[]})[0], 400)
        with patch.dict(os.environ, {'OPENAI_API_KEY':''}):
            self.assertEqual(self.call('/api/lots', {'image':PHOTO,'analyze':True})[0], 503)
        lot=self.make_lot()
        for extra in [{'pickup_date':date.today().isoformat()},{'recycler_id':3},{'slot':'midnight'}]:
            body={'lot_id':lot['id'],'recycler_id':1,'pickup_date':(date.today()+timedelta(days=1)).isoformat(),'slot':'09:00–12:00',**extra}
            self.assertEqual(self.call('/api/pickups', body)[0], 400)
        self.assertEqual(self.call('/api/recycler/login', {'recycler_id':1,'password':'wrong'}, self.recycler)[0], 401)

    def test_otp_is_required_fresh_and_single_use(self):
        phone = '9876543299'
        direct = {'name':'No OTP','phone':phone,'verification_token':'made-up','address':'Delhi','consent':True}
        self.assertEqual(self.call('/api/register', direct)[0], 403)
        with patch('server.secrets.randbelow', side_effect=[111111, 222222]):
            first = self.call('/api/otp/send', {'phone':phone})
            self.assertEqual(first[0], 201)
            self.assertEqual(first[1]['demo_code'], '111111')
            self.assertEqual(self.call('/api/otp/check', {'phone':phone,'code':'000000'})[0], 400)
            with server.db() as c:
                c.execute('UPDATE otp_requests SET last_sent=0 WHERE phone=?', (phone,))
                c.commit()
            second = self.call('/api/otp/send', {'phone':phone})
            self.assertEqual(second[1]['demo_code'], '222222')
        self.assertEqual(self.call('/api/otp/check', {'phone':phone,'code':'111111'})[0], 400)
        status, checked = self.call('/api/otp/check', {'phone':phone,'code':'222222'})
        self.assertEqual(status, 200)
        payload = {**direct, 'verification_token':checked['verification_token']}
        self.assertEqual(self.call('/api/register', payload)[0], 201)
        self.assertEqual(self.call('/api/register', payload)[0], 403)

if __name__=='__main__':
    unittest.main()
