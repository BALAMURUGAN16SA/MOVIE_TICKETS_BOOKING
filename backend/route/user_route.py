from flask import Blueprint, jsonify, redirect, request, g
import db
import config
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from datetime import date, time, datetime, timedelta
import traceback
user_bp = Blueprint('user', __name__)

JWT_SECRET_KEY = config.jwt_secret_key
JWT_REFRESH_KEY = config.jwt_refresh_key

@user_bp.route("/register", methods=['POST'])
def handle_register():
    con, cur = db.db_connect()
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    location = data.get("location")

    try:
        query = "INSERT INTO users (email, password, location) VALUES (%s, %s, %s)"
        cur.execute(query, (email, password, location))
        con.commit()
        return jsonify({"message": "User registered successfully!"}), 201
    except Exception as e:
        return jsonify({"error": "Registration failed", "details": str(e)}), 400

def token_required(function):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error" : "Access token missing"}), 401
        
        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            g.payload = payload
        except ExpiredSignatureError:
            return jsonify({"error": "Access token expired"}), 401
        except InvalidTokenError:
            return jsonify({"error": "Access invalid token"}), 401
        
        return function(*args, **kwargs)
    wrapper.__name__ = function.__name__
    return wrapper

@user_bp.route("/profile")
@token_required
def handle_profile():
    con, cur = db.db_connect() 
    email = g.payload['sub']
    query = 'select * from users where email = %s;'
    cur.execute(query, (email, ))
    row = cur.fetchone()
    safe_user_data = {
        "id": row["id"],
        "email": row["email"],
        "location": row["location"]
    }
    return jsonify(safe_user_data), 200

@user_bp.route("/history")
@token_required
def handle_history():
    con, cur = db.db_connect()
    email = g.payload["sub"]
    query = "SELECT ab.booking_id, ab.show_id, ab.theater_id, ab.movie_id, ab.screen_id, ab.show_date, ab.show_time, ab.total_seats, ab.email, ab.total_price, ab.book_date, ab.status, abs.id AS booked_seat_id, abs.booking_id, abs.seat_id, abs.price AS seat_price, m.id AS movie_id, m.name AS movie_name, m.releasedate, m.runtime, m.genre, m.description AS movie_description, m.ratings AS movie_rating, m.image AS movie_image, m.certificate, t.id AS theater_id, t.name AS theater_name, t.location, t.parking, t.accessibility, t.image AS theater_image, t.hours FROM all_bookings ab JOIN all_booked_seats abs ON ab.booking_id = abs.booking_id JOIN movies m ON ab.movie_id = m.id JOIN theaters t ON ab.theater_id = t.id WHERE ab.email = %s order by ab.booking_id desc;"
    cur.execute(query, (email, ))
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

    history = [serialize(row) for row in rows]
    return jsonify(history)

@user_bp.route("/cancel_bookings")
@token_required
def cancel_bookings():
    con, cur = db.db_connect()
    booking_id = request.args.get('booking_id')
    query = 'select * from booked_seats where booking_id = %s;'
    cur.execute(query, (booking_id,))
    rows = cur.fetchall()
    for row in rows:
        query = 'update seat_instances set is_booked=%s where seat_id = %s;'
        cur.execute(query, (False, row['seat_id'], ))
        con.commit()
    query = 'update all_bookings set status=%s where booking_id=%s;'
    cur.execute(query, ('cancelled', booking_id, ))
    con.commit()
    return jsonify({"msg" : "success"}), 200

@user_bp.route("/refresh")
def refresh_token():
    print('Vantapla')
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith('Bearer'):
        return jsonify({"error": "Refresh token Missing"}), 401
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_REFRESH_KEY, algorithms=['HS256'])
        email = payload['sub']
        is_admin = payload.get('is_admin', False)
        access_token = jwt.encode({"sub" : email, "is_admin": is_admin, "exp": datetime.utcnow() + timedelta(minutes=10)}, JWT_SECRET_KEY, algorithm = 'HS256')
        return jsonify({"access_token" : access_token}), 200
    except ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired"}), 401
    except InvalidTokenError:
        return jsonify({"error": "Refresh invalid token"}), 401
    
@user_bp.route("/theaters_showing_selected_movie")
def fetch_theaters():

    movie_id = request.args.get("movie_id")

    if not movie_id:
        return jsonify({"error": "movie_id is required"}), 400

    con, cur = db.db_connect()
    query = """
        SELECT DISTINCT ON (t.id, s.screen_id) * 
        FROM theaters t 
        JOIN shows s ON t.id = s.theater_id 
        WHERE s.movie_id = %s 
        ORDER BY t.id;
    """
    cur.execute(query, (movie_id,))
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

    theaters = [serialize(row) for row in rows]
    return jsonify(theaters)

