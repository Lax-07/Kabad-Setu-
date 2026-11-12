"""Optional real PostgreSQL check. Use a dedicated KABAD_TEST_POSTGRES_URL."""
import os
import secrets
import sqlite3
import unittest
from unittest.mock import patch

import server


@unittest.skipUnless(os.environ.get('KABAD_TEST_POSTGRES_URL'), 'No dedicated PostgreSQL test URL configured')
class PostgresStorage(unittest.TestCase):
    def test_ids_binary_evidence_and_transaction_rollback(self):
        class Rollback(Exception):
            pass
        phone = secrets.token_hex(12)
        with patch.dict(os.environ, {'DATABASE_URL': os.environ['KABAD_TEST_POSTGRES_URL'], 'VERCEL':''}):
            server.init_db()
            server.init_db()  # Repeated cold starts preserve an existing schema.
            with self.assertRaises(Rollback):
                with server.db() as c:
                    uid = c.execute('INSERT INTO collectors(name,phone,id_type,id_last4,address,created_at) VALUES(?,?,?,?,?,?)', ('Test', phone, 'Voter ID', '4567', 'Test address', server.now())).lastrowid
                    lot = c.execute('INSERT INTO lots(collector_id,image,mime,items,source,created_at) VALUES(?,?,?,?,?,?)', (uid, b'photo-bytes', 'image/png', '[]', 'manual', server.now())).lastrowid
                    pid = c.execute('INSERT INTO pickups(lot_id,collector_id,recycler_id,pickup_date,slot,total,created_at,pickup_address) VALUES(?,?,?,?,?,?,?,?)', (lot, uid, 1, '2026-12-01', '09:00–12:00', 12.5, server.now(), 'Test address')).lastrowid
                    c.execute('INSERT INTO notifications(recycler_id,pickup_id,message,created_at) VALUES(?,?,?,?)', (1,pid,'Test',server.now()))
                    c.execute('INSERT INTO evidence.proofs(pickup_id,recycler_id,image,mime,sha256,recorded_at,captured_at,lat,lng,accuracy) VALUES(?,?,?,?,?,?,?,?,?,?)', (pid,1,b'proof','image/png','a'*64,server.now(),server.now(),28.5,77.2,10))
                    row = c.execute('SELECT p.total,e.image FROM pickups p JOIN evidence.proofs e ON e.pickup_id=p.id WHERE p.id=?', (pid,)).fetchone()
                    self.assertEqual(row['image'], b'proof')
                    self.assertEqual(row['total'], 12.5)
                    raise Rollback()
            with server.db() as c:
                self.assertIsNone(c.execute('SELECT id FROM collectors WHERE phone=?', (phone,)).fetchone())
            # A uniqueness failure must roll the whole transaction back.
            with self.assertRaises(sqlite3.IntegrityError):
                with server.db() as c:
                    args = ('Test', phone, 'Voter ID', '4567', 'Test', server.now())
                    sql = 'INSERT INTO collectors(name,phone,id_type,id_last4,address,created_at) VALUES(?,?,?,?,?,?)'
                    c.execute(sql, args)
                    c.execute(sql, args)
            with server.db() as c:
                self.assertIsNone(c.execute('SELECT id FROM collectors WHERE phone=?', (phone,)).fetchone())
