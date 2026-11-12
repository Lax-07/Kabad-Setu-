"""Deployment boundary checks without cloud credentials."""
import base64
import io
import json
import os
import tempfile
import time
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch

import server
from api import handler as entry


class Deployment(unittest.TestCase):
    def test_vercel_never_falls_back_to_sqlite(self):
        with tempfile.TemporaryDirectory() as folder:
            location = Path(folder) / 'must-not-exist'
            with patch.dict(os.environ, {'VERCEL':'1', 'DATABASE_URL':'', 'POSTGRES_URL':''}), patch.object(server, 'DATA', location):
                with self.assertRaises(RuntimeError):
                    server.init_db()
                with self.assertRaises(RuntimeError):
                    with server.db():
                        pass
                self.assertFalse(location.exists())

    def test_https_origin_and_secure_session_cookie(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(server, 'DATA', Path(folder)), patch.dict(os.environ, {'VERCEL':'', 'DATABASE_URL':'', 'POSTGRES_URL':''}):
            server.init_db()
            # Exercise the real HTTP methods without TLS/socket infrastructure.
            request = object.__new__(server.Handler)
            request.headers = Message()
            request.headers['Host'] = 'kabad.example'
            request.headers['Content-Type'] = 'application/json'
            verification_token = 'deployment-test-token'
            body = json.dumps({'name':'Hosted Collector','phone':'9876543210','verification_token':verification_token,'address':'Delhi','consent':True}).encode()
            request.headers['Content-Length'] = str(len(body))
            request.path = '/api/register'
            request.wfile = io.BytesIO()
            statuses, headers = [], {}
            request.send_response = statuses.append
            request.send_header = lambda key, value: headers.update({key:value})
            request.end_headers = lambda: None
            # Enter the SQLite context before setting VERCEL; preserve its connection.
            with server.db() as connection, patch.object(server, 'db') as db_mock:
                connection.execute('INSERT INTO phone_verifications(token_hash,phone,expires) VALUES(?,?,?)',
                                   (server.hashlib.sha256(verification_token.encode()).hexdigest(), '9876543210', time.time()+600))
                connection.commit()
                db_mock.return_value.__enter__.return_value = connection
                with patch.dict(os.environ, {'VERCEL':'1'}):
                    request.headers['Origin'] = 'http://kabad.example'
                    request.rfile = io.BytesIO(body)
                    request.do_POST()
                    self.assertEqual(statuses[-1], 403)
                    request.headers.replace_header('Origin', 'https://kabad.example')
                    request.rfile = io.BytesIO(body)
                    request.do_POST()
                    self.assertEqual(statuses[-1], 201)
                    self.assertIn('; Secure', headers['Set-Cookie'])
                    self.assertIn('HttpOnly', headers['Set-Cookie'])

    def test_rewrite_preserves_query_and_photo_route(self):
        request = object.__new__(entry.handler)
        request.path = '/api/handler?_route=pickups&role=recycler'
        request.route()
        self.assertEqual(request.path, '/api/pickups?role=recycler')
        request.path = '/api/handler?_route=photos%2Fproof%2F12'
        request.route()
        self.assertEqual(request.path, '/api/photos/proof/12')

    def test_api_upload_limit_leaves_room_for_base64(self):
        image = b'\x89PNG\r\n\x1a\n' + b'x' * (3*1024*1024)
        with self.assertRaises(server.APIError):
            server.photo({'image':'data:image/png;base64,'+base64.b64encode(image).decode()})

    def test_missing_configuration_is_retryable(self):
        request = object.__new__(entry.handler)
        responses = []
        request.respond = lambda data, status: responses.append((data, status))
        with patch.object(entry, '_ready', False), patch.object(entry, 'init_db', side_effect=RuntimeError('private credential')):
            self.assertFalse(request.ready())
            self.assertFalse(entry._ready)
        self.assertEqual(responses[0][1], 503)
        self.assertNotIn('private credential', str(responses))
