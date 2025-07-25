from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
import db
import os
import jwt
import datetime
import config
from route.user_route import user_bp
from route.admin_route import admin_bp

app = Flask(__name__)
app.register_blueprint(user_bp, url_prefix = '/user')
app.register_blueprint(admin_bp, url_prefix = '/admin')

CORS(app, origins=["http://localhost:3000", "https://movie-tickets-booking-balamurugan16sas-projects.vercel.app"], supports_credentials=True)

JWT_SECRET_KEY = config.jwt_secret_key
JWT_REFRESH_KEY = config.jwt_refresh_key

@app.route('/ping')
def ping():
    try:
        con, cur = db.db_connect()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        return {"status": "Render alive", "db_alive": bool(result)}, 200
    except Exception as e:
        return {"status": "Render alive", "db_alive": False, "error": str(e)}, 500
    finally:
        try:
            cur.close()
            con.close()
        except:
            pass

@app.route("/")
def fetch_movies():
    con, cur = db.db_connect()
    query = "select * from movies;"
    cur.execute(query)
    rows = cur.fetchall()

    movies = []
    for row in rows:
        movie = dict(row)
        movie['releasedate'] = movie['releasedate'].isoformat()
        movie['runtime'] = int(movie['runtime'].total_seconds() // 60)
        movies.append(movie)
    
    return jsonify(movies)

@app.route("/theaters")
def fetch_theaters():
    con, cur = db.db_connect()
    query = "select * from theaters;"
    cur.execute(query)
    rows = cur.fetchall()

    movies = []
    for row in rows:
        movie = dict(row)
        movies.append(movie)
    return jsonify(movies)

def create_access_token(email, admin):
    access_token = jwt.encode({"sub" : email, "is_admin" : admin, "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=10)}, JWT_SECRET_KEY, algorithm = 'HS256')
    return access_token

def create_refresh_token(email, admin):
    refresh_token = jwt.encode({"sub" : email, "is_admin" : admin, "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=10080)}, JWT_REFRESH_KEY, algorithm = 'HS256')
    return refresh_token

@app.route("/login", methods=['POST'])
def handle_login():
    con, cur = db.db_connect()
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password are required"}), 400

    email = data.get("email")
    password = data.get("password")
    
    try:
        query = "SELECT * FROM users WHERE email = %s;"
        cur.execute(query, (email,))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        stored_hash = user['password']

        if password != stored_hash:
            return jsonify({"error": "Invalid email or password"}), 401
        
        is_admin = user['is_admin']
        access_token = create_access_token(email, is_admin)
        refresh_token = create_refresh_token(email, is_admin)
        return jsonify({
            "message": "Login successful",
            "email": user['email'], 
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": "Login failed",
            "details": "Internal server error"
        }), 500
    finally:
        if con:
            con.close()


@app.route("/logout", methods=['POST'])
def handle_logout():
    return jsonify({'message': 'Logout successful!'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