@user_bp.route("/movies_shown_by_selected_theater")
def fetch_movies():
    theater_id = request.args.get("theater_id")

    if not theater_id:
        return jsonify({"error": "theater_id is required"}), 400

    con, cur = db.db_connect()

    query = """
        SELECT DISTINCT ON (s.movie_id, s.screen_id) 
            m.image, m.id, m.name, m.genre, m.ratings, m.certificate, 
            m.runtime, m.releasedate, 
            s.screen_id, s.show_time, s.show_date
        FROM theaters t 
        JOIN shows s ON t.id = s.theater_id 
        JOIN movies m ON m.id = s.movie_id
        WHERE s.theater_id = %s
        ORDER BY s.movie_id, s.screen_id;
    """
    cur.execute(query, (theater_id,))
    rows = cur.fetchall()

    def serialize(row):
        result = dict(row)
        for key, value in result.items():
            if isinstance(value, (datetime, date, time)):
                result[key] = str(value)
            elif isinstance(value, timedelta):
                # Convert to total minutes or HH:MM:SS string
                total_seconds = int(value.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                result[key] = f"{hours:02}:{minutes:02}"
        return result


    movies = [serialize(row) for row in rows]
    return jsonify(movies)

@user_bp.route("/screens")
def screens():
    theater_id = request.args.get("theater_id")
    movie_id = request.args.get("movie_id")
    screen_id = request.args.get("screen_id")
    show_date = request.args.get("show_date")
    show_time = request.args.get("show_time")
    con, cur = db.db_connect()
    query = """select * from shows  join screens s on shows.screen_id = s.screen_id and shows.theater_id = s.theater_id
             where shows.theater_id = %s and shows.movie_id = %s and shows.screen_id = %s and shows.show_date = %s and shows.show_time = %s;"""
    cur.execute(query, (theater_id, movie_id, screen_id, show_date, show_time))
    rows = cur.fetchall()
    show_id = rows[0]['show_id']
    query = """select * from seat_instances where show_id = %s order by(seat_id)"""
    cur.execute(query, (show_id, ))
    rows = cur.fetchall()
    def serialize(row):
        result = dict(row)
        for key, value in result.items():
            if isinstance(value, (datetime, date, time)):
                result[key] = str(value)
            elif isinstance(value, timedelta):
                # Convert to total minutes or HH:MM:SS string
                total_seconds = int(value.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                result[key] = f"{hours:02}:{minutes:02}"
        return result
    screens = [serialize(row) for row in rows]
    return jsonify(screens)

@user_bp.route("/book", methods=["POST"])
@token_required
def book():
    con, cur = db.db_connect()
    email = g.payload['sub']
    show_id = ''
    try:
        seats = request.json.get("selected_seats")
        total_price = request.json.get("total_price")
        show_id = seats[0]['showId']

        cur.execute("""SELECT * FROM shows where show_id = %s""", (show_id, ))
        show = cur.fetchone()
        cur.execute("""
            INSERT INTO bookings (show_id, theater_id, movie_id, screen_id, show_date, show_time, total_seats, email, total_price, book_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING booking_id;
        """, (show['show_id'], show['theater_id'], show['movie_id'], show['screen_id'], show['show_date'], show['show_time'], len(seats), email, total_price, date.today()))
        booking_id = cur.fetchone()['booking_id']

        for seat in seats:
            cur.execute("""
                SELECT is_booked FROM seat_instances
                WHERE seat_id = %s FOR UPDATE;
            """, (seat['seatId'],))
            is_booked = cur.fetchone()
            if is_booked['is_booked']:
                return jsonify({"status": "error", "message": f"Seat {seat['seatNumber']} already booked"}), 409

            cur.execute("""
                UPDATE seat_instances
                SET is_booked = TRUE
                WHERE seat_id = %s;
            """, (seat['seatId'],))

            cur.execute("SELECT * FROM seat_instances where seat_id=%s", (str(seat['seatId']), ))
            seat_price = cur.fetchone()['price']
            cur.execute("""
                        INSERT INTO booked_seats (booking_id, seat_id, price) VALUES (%s, %s, %s)
                        """, (booking_id, seat['seatId'], seat_price))
        con.commit()
    
        return jsonify({"booking_id": booking_id, "status": "success", "message": "Seats booked"}), 200

    except Exception as e:
        con.rollback()
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
