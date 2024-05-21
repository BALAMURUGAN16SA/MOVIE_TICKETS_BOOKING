from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import mysql.connector
import mysql.connector
from geopy.distance import geodesic
from flask import Flask, render_template
from datetime import timedelta
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'yedhukku'
app.permanent_session_lifetime = timedelta(days=1)

def zip_lists(list1, list2):
    return zip(list1, list2)
app.jinja_env.filters['zip_lists'] = zip_lists

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'MOVIE'
}

# Function to connect to the database
def connect_to_database():
    return mysql.connector.connect(**db_config)

@app.route('/')
def login():
    return render_template('LOGIN.html')

@app.route('/register', methods=['POST'])
def register():
    # Retrieve form data
    name = request.form['name']
    email = request.form['email']
    password = request.form['password']
    salt = request.form['salt']
    phone = request.form['phone']
    gender = request.form['gender']
    age = request.form['age']
    city = request.form['city']
    # Connect to the database
    conn = connect_to_database()
    cursor = conn.cursor()
    insert_query = "INSERT INTO users (name, email, password, salt, phone, gender, age, city, role) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    cursor.execute(insert_query, (name, email, password, salt, phone, gender, age, city, 'USER'))
    conn.commit()
    cursor.close()
    conn.close()
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s;", (email,))
    detail = cursor.fetchall()
    return render_template('LOGIN.html')
    
@app.route('/email_check', methods=['POST'])
def email_check():
    try:
        conn = connect_to_database()
        cursor = conn.cursor()
        select_query = "SELECT email FROM USERS;"
        cursor.execute(select_query)
        registered_emails = [email[0] for email in cursor.fetchall()]
        return jsonify(registered_emails)
    except Exception as e:
        return str(e), 500  # Return the error message with status code 500

@app.route('/authenticate', methods=['POST'])
def authenticate():
    user_email = request.form.get('email')  # Retrieve email from form data
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT salt FROM users WHERE email = %s;", (user_email,))
    salt = cursor.fetchone()  # Fetch single row
    conn.close()
    if salt:
        return salt[0]  # Return salt as response
    else:
        return 'User not found', 404  # Return error message with status code 404

@app.route('/H')
def H():
    return render_template('H.html', name=session.get('name'), email=session.get('email'), phone=session.get('phone'), location=session.get('location'))

@app.route('/check', methods=['POST'])
def check():
    hpe = request.form.get('passwordl')
    user_email = request.form.get('emaill')  # Retrieve email from form data
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM users WHERE email = %s;", (user_email,))
    hps = cursor.fetchone()    
    cursor.execute("SELECT role FROM users WHERE email = %s;", (user_email,))
    role = cursor.fetchone()
    role = role[0]
    conn.close()
    h = (hpe, hps)

    if(hpe == hps[0]):
        conn = connect_to_database()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM users WHERE email = %s;", (user_email,))
        name = cursor.fetchone()
        cursor.execute("SELECT email FROM users WHERE email = %s;", (user_email,))
        email = cursor.fetchone()
        cursor.execute("SELECT phone FROM users WHERE email = %s;", (user_email,))
        phone = cursor.fetchone()
        cursor.execute("SELECT city FROM users WHERE email = %s;", (user_email,))
        city = cursor.fetchone()
        session['name'] = name[0]
        session['email'] = email[0]
        session['phone'] = phone[0]
        session['location'] = city[0]
        conn.close()

        name=session.get('name')
        email=session.get('email')
        phone=session.get('phone')
        location=session.get('location')
        detail = (name, email, phone, location)
        if (role == 'USER'):
            return render_template('HOME.html', details = detail)
        else:
            conn = connect_to_database()
            cursor = conn.cursor()
            cursor.execute("SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.RDATE FROM MOVIES;")
            movie_detail = cursor.fetchall()
            cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS;")
            theater_detail = cursor.fetchall()
            return render_template('ADMIN.html', details = detail, movie_details = movie_detail, theater_details = theater_detail)
    else:
        return render_template("LOGIN.html", error = "Invalid Email or Password!")
   
@app.route('/home')
def home():
    name=session.get('name')
    email=session.get('email')
    phone=session.get('phone')
    location=session.get('location')
    detail = (name, email, phone, location)
    return render_template('HOME.html', details = detail)

@app.route('/get_movies')
def get_movies():
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM movies;")
    columns = [col[0] for col in cursor.description]
    movies = []
    for row in cursor.fetchall():
        movie_details = {
            'id' : row[0],
            'title': row[1],
            'genre': row[2],
            'rating': row[3],
            'description': row[4],
            'image': row[5],
            'runtime': row[6],
            'rdate' : row[7],
        }
        movies.append(movie_details)
    return jsonify(movies=movies)

