"""Optional UI smoke test using an installed Chrome, with no third-party packages."""
import base64
import json
import os
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

class CDP:
    def __init__(self, url):
        from urllib.parse import urlparse
        p = urlparse(url)
        self.sock = socket.create_connection((p.hostname, p.port), timeout=240)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(f'GET {p.path} HTTP/1.1\r\nHost: {p.hostname}:{p.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
        header = b''
        while not header.endswith(b'\r\n\r\n'):
            header += self.sock.recv(1)
        assert header.split(b' ')[1] == b'101', header
        self.seq = 0
        self.errors = []

    def read(self, n):
        result = b''
        while len(result) < n:
            chunk = self.sock.recv(n-len(result))
            if not chunk:
                raise RuntimeError('Chrome disconnected')
            result += chunk
        return result

    def call(self, method, params=None):
        self.seq += 1
        payload = json.dumps({'id':self.seq,'method':method,'params':params or {}}).encode()
        mask = os.urandom(4)
        n = len(payload)
        header = bytes([0x81,0x80|n]) if n < 126 else bytes([0x81,0x80|126])+struct.pack('!H',n) if n < 65536 else bytes([0x81,0x80|127])+struct.pack('!Q',n)
        self.sock.sendall(header+mask+bytes(b^mask[i%4] for i,b in enumerate(payload)))
        while True:
            a,b = self.read(2)
            n = b&127
            if n==126:n=struct.unpack('!H',self.read(2))[0]
            elif n==127:n=struct.unpack('!Q',self.read(8))[0]
            data=json.loads(self.read(n))
            if data.get('method')=='Runtime.exceptionThrown':self.errors.append(data['params'])
            if data.get('id')==self.seq:
                if 'error' in data:raise RuntimeError(data['error'])
                return data.get('result',{})

    def js(self, expr):
        r=self.call('Runtime.evaluate',{'expression':expr,'awaitPromise':True,'returnByValue':True})
        if 'exceptionDetails' in r:raise AssertionError(r['exceptionDetails'])
        return r.get('result',{}).get('value')

    def wait(self, expr):
        for _ in range(80):
            if self.js(expr):return
            time.sleep(.1)
        raise AssertionError('Timed out: '+expr+'; page: '+str(self.js('document.body.innerText')))

    def click(self, selector):
        self.js(f'document.querySelector({json.dumps(selector)}).scrollIntoView({{block:"center"}})')
        point=self.js(f'(()=>{{const r=document.querySelector({json.dumps(selector)}).getBoundingClientRect();return {{x:r.x+r.width/2,y:r.y+r.height/2}};}})()')
        self.call('Input.dispatchMouseEvent', {'type':'mousePressed','button':'left','clickCount':1,**point})
        self.call('Input.dispatchMouseEvent', {'type':'mouseReleased','button':'left','clickCount':1,**point})

    def shot(self, path):
        result=self.call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
        path.write_bytes(base64.b64decode(result['data']))

if __name__=='__main__':
    if not Path(CHROME).exists():sys.exit('Google Chrome is required for this optional smoke test.')
    with tempfile.TemporaryDirectory(prefix='kabad-browser-') as temp:
        profile=Path(temp)/'chrome'
        env={**os.environ,'KABAD_DATA_DIR':str(Path(temp)/'data'),'PORT':'8765','OPENAI_API_KEY':'','RECYCLER_PASSWORD':'demo-recycler'}
        app=subprocess.Popen([sys.executable,str(ROOT/'server.py')],env=env,stdout=subprocess.DEVNULL)
        chrome=None
        try:
            chrome=subprocess.Popen([CHROME,'--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',f'--user-data-dir={profile}','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            for _ in range(100):
                if (profile/'DevToolsActivePort').exists():break
                time.sleep(.1)
            port=(profile/'DevToolsActivePort').read_text().splitlines()[0]
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json') as response:tabs=json.load(response)
            c=CDP(next(t['webSocketDebuggerUrl'] for t in tabs if t['type']=='page'))
            c.call('Runtime.enable');c.call('Page.enable')
            c.call('Page.addScriptToEvaluateOnNewDocument', {'source':"Object.defineProperty(window,'speechSynthesis',{value:undefined});"})
            c.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1080,'deviceScaleFactor':1,'mobile':False})
            c.call('Emulation.setGeolocationOverride',{'latitude':28.53,'longitude':77.27,'accuracy':12})
            c.call('Browser.grantPermissions',{'origin':'http://localhost:8765','permissions':['geolocation']})
            c.call('Page.navigate',{'url':'http://localhost:8765'})
            c.wait("!!document.querySelector('.hero')")
            c.js("(async()=>{await api('/api/demo/role',{role:'admin',password:'demo-recycler'});closeModal();await bootstrap();await render();})()")
            c.click('#language-toggle')
            c.wait("document.documentElement.lang==='hi' && document.querySelector('[data-page=home]').innerText==='मुख्य पृष्ठ'")
            assert 'पुराने इलेक्ट्रॉनिक्स।' in c.js("document.querySelector('.hero').innerText")
            c.call('Page.reload')
            c.wait("!!document.querySelector('.hero') && document.documentElement.lang==='hi'")
            c.wait("document.querySelector('.location-chip').innerText.includes('अपना स्थान')")
            c.shot(Path('/tmp/kabad-hindi.png'))
            c.js("location.hash='rates'")
            c.wait("!!document.querySelector('.rate-grid')")
            c.wait("document.querySelector('.page-heading').innerText.includes('हर इलेक्ट्रॉनिक')")
            c.js("location.hash='recyclers'")
            c.wait("!!document.querySelector('.filter-tabs')")
            c.wait("document.querySelector('.filter-tabs').innerText.includes('ई-कबाड़ रीसाइकलर')")
            c.js("location.hash='home'")
            c.wait("!!document.querySelector('.hero')")
            c.click('#language-toggle')
            c.wait("document.documentElement.lang==='en'")
            # Exercise fallback, denial, and late GPS results without depending on device hardware.
            assert c.js("""(async()=>{
              const geo=navigator.geolocation, original=geo.getCurrentPosition;
              try {
                const calls=[];
                geo.getCurrentPosition=(ok,fail,options)=>{calls.push(options);if(options.enableHighAccuracy)fail({code:3});else ok({coords:{latitude:12,longitude:77,accuracy:150}});};
                const result=await getGps();
                if(result.lat!==12||calls.length!==2||calls[1].enableHighAccuracy||calls.some(o=>o.maximumAge!==0))return false;
                let deniedCalls=0;
                geo.getCurrentPosition=(ok,fail)=>{deniedCalls++;fail({code:1});};
                try{await getGps();return false;}catch(e){if(deniedCalls!==1||!e.message.includes('browser settings'))return false;}
                return true;
              } finally {geo.getCurrentPosition=original;}
            })()""")
            assert c.js("""(async()=>{
              const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=1100;
              const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(1100,1100);
              for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=Math.random()*256;pixels.data[i+1]=Math.random()*256;pixels.data[i+2]=Math.random()*256;pixels.data[i+3]=255;}
              ctx.putImageData(pixels,0,0);
              const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
              if(blob.size<=2.5*1024*1024)return false;
              const result=await readPhoto(new File([blob],'large.png',{type:'image/png'}));
              return result.startsWith('data:image/jpeg;base64,')&&result.length<3500000;
            })()"""), 'Large photos were not optimized for Vercel upload limits'
            c.shot(Path('/tmp/kabad-desktop.png'))
            assert c.js('document.documentElement.scrollWidth <= innerWidth')
            c.js("window.voiceStarts=0;document.querySelector('#guide-audio').addEventListener('playing',()=>window.voiceStarts++)")
            c.click('[data-action="voice-start"]')
            c.wait("!!document.querySelector('#registration-form')")
            c.wait("state.gps?.lat===28.53 && state.regStep===0")
            c.wait("!guideAudio.paused && guideAudio.currentTime>0.2 && guideAudio.currentSrc.endsWith('registration-name.wav')")
            assert c.js('window.voiceStarts') == 1, 'Registration started duplicate audio'
            c.click('#modal [data-action="voice-stop"]')
            assert c.js('guideAudio.paused')
            c.click('#modal [data-action="read-step"]')
            c.wait('!guideAudio.paused && guideAudio.currentTime>0.2')
            c.js("document.querySelector('[name=name]').value='Keep my name'")
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            c.wait("document.querySelector('#reg-next').innerText.includes('ओटीपी बनाएँ')")
            assert c.js("document.querySelector('[name=name]').value")=='Keep my name'
            assert c.js("!document.querySelector('[name=id_type]') && !document.querySelector('[name=identity]')")
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            c.wait("document.querySelector('#reg-next').innerText.includes('Generate OTP')")
            c.js("document.querySelector('[name=name]').value='Browser Collector';document.querySelector('[name=phone]').value='9876543222';document.querySelector('#registration-form').requestSubmit()")
            c.wait('state.regStep===1')
            c.wait("!guideAudio.paused && guideAudio.currentSrc.endsWith('registration-phone.wav') && guideAudio.currentTime>0")
            c.wait("!!state.otpDemoCode")
            assert c.js("document.querySelector('#otp-status').innerText.includes(state.otpDemoCode)")
            c.js("document.querySelector('[name=otp]').value=state.otpDemoCode;document.querySelector('#registration-form').requestSubmit()")
            c.wait('state.regStep===2')
            c.js("document.querySelector('[name=address]').value='Test address, Okhla, New Delhi';document.querySelector('[name=consent]').checked=true")
            c.wait('state.gps!==null')
            c.js("document.querySelector('#registration-form').requestSubmit()")
            c.wait("!!document.querySelector('#upload-zone')")
            assert c.js("""(async()=>{
              const geo=navigator.geolocation,original=geo.getCurrentPosition;
              let deliver;
              try{
                geo.getCurrentPosition=ok=>{deliver=ok;};
                editLocation();clearEditedGps();
                deliver({coords:{latitude:1,longitude:2,accuracy:10}});
                await new Promise(resolve=>setTimeout(resolve,0));
                return document.querySelector('#location-form [name=lat]').value===''&&!document.querySelector('#location-form [type=submit]').disabled;
              }finally{geo.getCurrentPosition=original;closeModal();}
            })()""")
            c.click('[data-action="edit-location"]')
            c.wait("!!document.querySelector('#location-form')")
            c.wait("!document.querySelector('[data-action=edit-location-gps]').disabled && document.querySelector('#location-form [name=lat]').value==='28.53'")
            c.js("const address=document.querySelector('#location-form [name=address]');address.value='Updated address, Mayapuri, New Delhi';address.dispatchEvent(new Event('input',{bubbles:true}))")
            assert c.js("document.querySelector('#location-form [name=lat]').value")==''
            c.call('Emulation.setGeolocationOverride',{'latitude':28.628,'longitude':77.123,'accuracy':12})
            c.click('[data-action="edit-location-gps"]')
            c.wait("document.querySelector('#location-form [name=lat]').value==='28.628'")
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            c.wait("document.querySelector('#location-form').innerText.includes('स्थान सुरक्षित करें')")
            c.js("document.querySelector('#location-form').requestSubmit()")
            c.wait("!document.querySelector('#modal').open && state.user.address==='Updated address, Mayapuri, New Delhi'")
            assert c.js('state.recyclers[0].id')==2
            c.click('#language-toggle')
            c.wait("document.documentElement.lang==='en'")
            c.js("(async()=>{let canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;let ctx=canvas.getContext('2d');ctx.fillStyle='#b9b990';ctx.fillRect(0,0,320,240);let blob=await new Promise(r=>canvas.toBlob(r));await loadLotPhoto(new File([blob],'test.png',{type:'image/png'}));})()")
            if '--local-ai' in sys.argv:
                fixture=Path('/tmp/kabad-test-laptop.jpg')
                data_url='data:image/jpeg;base64,'+base64.b64encode(fixture.read_bytes()).decode()
                c.js("(async()=>{let response=await fetch("+json.dumps(data_url)+");let b=await response.blob();await loadLotPhoto(new File([b],'laptop.jpg',{type:'image/jpeg'}));})()")
                assert c.js('state.ai_mode')=='local'
                c.click('#language-toggle')
                c.wait("document.documentElement.lang==='hi'")
                c.click('[data-action="analyze"]')
                for _ in range(180):
                    if not c.js('state.analysisBusy'):break
                    time.sleep(1)
                assert c.js('state.lot && state.lot.source')=='local_ai', c.js('state.analysisStatus')
                assert 'Laptops' in c.js('state.items.map(i=>i.subcategory)'), c.js('state.items')
                c.wait("document.querySelector('[data-key=name]').value==='लैपटॉप'")
                assert c.js('state.items[0].name')=='Laptops'
                c.click('#language-toggle')
                c.wait("document.querySelector('[data-key=name]').value==='Laptops'")
                print('REAL LOCAL AI: Hindi analysis descriptions switched to English:',c.js('state.items'),flush=True)
                c.shot(Path('/tmp/kabad-analysis.png'))
                # An unrelated blank image must not receive invented waste rows.
                c.js("(async()=>{let canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;let ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,320,240);window.blankImage=canvas.toDataURL();})()")
                empty=c.js("LocalAnalysis.analyze(window.blankImage,()=>{})")
                assert empty==[], empty
                print('REAL LOCAL AI: unrelated blank image correctly returned no detections.',flush=True)
            c.js("document.querySelector('[data-action=manual]').click()")
            c.wait("!!document.querySelector('#estimate-editor')")
            c.click('#language-toggle')
            c.wait("document.querySelector('[data-key=name]').value==='लैपटॉप'")
            assert c.js('state.items[0].name')=='Laptops'
            c.click('#language-toggle')
            c.wait("document.querySelector('[data-key=name]').value==='Laptops'")
            c.js("let desc=document.querySelector('[data-key=name]');desc.value='मेरे पुराने लैपटॉप';desc.dispatchEvent(new Event('input',{bubbles:true}))")
            c.click('#language-toggle')
            c.click('#language-toggle')
            assert c.js("document.querySelector('[data-key=name]').value")=='मेरे पुराने लैपटॉप'
            assert c.js('state.items[0].name_key') is None
            c.js("let sub=document.querySelector('[data-key=subcategory]');sub.value='Circuit boards';sub.dispatchEvent(new Event('input',{bubbles:true}))")
            assert c.js('estimateTotal()')==200
            c.js("let sub2=document.querySelector('[data-key=subcategory]');sub2.value='Laptops';sub2.dispatchEvent(new Event('input',{bubbles:true}))")
            assert c.js('estimateTotal()')==180
            c.call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
            assert c.js('document.documentElement.scrollWidth <= innerWidth'), 'Mobile estimate table causes page overflow'
            c.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1080,'deviceScaleFactor':1,'mobile':False})
            c.js("const n=document.querySelector('[data-key=name]');n.value='Old laptops';n.dispatchEvent(new Event('input',{bubbles:true}));const w=document.querySelector('[data-key=kg]');w.value='5';w.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-action=save-estimate]').click()")
            c.wait("!!document.querySelector('#booking-form')")
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            c.wait("document.querySelector('#booking-form').innerText.includes('पिकअप की पुष्टि')")
            assert c.js("document.querySelector('[name=slot]').value")=='09:00–12:00'
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            assert c.js("[...document.querySelector('[name=recycler_id]').options].map(o=>o.value)")==['3'], 'Non-electronics recycler offered for e-waste'
            c.js("document.querySelector('#booking-form').requestSubmit()")
            c.wait("location.hash==='#pickups' && !!document.querySelector('.pickup-card')")
            assert '₹900' in c.js("document.querySelector('.pickup-card').innerText")
            c.js("location.hash='recycler'")
            c.wait("!!document.querySelector('#recycler-login')")
            c.click('#language-toggle')
            c.wait("document.querySelector('#recycler-login').innerText.includes('कार्यक्षेत्र का पासवर्ड')")
            c.js("document.querySelector('[name=password]').value='incorrect';document.querySelector('#recycler-login').requestSubmit()")
            c.wait("document.querySelector('#login-error').innerText.includes('पासवर्ड गलत')")
            c.click('#language-toggle')
            c.js("document.querySelector('[name=recycler_id]').value='3';document.querySelector('[name=password]').value='demo-recycler';document.querySelector('#recycler-login').requestSubmit()")
            c.wait("!!document.querySelector('[data-action=proof]')")
            c.click('#language-toggle')
            c.wait("document.querySelector('#notification-list').innerText.includes('नया पिकअप')")
            c.click('#language-toggle')
            c.js("document.querySelector('[data-action=proof]').click()")
            c.wait("!!document.querySelector('#proof-form')")
            c.js("(async()=>{let cv=document.createElement('canvas');cv.width=320;cv.height=240;cv.getContext('2d').fillRect(0,0,320,240);let b=await new Promise(r=>cv.toBlob(r));let dt=new DataTransfer();dt.items.add(new File([b],'proof.png',{type:'image/png'}));const input=document.querySelector('#proof-file');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()")
            c.wait('state.proofImage!==null')
            c.js("document.querySelector('[data-action=proof-gps]').click()")
            c.wait('state.proofGps!==null')
            c.js("document.querySelector('#proof-form').requestSubmit()")
            c.wait("!!document.querySelector('[data-action=receipt]') && !document.querySelector('#modal').open")
            c.js("document.querySelector('[data-action=receipt]').click()")
            c.wait("document.querySelector('#modal').innerText.includes('Image SHA-256')")
            c.wait("document.querySelector('#modal img').complete && document.querySelector('#modal img').naturalWidth>0")
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            c.wait("document.querySelector('#modal').innerText.includes('तस्वीर का SHA-256')")
            c.js("document.querySelector('#modal [data-action=toggle-language]').click()")
            c.js("document.querySelector('[data-action=close-modal]').click();location.hash='home'")
            c.wait("!!document.querySelector('.hero')")
            c.call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
            c.shot(Path('/tmp/kabad-mobile.png'))
            assert c.js('document.documentElement.scrollWidth <= innerWidth'), 'Mobile page overflows'
            for language in ('en','mr','kn','hi'):
                c.js("(()=>{const selector=document.querySelector('[data-voice-language]');selector.value="+json.dumps(language)+";selector.dispatchEvent(new Event('change',{bubbles:true}));})()")
                suffix=('' if language=='hi' else language+'-')+'sell.wav'
                c.wait("!guideAudio.paused && guideAudio.currentTime>0.1 && guideAudio.currentSrc.endsWith("+json.dumps(suffix)+")")
                assert c.js('localStorage.getItem("ks-voice-language")')==language
                c.js('stopVoice()')
                assert c.js('guideAudio.paused')
            c.js("showProfile()")
            c.wait("!!document.querySelector('[data-action=collector-logout]')")
            c.js("document.querySelector('[data-action=collector-logout]').click()")
            c.wait("state.user===null && !!document.querySelector('.hero') && !document.querySelector('#modal').open")
            assert c.js('state.image===null && state.lot===null && state.items.length===0 && state.pickups.length===0')
            assert c.js("(async()=>{const r=await fetch('/api/bootstrap');const data=await r.json();return data.user===null && !!data.recycler_id;})()"), 'Collector sign-out affected recycler session or did not clear collector cookie'
            c.call('Page.reload')
            c.wait("!!document.querySelector('.hero') && state.user===null")
            c.js("rolePicker();document.querySelector('#role-form').requestSubmit()")
            c.wait("state.demo_role==='user' && !document.querySelector('#modal').open")
            c.js("location.hash='recycler'")
            c.wait("state.page==='home'")
            assert c.js("[...document.querySelectorAll('a[href=\"#recycler\"]')].every(e=>e.hidden)")
            c.js("rolePicker();const role=document.querySelector('#role-form [name=role]');role.value='recycler';role.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#role-form [name=password]').value='demo-recycler';document.querySelector('#role-form [name=recycler_id]').value='3';document.querySelector('#role-form').requestSubmit()")
            c.wait("state.demo_role==='recycler' && state.page==='recycler' && !!document.querySelector('#notification-list')")
            assert c.js("[...document.querySelectorAll('nav a')].every(e=>e.hidden) && document.querySelector('#profile-button').hidden")
            assert c.js("[...document.querySelectorAll('a[href=\\\"#recycler\\\"]')].every(e=>e.hidden)"), 'Redundant recycler workspace link is visible'
            c.click('[data-action="edit-recycler-profile"]')
            c.wait("!!document.querySelector('#recycler-profile-form')")
            c.js("(()=>{const profileForm=document.querySelector('#recycler-profile-form');profileForm.querySelector('[name=address]').value='Updated recycler location';profileForm.querySelector('[name=operating_hours]').value='08:00–16:00, Monday–Friday';profileForm.querySelectorAll('[name=materials]').forEach(input=>input.checked=['E-waste','Copper'].includes(input.value));profileForm.requestSubmit();})()")
            c.wait("state.recyclers.find(r=>r.id===3).address==='Updated recycler location' && !document.querySelector('#modal').open")
            assert c.js("state.recyclers.find(r=>r.id===3).materials")=='Copper,E-waste'
            assert c.js("document.querySelector('#main').innerText.includes('08:00–16:00, Monday–Friday')")
            c.js("location.hash='sell'")
            c.wait("state.page==='recycler'")
            c.call('Page.reload')
            c.wait("state.demo_role==='recycler' && state.page==='recycler'")
            assert c.js('document.documentElement.scrollWidth <= innerWidth'), 'Recycler role overflows mobile layout'
            assert not c.errors, c.errors
            print('PASS: bundled Hindi/English/Marathi/Kannada playback without speech synthesis, collector sign-out, stop/replay, registration steps, e-waste estimate and recycler filtering, booking, proof/receipt, desktop/mobile layout; no JavaScript exceptions.')
            print('Screenshots: /tmp/kabad-desktop.png and /tmp/kabad-mobile.png')
            c.sock.close()
        finally:
            if chrome:
                chrome.terminate();chrome.wait(timeout=15)
            app.terminate();app.wait(timeout=10)
