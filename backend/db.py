import psycopg2 as dbm
from psycopg2.extras import RealDictCursor
import config

con = None
cur = None

def db_connect():
    con = dbm.connect(
        user = config.user,
        password = config.password,
        host = config.host,
        port = config.port,
        dbname = config.dbname,
    )
    cur = con.cursor(cursor_factory = RealDictCursor)

    return con, cur

def db_close():
    con.close()
    cur.close()