@app.route('/avail_theater/<int:movie_id>', methods=['GET'])
def avail_theater(movie_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    location = session.get('location')
    session['selected_movie'] = movie_id
    sm = session.get('selected_movie')
    theaters_from_database = []
    sql_select_Query =  """
    SELECT DISTINCT t.theater_id, t.theater_name, t.location
    FROM THEATERS t
    JOIN TM tm ON t.theater_id = tm.theater_id
    WHERE tm.movie_id = %s
    """
    cursor.execute(sql_select_Query, (movie_id, ))
    records = cursor.fetchall()

    for record in records:
        theater_id = record[0]
        theater_name = record[1]
        theater_loc = record[2]
        dic = {"id" : theater_id, "name": theater_name, "location": theater_loc}
        theaters_from_database.append(dic)
        
    theaters = [
        {"location": "ANNA NAGAR", "latitude": 13.0878, "longitude": 80.2174},
        {"location": "T. NAGAR", "latitude": 13.0394, "longitude": 80.2337},
        {"location": "ADYAR", "latitude": 13.0064, "longitude": 80.2575},
        {"location": "MYLAPORE", "latitude": 13.0316, "longitude": 80.2670},
        {"location": "NUNGAMBAKKAM", "latitude": 13.0620, "longitude": 80.2405},
        {"location": "ALWARPET", "latitude": 13.0334, "longitude": 80.2546},
        {"location": "EGMORE", "latitude": 13.0827, "longitude": 80.2707},
        {"location": "KILPAUK", "latitude": 13.0827, "longitude": 80.2437},
        {"location": "SAIDAPET", "latitude": 13.0203, "longitude": 80.2224},
        {"location": "VELACHERY", "latitude": 12.9802, "longitude": 80.2228},
        {"location": "GUINDY", "latitude": 13.0067, "longitude": 80.2206},
        {"location": "THIRUVANMIYUR", "latitude": 12.9869, "longitude": 80.2615},
        {"location": "PORUR", "latitude": 13.0324, "longitude": 80.1679},
        {"location": "MOGAPPAIR", "latitude": 13.0832, "longitude": 80.1674},
        {"location": "ANNA SALAI", "latitude": 13.0572, "longitude": 80.2668},
        {"location": "MAMBALAM", "latitude": 13.0355, "longitude": 80.2274},
        {"location": "KODAMBAKKAM", "latitude": 13.0512, "longitude": 80.2206},
        {"location": "MOUNT ROAD", "latitude": 13.0626, "longitude": 80.2696},
        {"location": "PALLIKARANAI", "latitude": 12.9329, "longitude": 80.2135},
        {"location": "ASHOK NAGAR", "latitude": 13.0402, "longitude": 80.2123},
        {"location": "CHROMPET", "latitude": 12.9517, "longitude": 80.1401},
        {"location": "AMBATTUR", "latitude": 13.1075, "longitude": 80.1648},
        {"location": "TAMBARAM", "latitude": 12.9246, "longitude": 80.1479},
        {"location": "VADAPALANI", "latitude": 13.0501, "longitude": 80.2120},
        {"location": "ROYAPETTAH", "latitude": 13.0581, "longitude": 80.2641},
        {"location": "SHOLINGANALLUR", "latitude": 12.8990, "longitude": 80.2279},
        {"location": "AVADI", "latitude": 13.1167, "longitude": 80.1010},  
        {"location": "ENNORE", "latitude": 13.2161, "longitude": 80.3231},  
        {"location": "PALLAVARAM", "latitude": 12.9686, "longitude": 80.1504},
        {"location": "VANAGARAM", "latitude": 13.0733, "longitude": 80.2090},

    ]

    my_theaters = []

    for theater_db in theaters_from_database:
        for theater in theaters:
            if theater['location'] == theater_db['location']:
                my_theater = {
                    "id": theater_db['id'],
                    "name": theater_db['name'],
                    "location": theater['location'],
                    "latitude": theater['latitude'],
                    "longitude": theater['longitude']
                }
                my_theaters.append(my_theater)

    for i in theaters:
        if i['location'] == location:
            location_info = {'latitude': i['latitude'], 'longitude': i['longitude']}


    provided_coords = (location_info['latitude'], location_info['longitude'])
    theaters_with_distances = []

    # Calculate distances from provided location to each theater
    for theater in my_theaters:
        theater_coords = (theater['latitude'], theater['longitude'])
        distance = geodesic(provided_coords, theater_coords).kilometers
        theaters_with_distances.append({"id" : theater['id'], "name": theater['name'],"distance": distance,"location": theater['location']})

    # Sort theaters by distance
    sorted_theaters = sorted(theaters_with_distances, key=lambda x: x['distance'])
    rendering_theaters = []
    for st in sorted_theaters:
        ti = st["id"]
        tn = st["name"]
        tl = st["location"]
        td = st["distance"]
        tup = (ti, tn, tl, int(td))
        rendering_theaters.append(tup)

    # Close database connection
    cursor.close()
    conn.close()

    # Render template to display all theaters
    name=session.get('name')
    email=session.get('email')
    phone=session.get('phone')
    location=session.get('location')
    
    detail = (name, email, phone, location, sm)
    return render_template('PARTIAL_THEATERS.html', theaters=rendering_theaters, details = detail)

@app.route('/all_theaters')
def theaters():
    location = session.get('location')
    # Connect to the database
    conn = connect_to_database()
    cursor = conn.cursor()
    theaters_from_database = []
    sql_select_Query = "SELECT * FROM THEATERS"
    cursor.execute(sql_select_Query)
    records = cursor.fetchall()

    for record in records:
        theater_id = record[0]
        theater_name = record[1]
        theater_loc = record[2]
        dic = {"id" : theater_id, "name": theater_name, "location": theater_loc}
        theaters_from_database.append(dic)
        
    theaters = [
        {"location": "ANNA NAGAR", "latitude": 13.0878, "longitude": 80.2174},
        {"location": "T. NAGAR", "latitude": 13.0394, "longitude": 80.2337},
        {"location": "ADYAR", "latitude": 13.0064, "longitude": 80.2575},
        {"location": "MYLAPORE", "latitude": 13.0316, "longitude": 80.2670},
        {"location": "NUNGAMBAKKAM", "latitude": 13.0620, "longitude": 80.2405},
        {"location": "ALWARPET", "latitude": 13.0334, "longitude": 80.2546},
        {"location": "EGMORE", "latitude": 13.0827, "longitude": 80.2707},
        {"location": "KILPAUK", "latitude": 13.0827, "longitude": 80.2437},
        {"location": "SAIDAPET", "latitude": 13.0203, "longitude": 80.2224},
        {"location": "VELACHERY", "latitude": 12.9802, "longitude": 80.2228},
        {"location": "GUINDY", "latitude": 13.0067, "longitude": 80.2206},
        {"location": "THIRUVANMIYUR", "latitude": 12.9869, "longitude": 80.2615},
        {"location": "PORUR", "latitude": 13.0324, "longitude": 80.1679},
        {"location": "MOGAPPAIR", "latitude": 13.0832, "longitude": 80.1674},
        {"location": "ANNA SALAI", "latitude": 13.0572, "longitude": 80.2668},
        {"location": "MAMBALAM", "latitude": 13.0355, "longitude": 80.2274},
        {"location": "KODAMBAKKAM", "latitude": 13.0512, "longitude": 80.2206},
        {"location": "MOUNT ROAD", "latitude": 13.0626, "longitude": 80.2696},
        {"location": "PALLIKARANAI", "latitude": 12.9329, "longitude": 80.2135},
        {"location": "ASHOK NAGAR", "latitude": 13.0402, "longitude": 80.2123},
        {"location": "CHROMPET", "latitude": 12.9517, "longitude": 80.1401},
        {"location": "AMBATTUR", "latitude": 13.1075, "longitude": 80.1648},
        {"location": "TAMBARAM", "latitude": 12.9246, "longitude": 80.1479},
        {"location": "VADAPALANI", "latitude": 13.0501, "longitude": 80.2120},
        {"location": "ROYAPETTAH", "latitude": 13.0581, "longitude": 80.2641},
        {"location": "SHOLINGANALLUR", "latitude": 12.8990, "longitude": 80.2279},
        {"location": "AVADI", "latitude": 13.1167, "longitude": 80.1010},  
        {"location": "ENNORE", "latitude": 13.2161, "longitude": 80.3231},  
        {"location": "PALLAVARAM", "latitude": 12.9686, "longitude": 80.1504},
        {"location": "VANAGARAM", "latitude": 13.0733, "longitude": 80.2090},

    ]


    my_theaters = []

    for theater_db in theaters_from_database:
        for theater in theaters:
            if theater['location'] == theater_db['location']:
                my_theater = {
                    "id": theater_db['id'],
                    "name": theater_db['name'],
                    "location": theater['location'],
                    "latitude": theater['latitude'],
                    "longitude": theater['longitude']
                }
                my_theaters.append(my_theater)


    for i in theaters:
        if(i['location'] == location):
            location_info = {'latitude' : i['latitude'], 'longitude' : i['longitude']}

    provided_coords = (location_info['latitude'], location_info['longitude'])
    theaters_with_distances = []

    # Calculate distances from provided location to each theater
    for theater in my_theaters:
        theater_coords = (theater['latitude'], theater['longitude'])
        distance = geodesic(provided_coords, theater_coords).kilometers
        theaters_with_distances.append({"id": theater['id'], "name": theater['name'], "distance": distance, "location": theater['location']})

    # Sort theaters by distance
    sorted_theaters = sorted(theaters_with_distances, key=lambda x: x['distance'])
    rendering_theaters = []
    for st in sorted_theaters:
        ti = st["id"]
        tn = st["name"]
        tl = st["location"]
        td = st["distance"]
        tup = (ti, tn, tl, int(td))
        rendering_theaters.append(tup)

    # Close database connection
    cursor.close()
    conn.close()
    name=session.get('name')
    email=session.get('email')
    phone=session.get('phone')
    location=session.get('location')
    detail = (name, email, phone, location)
    # Render template to display all theaters
    return render_template('ALL_THEATERS.html', theaters=rendering_theaters, details = detail)

@app.route('/avail_movies/<int:theater_id>', methods=['GET'])
def avail_movies(theater_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    sql_select_Query = """SELECT DISTINCT m.movie_id, m.movie_name, m.genre, m.rating, m.description, m.url, m.run_time, m.rdate 
                   FROM MOVIES m JOIN TM tm 
                   ON m.movie_id = tm.movie_id WHERE tm.theater_id = %s;"""
    cursor.execute(sql_select_Query, (theater_id, ))
    movie = cursor.fetchall()
    cursor.close()
    conn.close()

    name=session.get('name')
    email=session.get('email')
    phone=session.get('phone')
    location=session.get('location')
    detail = (name, email, phone, location, theater_id)
    return render_template('PARTIAL_MOVIES.html', details = detail, movies = movie)

@app.route('/all_movies')
def all_movies():
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("""SELECT * FROM MOVIES;""")
    movie = cursor.fetchall()
    cursor.close()
    conn.close()

    name=session.get('name')
    email=session.get('email')
    phone=session.get('phone')
    location=session.get('location')
    detail = (name, email, phone, location)

    return render_template('ALL_MOVIES.html', details = detail, movies = movie)

theater_id_variable = 0
@app.route('/mt_movies/<int:theater_id>')
def mt_movies(theater_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    global theater_id_variable
    theater_id_variable = theater_id
    today = '2024-04-11'
    tomorrow = '2024-04-12'

    cursor.execute("""
        SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.GENRE, MOVIES.RATING, MOVIES.DESCRIPTION,
               MOVIES.URL, MOVIES.RUN_TIME, 
               GROUP_CONCAT(TM.SCREEN_ID SEPARATOR ',') AS Screens,
               GROUP_CONCAT(TM.SHOW_TIME SEPARATOR ',') AS Times
        FROM MOVIES
        JOIN TM ON TM.MOVIE_ID = MOVIES.MOVIE_ID
        JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID
        WHERE THEATERS.THEATER_ID = %s AND TM.SHOW_DATE = %s
        GROUP BY MOVIES.MOVIE_ID;
    """, (theater_id, today, ))
    today_movies = cursor.fetchall()

    cursor.execute("""
        SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.GENRE, MOVIES.RATING, MOVIES.DESCRIPTION,
               MOVIES.URL, MOVIES.RUN_TIME, 
               GROUP_CONCAT(TM.SCREEN_ID SEPARATOR ',') AS Screens,
               GROUP_CONCAT(TM.SHOW_TIME SEPARATOR ',') AS Times
        FROM MOVIES
        JOIN TM ON TM.MOVIE_ID = MOVIES.MOVIE_ID
        JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID
        WHERE THEATERS.THEATER_ID = %s AND TM.SHOW_DATE = %s
        GROUP BY MOVIES.MOVIE_ID;
    """, (theater_id, tomorrow))
    tomorrow_movies = cursor.fetchall()

    cursor.close()
    conn.close()

    name = session.get('name')
    email = session.get('email')
    phone = session.get('phone')
    location = session.get('location')
    m = session.get('selected_movie')
    detail = (name, email, phone, location, m)

    def convert_date(date_str):
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        day = date_obj.day
        suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
        day_name = date_obj.strftime('%a')
        formatted_date = date_obj.strftime(f"%d{suffix} %B")
        return (day_name, formatted_date)

    fdt1 = convert_date(today)
    fdt2 = convert_date(tomorrow)

    return render_template('MOVIES.html', today = fdt1, tomorrow = fdt2, today_movies=today_movies, tomorrow_movies=tomorrow_movies, details=detail)

theater_id_variable = 0
@app.route('/tm_movies/<int:theater_id>/<int:movie_id>')
def tm_movies(theater_id, movie_id): 
    conn = connect_to_database()
    cursor = conn.cursor()
    global theater_id_variable
    theater_id_variable = theater_id
    today = '2024-04-11'
    tomorrow = '2024-04-12'

    cursor.execute("""
        SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.GENRE, MOVIES.RATING, MOVIES.DESCRIPTION,
               MOVIES.URL, MOVIES.RUN_TIME, 
               GROUP_CONCAT(TM.SCREEN_ID SEPARATOR ',') AS Screens,
               GROUP_CONCAT(TM.SHOW_TIME SEPARATOR ',') AS Times
        FROM MOVIES
        JOIN TM ON TM.MOVIE_ID = MOVIES.MOVIE_ID
        JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID
        WHERE THEATERS.THEATER_ID = %s AND TM.SHOW_DATE = %s
        GROUP BY MOVIES.MOVIE_ID;
    """, (theater_id, today, ))
    today_movies = cursor.fetchall()

    cursor.execute("""
        SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.GENRE, MOVIES.RATING, MOVIES.DESCRIPTION,
               MOVIES.URL, MOVIES.RUN_TIME, 
               GROUP_CONCAT(TM.SCREEN_ID SEPARATOR ',') AS Screens,
               GROUP_CONCAT(TM.SHOW_TIME SEPARATOR ',') AS Times
        FROM MOVIES
        JOIN TM ON TM.MOVIE_ID = MOVIES.MOVIE_ID
        JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID
        WHERE THEATERS.THEATER_ID = %s AND TM.SHOW_DATE = %s
        GROUP BY MOVIES.MOVIE_ID;
    """, (theater_id, tomorrow))
    tomorrow_movies = cursor.fetchall()

    cursor.close()
    conn.close()

    name = session.get('name')
    email = session.get('email')
    phone = session.get('phone')
    location = session.get('location')
    m = movie_id
    detail = (name, email, phone, location, m)

    def convert_date(date_str):
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        day = date_obj.day
        suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
        day_name = date_obj.strftime('%a')
        formatted_date = date_obj.strftime(f"%d{suffix} %B")
        return (day_name, formatted_date)

    fdt1 = convert_date(today)
    fdt2 = convert_date(tomorrow)

    return render_template('MOVIES.html', today = fdt1, tomorrow = fdt2, today_movies=today_movies, tomorrow_movies=tomorrow_movies, details=detail)



@app.route('/bookings/<int:movie_id>/<int:screen_id>/<string:time>/<string:day>')
def booking(movie_id, screen_id, time, day):
    # You can perform additional logic here if needed
    ti = theater_id_variable
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("""SELECT MOVIE_ID, MOVIE_NAME, GENRE FROM MOVIES WHERE MOVIE_ID = %s;""", (movie_id,))
    movie = cursor.fetchall()
    cursor.execute("""SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS WHERE THEATER_ID = %s;""", (ti,))
    theater = cursor.fetchall()
    cursor.execute("""SELECT ELITE_SEATS, PREMIUM_SEATS FROM SCREENS WHERE THEATER_ID = %s AND SCREEN_ID = %s;""", (ti, screen_id,))
    seat = cursor.fetchall()
    name = session.get('name')
    email = session.get('email')
    phone = session.get('phone') 
    location = session.get('location')
    session['mv_s'] = movie_id
    session['th_s'] = ti
    session['sc_s'] = screen_id
    session['ti_s'] = time
    session['da_s'] = day
    #insert_query = "SELECT user_id from users where email = %s"
    #cursor.execute(insert_query, email)
    #user_id = cursor.fetchall()
    #insert_query = "SELECT BOOKING_ID FROM BOOKINGS where user_id = %s and movie_id = %s and theater_id = %s and screen_id = %s and day = %s and show_time = %s"
    #cursor.execute(insert_query, (user_id[0][0], movie_id, ti, screen_id, day, time))
    #booking_id = cursor.fetchall()
    #insert_query = "SELECT * FROM SEATS_BOOKED WHERE BOOKING_ID = %s"
    #cursor.execute(insert_query, ())
    detail = (name, email, phone, location)
    return render_template('BOOKINGS.html', movies = movie, theaters = theater, screen  = screen_id, times =time, days = day, seats=seat,  details=detail)

@app.route('/proceed', methods=['POST'])
def proceed():
    data = request.get_json()
    selected_seats = data.get('selectedSeats', [])
    selected_seats_string = ', '.join(map(str, selected_seats))
    session['se_s'] = selected_seats
    return jsonify({'selectedSeats': selected_seats_string})


@app.route('/bookings')
def bookings():
    name = session.get('name')
    email = session.get('email')
    phone = session.get('phone')
    location = session.get('location')
    movie = session.get('mv_s')
    theater = session.get('th_s')
    screen = session.get('sc_s')
    time = session.get('ti_s')
    short_time = time[:5]
    day = session.get('da_s')
    # day_of_month = int(day[1].split()[0][:-2])  # Extracts '11' from '11th May'
    # month_name = day[1].split()[1]  # Extracts 'May'
    # year = 2024  # Assuming the year is always 2024
    # month_number = datetime.strptime(month_name, "%B").month
    # date_obj = datetime(year, month_number, day_of_month)
    # formatted_date = date_obj.strftime("%d-%b-%Y")
   

    date_obj = datetime.strptime(day[9:-2], "%dth %B")
    new_date_obj = date_obj - timedelta(days=0)
    formatted_date = new_date_obj.strftime("2024-%m-%d")
    date_obj = datetime.strptime(formatted_date, "%Y-%m-%d")
    need_day = formatted_date[-2:]
    month_name = date_obj.strftime("%B")
    day_of_week = date_obj.strftime("%A")
    seats = session.get('se_s')
    seats_count = len(seats)
    premium_count = 0
    elite_count = 0
    session['dateObj'] = formatted_date

    # Iterate over each seat in the list
    for seat in seats:
    # Check if the seat starts with 'p' (premium)
        if seat.startswith('p'):
            premium_count += 1
    # Check if the seat starts with 'e' (elite)
        elif seat.startswith('e'):
            elite_count += 1
    session['p_count'] = premium_count
    session['e_count'] = elite_count 
    p_cost = premium_count * 190
    p_cost_formatted = format(p_cost, '.1f')
    e_cost = elite_count * 150
    e_cost_formatted = format(e_cost, '.1f')
    t_cost = p_cost+e_cost
    t_cost_formatted = format(t_cost, '.1f')
    tax = t_cost * 0.18
    tax_formatted = format(tax, '.1f')
    tick = tax + 25
    tick_formatted = format(tick, '.1f')
    o_total = tick + t_cost
    o_total_formatted = format(o_total, '.1f')
    session['price'] = o_total_formatted
    conn = connect_to_database()
    cursor = conn.cursor()
    insert_query = "SELECT movie_name from movies where movie_id = %s;"
    cursor.execute(insert_query, (movie, ))
    movie_name = cursor.fetchall()
    insert_query = "SELECT theater_name from theaters where theater_id = %s;"
    cursor.execute(insert_query, (theater, ))
    theater_name = cursor.fetchall()
    insert_query = "SELECT location from theaters where theater_id = %s;"
    cursor.execute(insert_query, (theater, ))
    theater_location = cursor.fetchall()
    insert_query = "SELECT RATING FROM MOVIES WHERE MOVIE_ID = %s"
    cursor.execute(insert_query, (movie, ))
    rating = cursor.fetchall()
    insert_query = "SELECT URL FROM MOVIES WHERE MOVIE_ID=%s"
    cursor.execute(insert_query, (movie,))
    img = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()
    all_detail = (name, email, phone, location, movie_name[0][0], theater_name[0][0], theater_location[0][0], rating[0][0], seats_count, screen, short_time, formatted_date, need_day, month_name, day_of_week, premium_count, elite_count, p_cost_formatted,e_cost_formatted,t_cost_formatted, tax_formatted, tick_formatted, o_total_formatted, img[0][0], seats, day)
    return render_template('TICKETS.html', all_details = all_detail)

@app.route('/pay')
def pay():
    email = session.get('email')
    phone = session.get('phone')
    location = session.get('location')
    movie = session.get('mv_s')
    theater = session.get('th_s')
    screen = session.get('sc_s')
    date = session.get('dateObj')
    time = session.get('ti_s')
    seats = session.get('se_s')

    p_count = session.get('p_count')
    e_count = session.get('e_count')
    price = session.get('price')

    conn = connect_to_database()
    cursor = conn.cursor()
    insert_query = "Select user_id from users where email = %s"
    cursor.execute(insert_query, (email, ))
    userId = cursor.fetchall()
    user_id = userId[0][0]

    insert_query = "INSERT INTO bookings (user_id, movie_id, theater_id, screen_id, day, show_time, no_of_elite_seats, no_of_premium_seats, price) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    cursor.execute(insert_query, (user_id, movie, theater, screen, date, time, e_count, p_count, price))

    insert_query = "SELECT BOOKING_ID FROM BOOKINGS where user_id = %s and movie_id = %s and theater_id = %s and screen_id = %s and day = %s and show_time = %s and no_of_elite_seats = %s and no_of_premium_seats = %s and price = %s"
    cursor.execute(insert_query, (user_id, movie, theater, screen, date, time, e_count, p_count, price))
    booking_id = cursor.fetchall()
    for seat in seats:
        insert_query = "INSERT INTO SEATS_BOOKED (booking_id, seats) values(%s, %s)"
        cursor.execute(insert_query, (booking_id[0][0], seat))
    

    conn.commit()
    cursor.close()
    conn.close()


    return render_template('GENERATION.html')


@app.route('/create_movie')
def create_movie():
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT MOVIE_ID, MOVIE_NAME, GENRE, RATING, DESCRIPTION, URL, RUN_TIME, RDATE FROM MOVIES ORDER BY(MOVIE_ID);")
    movie_detail = cursor.fetchall()
    return render_template('EDIT_MOVIES_1.html', movie_details = movie_detail)

@app.route('/insert_movie')
def insert_movie():
    movie_detail = (['','','','','','','',''])
    return render_template('EDIT_MOVIES_2.html', movie_details = movie_detail, operation='insert')

@app.route('/update_movie/<int:movie_id>')
def update_movie(movie_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT MOVIE_ID, MOVIE_NAME, GENRE, RATING, DESCRIPTION, URL, RUN_TIME, RDATE FROM MOVIES WHERE MOVIE_ID = %s;", (movie_id, ))
    movie_detail = cursor.fetchall()
    return render_template('EDIT_MOVIES_2.html', movie_details = movie_detail, operation='update')

@app.route('/delete_movie/<int:movie_id>')
def delete_movie(movie_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    delete_query = "DELETE FROM MOVIES WHERE MOVIE_ID = %s;"
    cursor.execute(delete_query, (movie_id,))
    conn.commit()
    cursor.close()
    conn.close()

    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT MOVIE_ID, MOVIE_NAME, GENRE, RATING, DESCRIPTION, URL, RUN_TIME, RDATE FROM MOVIES ORDER BY(MOVIE_ID);")
    movie_detail = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()
    return render_template('EDIT_MOVIES_1.html',movie_details = movie_detail)

@app.route('/back_from')
def back_from():
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.RDATE AS total_revenue FROM MOVIES;")
    movie_detail = cursor.fetchall()
    cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS;")
    theater_detail = cursor.fetchall()
    return render_template('ADMIN.html', movie_details = movie_detail, theater_details = theater_detail)

@app.route('/commit_movie', methods=['POST'])
def commit_movie():
    movie_id = request.form['movie_id']
    movie_name = request.form['movie_name']
    genre = request.form['genre']
    rating = request.form['rating']
    description = request.form['description']
    url = request.form['url']
    run_time = request.form['run_time']
    rdate = request.form['rdate']
    conn = connect_to_database()
    cursor = conn.cursor()
    insert_query = "INSERT INTO MOVIES (movie_id, movie_name, genre, rating, description, url, run_time, rdate) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
    cursor.execute(insert_query, (movie_id, movie_name, genre, rating, description, url, run_time, rdate))
    conn.commit()
    cursor.close()
    conn.close()

    name=session.get('name')
    email=session.get('email')
    phone=session.get('phone')
    location=session.get('location')
    detail = (name, email, phone, location)
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT MOVIE_ID, MOVIE_NAME, GENRE, RATING, DESCRIPTION, URL, RUN_TIME, RDATE FROM MOVIES ORDER BY(MOVIE_ID);")
    movie_detail = cursor.fetchall()
    return render_template('EDIT_MOVIES_1.html', details = detail, movie_details = movie_detail)

@app.route('/updated_movie', methods=['POST'])
def updated_movie():
    movie_id = request.form['movie_id']
    movie_id = int(movie_id)
    movie_name = request.form['movie_name']
    genre = request.form['genre']
    rating = request.form['rating']
    description = request.form['description']
    url = request.form['url']
    run_time = request.form['run_time']
    rdate = request.form['rdate']

    try:
        conn = connect_to_database()
        cursor = conn.cursor()
        update_query = "UPDATE MOVIES SET movie_name = %s, genre = %s, rating = %s, description = %s, url = %s, run_time = %s, rdate = %s WHERE movie_id = %s"
        cursor.execute(update_query, (movie_name, genre, rating, description, url, run_time, rdate, movie_id))
        conn.commit()
        cursor.close()
        conn.close()


        conn = connect_to_database()
        cursor = conn.cursor()
        cursor.execute("SELECT MOVIE_ID, MOVIE_NAME, GENRE, RATING, DESCRIPTION, URL, RUN_TIME, RDATE FROM MOVIES ORDER BY(MOVIE_ID);")
        movie_detail = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return render_template('EDIT_MOVIES_1.html',movie_details = movie_detail)
    
    except Exception as e:
        # If an error occurs, capture the error message
        error_message = "Run time of Movie can't be updated once if screened."
        # Fetch movie details again to pass to the template
        conn = connect_to_database()
        cursor = conn.cursor()
        cursor.execute("SELECT MOVIE_ID, MOVIE_NAME, GENRE, RATING, DESCRIPTION, URL, RUN_TIME, RDATE FROM MOVIES WHERE MOVIE_ID = %s;", (movie_id,))
        movie_detail = cursor.fetchall()
        return render_template('EDIT_MOVIES_2.html', movie_details=movie_detail, error=error_message, operation='update')


@app.route('/create_theater')
def create_theater():
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS;")
    theater_detail = cursor.fetchall()
    return render_template('EDIT_THEATERS_1.html', theater_details = theater_detail)

@app.route('/insert_theater')
def insert_theater():
    theater_detail = (['','','','','','','',''])
    return render_template('EDIT_THEATERS_2.html', theater_details = theater_detail, operation='insert')

@app.route('/commit_theater', methods=['POST'])
def commit_theater():
    theater_id = request.form['theater_id']
    theater_name = request.form['theater_name']
    location = request.form['location']
    conn = connect_to_database()
    cursor = conn.cursor()
    insert_query = "INSERT INTO THEATERS (theater_id, theater_name, location) VALUES (%s, %s, %s)"
    cursor.execute(insert_query, (theater_id, theater_name, location))
    conn.commit()
    cursor.close()
    conn.close()

    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS;")
    theater_detail = cursor.fetchall()
    return render_template('EDIT_THEATERS_1.html', theater_details = theater_detail)

@app.route('/update_theater/<int:theater_id>')
def update_theater(theater_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS WHERE THEATER_ID = %s;", (theater_id, ))
    theater_detail = cursor.fetchall()
    return render_template('EDIT_THEATERS_2.html', theater_details = theater_detail, operation='update')

@app.route('/updated_theater', methods=['POST'])
def updated_theater():
    theater_id = request.form['theater_id']
    theater_id = int(theater_id)
    theater_name = request.form['theater_name']
    location = request.form['location']

    conn = connect_to_database()
    cursor = conn.cursor()
    update_query = "UPDATE THEATERS SET theater_name = %s, location = %s WHERE theater_id = %s;"
    cursor.execute(update_query, (theater_name, location, theater_id))
    conn.commit()
    cursor.close()
    conn.close()


    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS;")
    theater_detail = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()
    return render_template('EDIT_THEATERS_1.html',theater_details = theater_detail)

@app.route('/delete_theater/<int:theater_id>')
def delete_theater(theater_id):
    conn = connect_to_database()
    cursor = conn.cursor()
    delete_query = "DELETE FROM THEATERS WHERE THEATER_ID = %s;"
    cursor.execute(delete_query, (theater_id,))
    conn.commit()
    cursor.close()
    conn.close()

    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("SELECT THEATER_ID, THEATER_NAME, LOCATION FROM THEATERS ORDER BY(THEATER_ID);")
    theater_detail = cursor.fetchall()
    conn.commit()
    cursor.close()
    conn.close()
    return render_template('EDIT_THEATERS_1.html',theater_details = theater_detail)

@app.route('/create_tm')
def create_tm():
    conn = connect_to_database()
    cursor = conn.cursor()
    cursor.execute("""SELECT THEATERS.THEATER_ID, THEATERS.THEATER_NAME, MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, TM.SCREEN_ID, TM.SHOW_DATE, TM.SHOW_TIME FROM TM JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID JOIN MOVIES ON TM.MOVIE_ID = MOVIES.MOVIE_ID""")
    tm_detail = cursor.fetchall()
    cursor.close()
    conn.close()
    #t_detail = cursor.fetchall()
    return render_template('EDIT_TM_1.html', tm_details = tm_detail)

@app.route('/insert_tm')
def insert_tm():
    tm_detail = (['','','','',''])
    return render_template('EDIT_TM_2.html', tm_details = tm_detail, operation='insert')

@app.route('/update_tm/<int:theater_id>/<int:movie_id>/<int:screen_id>/<string:show_date>/<string:show_time>')
def update_tm(theater_id, movie_id, screen_id, show_date, show_time):
    tm_detail = ([theater_id, movie_id, screen_id, show_date, show_time])
    return render_template('EDIT_TM_2.html', tm_details = tm_detail, operation='update')

@app.route('/commit_tm', methods=['POST'])
def commit_tm():
    theater_id = request.form['theater_id']
    movie_id = request.form['movie_id']
    screen_id = request.form['screen_id']
    show_date = request.form['show_date']
    show_time = request.form['show_time']
    
    try:
        conn = connect_to_database()
        cursor = conn.cursor()
        insert_query = "INSERT INTO TM (theater_id, movie_id, screen_id, show_date, show_time) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(insert_query, (theater_id, movie_id, screen_id, show_date, show_time))
        conn.commit()
        cursor.close()
        conn.close()

        conn = connect_to_database()
        cursor = conn.cursor()
        cursor.execute("""SELECT THEATERS.THEATER_ID, THEATERS.THEATER_NAME, MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, TM.SCREEN_ID, TM.SHOW_DATE, TM.SHOW_TIME FROM TM JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID JOIN MOVIES ON TM.MOVIE_ID = MOVIES.MOVIE_ID""")
        tm_detail = cursor.fetchall()
        cursor.close()
        conn.close()
        return render_template('EDIT_TM_1.html', tm_details = tm_detail)
    except Exception as e:
        tm_detail = (theater_id, movie_id, screen_id, show_date, show_time)
        er = "TIME BETWEEN 2 SCREENED MOVIES SHOULD BE ATLEAST 1 HOUR."
        return render_template('EDIT_TM_2.html', tm_details = tm_detail, error = e)

if __name__ == '__main__':
    app.run(debug=True)
    app.debug = True