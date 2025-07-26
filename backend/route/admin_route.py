from flask import Blueprint, jsonify, redirect, request, g
import db
import config
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from datetime import date, time, datetime, timedelta
import traceback
import psycopg2
from functools import wraps
admin_bp = Blueprint('admin', __name__)

JWT_SECRET_KEY = config.jwt_secret_key
JWT_REFRESH_KEY = config.jwt_refresh_key

@admin_bp.route("/movies")
def fetch_movies():
    con, cur = db.db_connect()
    query = "select * from movies order by id;"
    cur.execute(query)
    rows = cur.fetchall()

    movies = []
    for row in rows:
        movie = dict(row)
        movie['releasedate'] = movie['releasedate'].isoformat()
        movie['runtime'] = int(movie['runtime'].total_seconds() // 60)
        movies.append(movie)
    return jsonify(movies)

@admin_bp.route("/theaters")
def fetch_theaters():
    con, cur = db.db_connect()
    query = "select * from theaters order by id;"
    cur.execute(query)
    rows = cur.fetchall()

    theaters = []
    for row in rows:
        theater = dict(row)
        theaters.append(theater)
    return jsonify(theaters)

@admin_bp.route("/screens", methods=['GET'])
def fetch_screens():

    try:
        con, cur = db.db_connect()
        query = "SELECT * FROM screens order by theater_id;"
        cur.execute(query)
        rows = cur.fetchall()
        screens = [dict(row) for row in rows]
        return jsonify(screens)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/shows")
def fetch_shows():
    try:
        con, cur = db.db_connect()
        query = "SELECT * FROM shows order by theater_id, screen_id, movie_id, show_id;"
        cur.execute(query)
        rows = cur.fetchall()
        def serialize(row):
            result = dict(row)
            for key, value in result.items():
                if isinstance(value, (datetime, date, time)):
                    result[key] = str(value)
                elif isinstance(value, timedelta):
                    total_seconds = int(value.total_seconds())
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    result[key] = f"{hours:02}:{minutes:02}"
            return result
        shows = [serialize(row) for row in rows]
        return jsonify(shows)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    

@admin_bp.route("/screensoftheater", methods=['GET'])
def get_screens():
    theater_id = request.args.get('theater_id')
    if not theater_id:
        return jsonify({"error": "theater_id parameter is required"}), 400
    
    try:
        con, cur = db.db_connect()
        query = "SELECT * FROM screens WHERE theater_id = %s;"
        cur.execute(query, (theater_id,))
        rows = cur.fetchall()
        screens = [dict(row) for row in rows]
        return jsonify(screens)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def admin_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Access token missing"}), 401
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            g.payload = payload
            if not payload.get("is_admin", False):
                return jsonify({"error": "Admin access required"}), 403
        except ExpiredSignatureError:
            return jsonify({"error": "Access token expired"}), 401
        except InvalidTokenError:
            return jsonify({"error": "Invalid access token"}), 401

        return function(*args, **kwargs)
    return wrapper

@admin_bp.route("/todaybookings")
@admin_required
def today_bookings():
    con, cur = db.db_connect()
    query = "select * from bookings order by booking_id;"
    cur.execute(query)
    rows = cur.fetchall()

    books = []
    for row in rows:
        book = dict(row)
        book['show_date'] = book['show_date'].isoformat()
        book['show_time'] = str(book['show_time'])
        book['book_date'] = book['book_date'].isoformat()
        books.append(book)
    return jsonify(books)

@admin_bp.route("/allbookings")
@admin_required
def all_bookings():
    con, cur = db.db_connect()
    query = "select * from all_bookings order by booking_id;"
    cur.execute(query)
    rows = cur.fetchall()

    books = []
    for row in rows:
        book = dict(row)
        book['show_date'] = book['show_date'].isoformat()
        book['show_time'] = str(book['show_time'])
        book['book_date'] = book['book_date'].isoformat()
        books.append(book)
    return jsonify(books)
    
@admin_bp.route("/add-movies", methods=['POST'])
@admin_required
def add_movies():
    data = request.get_json()
    name = data.get('name')
    releasedate = data.get('releasedate')
    runtime = data.get('runtime')
    genre = data.get('genre')
    description = data.get('description')
    ratings = data.get('ratings')
    image = data.get('image')
    certificate = data.get('certificate')

    con, cur = db.db_connect()
    query = """
        INSERT INTO movies (name, releasedate, runtime, genre, description, ratings, image, certificate)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    cur.execute(query, (name, releasedate, runtime, genre, description, ratings, image, certificate))
    mid = cur.fetchone()['id']
    con.commit()

    return jsonify({"movie_id": mid}), 200


@admin_bp.route("/add-theaters", methods=['POST'])
@admin_required
def add_theater():
    data = request.get_json()
    con, cur = db.db_connect()

    name = data.get('name')
    location = data.get('location')
    parking = data.get('parking')
    accessibility = data.get('accessibility')
    image = data.get('image')
    hours = data.get('hours')
    screens = data.get('screens')

    # Insert theater and get ID
    query = """
        INSERT INTO theaters (name, location, parking, accessibility, image, hours) 
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
    """
    cur.execute(query, (name, location, parking, accessibility, image, hours))
    tid = cur.fetchone()['id']
    con.commit()

    # Insert screens
    for idx, screen in enumerate(screens, start=1):
        screen_name = screen['screen_name']
        elite_seats = screen['elite_seats']
        premium_seats = screen['premium_seats']
        elite_price = screen['elite_price']
        premium_price = screen['premium_price']
        query = """
            INSERT INTO screens (theater_id, screen_id, screen_name, elite_seats, premium_seats, elite_price, premium_price) 
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """
        cur.execute(query, (tid, idx, screen_name, elite_seats, premium_seats, elite_price, premium_price))
        con.commit()

    return jsonify({"theater_id": tid}), 200

@admin_bp.route("/add-shows", methods=['POST'])
@admin_required
def add_shows():
    data = request.get_json()
    con, cur = db.db_connect()

    tid = data.get('theater_id')
    mid = data.get('movie_id')
    sid = data.get('screen_id')
    sd = data.get('show_date')
    st = data.get('show_time')

    try:
        query = """
            INSERT INTO shows (theater_id, movie_id, screen_id, show_date, show_time)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING show_id;
        """
        cur.execute(query, (tid, mid, sid, sd, st))
        shid = cur.fetchone()['show_id']
        con.commit()
        return jsonify({"show_id": shid}), 200

    except psycopg2.Error as e:
        con.rollback()
        error_msg = str(e).split('\n')[0]
        return jsonify({"error": error_msg}), 400


@admin_bp.route('delete_movies', methods=['DELETE'])
@admin_required
def delete_movies():
    mid = request.args.get('mid')
    con, cur = db.db_connect()
    try:
        query =  "delete from movies where id = %s;"
        cur.execute(query, (mid, ))
        con.commit()
        return jsonify({"msg": "DELETED"}), 200
    except psycopg2.Error as e:
        con.rollback()
        error = str(e).split('\n')[0]
        return jsonify({"error": error}), 400
    
@admin_bp.route('delete_theaters', methods=['DELETE'])
@admin_required
def delete_theaters():
    tid = request.args.get('tid')
    con, cur = db.db_connect()
    try:
        query =  "delete from theaters where id = %s;"
        cur.execute(query, (tid, ))
        con.commit()
        return jsonify({"msg": "DELETED"}), 200
    except psycopg2.Error as e:
        con.rollback()
        error = str(e).split('\n')[0]
        return jsonify({"error": error}), 400
    
@admin_bp.route('delete_screens', methods=['DELETE'])
@admin_required
def delete_screens():
    tid = request.args.get('tid')
    sid = request.args.get('sid')
    con, cur = db.db_connect()
    try:
        query =  "delete from screens where theater_id = %s and screen_id=%s;"
        cur.execute(query, (tid, sid, ))
        con.commit()
        return jsonify({"msg": "DELETED"}), 200
    except psycopg2.Error as e:
        con.rollback()
        error = str(e).split('\n')[0]
        return jsonify({"error": error}), 400
    
@admin_bp.route('delete_shows', methods=['DELETE'])
@admin_required
def delete_shows():
    sid = request.args.get('sid')
    print(sid)
    con, cur = db.db_connect()
    try:
        query =  "delete from shows where show_id = %s;"
        cur.execute(query, (sid, ))
        con.commit()
        return jsonify({"msg": "DELETED"}), 200
    except psycopg2.Error as e:
        con.rollback()
        error = str(e).split('\n')[0]
        return jsonify({"error": error}), 400
