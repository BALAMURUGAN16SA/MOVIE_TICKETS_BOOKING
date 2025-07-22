import psycopg2 as dbm
from psycopg2.extras import RealDictCursor
import os
import config

def db_connect():
    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        con = dbm.connect(database_url, cursor_factory=RealDictCursor)
    else:
        con = dbm.connect(
            user = config.user,
            password = config.password,
            host = config.host,
            port = config.port,
            dbname = config.dbname,
            cursor_factory=RealDictCursor
        )
    
    cur = con.cursor()
    return con, cur

def db_close(con, cur):
    cur.close()
    con.close()
