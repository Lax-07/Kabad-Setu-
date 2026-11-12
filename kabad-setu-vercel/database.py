"""PostgreSQL storage for hosted deployments; local SQLite remains in server.py."""
import os
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def database_url():
    return os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')


class PostgresConnection:
    """Adapt the app's fixed qmark queries and generated IDs to psycopg."""
    def __init__(self, connection):
        self.connection = connection

    def execute(self, sql, params=()):
        import psycopg
        # Queries are application-owned constants; values always stay bound parameters.
        sql = sql.replace('?', '%s')
        generated_id = re.match(r'INSERT INTO (collectors|lots|pickups)\(', sql, re.I)
        if generated_id:
            sql += ' RETURNING id'
        try:
            cursor = self.connection.execute(sql, params)
        except psycopg.IntegrityError as exc:
            raise sqlite3.IntegrityError('Database constraint violation') from exc
        if generated_id:
            return InsertResult(cursor.fetchone()['id'])
        return cursor

    def commit(self):
        self.connection.commit()


class InsertResult:
    def __init__(self, ident):
        self.lastrowid = ident


@contextmanager
def postgres_db():
    import psycopg
    from psycopg.rows import dict_row
    # Open one connection per request. Use your provider's pooled URL on Vercel.
    with psycopg.connect(database_url(), row_factory=dict_row, connect_timeout=10,
                         prepare_threshold=None) as connection:
        connection.execute("SET LOCAL search_path = public")
        connection.execute("SET LOCAL statement_timeout = '20000ms'")
        yield PostgresConnection(connection)


def init_postgres(recyclers):
    import psycopg
    with psycopg.connect(database_url(), connect_timeout=10, prepare_threshold=None) as connection:
        connection.execute("SET LOCAL search_path = public")
        # Concurrent cold starts must not race CREATE TABLE / schema migrations.
        connection.execute("SET LOCAL lock_timeout = '20000ms'")
        connection.execute('SELECT pg_advisory_xact_lock(712408331)')
        sql = (Path(__file__).resolve().parent / 'migrations' / '001_postgres.sql').read_text()
        for statement in sql.split(';'):
            if statement.strip():
                connection.execute(statement)
        with connection.cursor() as cursor:
            cursor.executemany('INSERT INTO recyclers(id,name,address,lat,lng,materials,initials) VALUES(%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING', recyclers)
