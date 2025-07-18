----------+------------------------+-----------+----------+-----------------------------------
                                     Table "public.users"
  Column  |          Type          | Collation | Nullable |              Default
----------+------------------------+-----------+----------+-----------------------------------
 id       | integer                |           | not null | nextval('users_id_seq'::regclass)
 email    | character varying(50)  |           | not null |
 password | character varying(300) |           |          |
 location | character varying(100) |           |          |
 is_admin | boolean                |           |          |
Indexes:
    "users_pkey" PRIMARY KEY, btree (email)
    "users_id_key" UNIQUE CONSTRAINT, btree (id)
----------+------------------------+-----------+----------+-----------------------------------

-------------+-----------------------------+-----------+----------+------------------------------------
                                         Table "public.movies"
   Column    |            Type             | Collation | Nullable |              Default
-------------+-----------------------------+-----------+----------+------------------------------------
 id          | integer                     |           | not null | nextval('movies_id_seq'::regclass)
 name        | character varying(40)       |           | not null |
 releasedate | timestamp without time zone |           |          |
 runtime     | interval                    |           |          |
 genre       | character varying(25)       |           |          |
 description | character varying(250)      |           |          |
 ratings     | real                        |           |          |
 image       | text                        |           |          |
 certificate | character varying(10)       |           |          |
Indexes:
    "movies_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "shows" CONSTRAINT "fk_shows_movie" FOREIGN KEY (movie_id) REFERENCES movies(id)
Triggers:
    before_movies_runtime_update BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION prevent_runtime_update()
-------------+-----------------------------+-----------+----------+------------------------------------

---------------+-------------------------+-----------+----------+--------------------------------------
                                        Table "public.theaters"
    Column     |          Type           | Collation | Nullable |               Default
---------------+-------------------------+-----------+----------+--------------------------------------
 id            | integer                 |           | not null | nextval('theaters_id_seq'::regclass)
 name          | character varying(100)  |           |          |
 location      | character varying(100)  |           |          |
 parking       | boolean                 |           |          |
 accessibility | boolean                 |           |          |
 image         | character varying(1000) |           |          |
 hours         | character varying(25)   |           |          |
Indexes:
    "theaters_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "screens" CONSTRAINT "fk_screens_theater" FOREIGN KEY (theater_id) REFERENCES theaters(id) ON DELETE CASCADE
    TABLE "shows" CONSTRAINT "fk_shows_theater" FOREIGN KEY (theater_id) REFERENCES theaters(id)
---------------+-------------------------+-----------+----------+--------------------------------------

---------------+-----------------------+-----------+----------+---------
                         Table "public.screens"
    Column     |         Type          | Collation | Nullable | Default
---------------+-----------------------+-----------+----------+---------
 theater_id    | integer               |           | not null |
 screen_id     | integer               |           | not null |
 screen_name   | character varying(30) |           |          |
 elite_seats   | integer               |           |          |
 premium_seats | integer               |           |          |
 elite_price   | numeric(10,2)         |           |          |
 premium_price | numeric(10,2)         |           |          |
Indexes:
    "screens_pkey" PRIMARY KEY, btree (theater_id, screen_id)
Foreign-key constraints:
    "fk_screens_theater" FOREIGN KEY (theater_id) REFERENCES theaters(id) ON DELETE CASCADE
Referenced by:
    TABLE "shows" CONSTRAINT "fk_shows_screen" FOREIGN KEY (theater_id, screen_id) REFERENCES screens(theater_id, screen_id)
---------------+-----------------------+-----------+----------+---------

------------+------------------------+-----------+----------+----------------------------------------
                                        Table "public.shows"
   Column   |          Type          | Collation | Nullable |                Default
------------+------------------------+-----------+----------+----------------------------------------
 theater_id | integer                |           | not null |
 movie_id   | integer                |           | not null |
 screen_id  | integer                |           | not null |
 show_date  | date                   |           | not null |
 show_time  | time without time zone |           | not null |
 show_id    | integer                |           | not null | nextval('shows_show_id_seq'::regclass)
Indexes:
    "shows_pkey" PRIMARY KEY, btree (theater_id, movie_id, screen_id, show_date, show_time)
    "unique_show_id" UNIQUE CONSTRAINT, btree (show_id)
Foreign-key constraints:
    "fk_shows_movie" FOREIGN KEY (movie_id) REFERENCES movies(id)
    "fk_shows_screen" FOREIGN KEY (theater_id, screen_id) REFERENCES screens(theater_id, screen_id)
    "fk_shows_theater" FOREIGN KEY (theater_id) REFERENCES theaters(id)
Referenced by:
    TABLE "seat_instances" CONSTRAINT "fk_show" FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE
    TABLE "seat_instances" CONSTRAINT "seat_instances_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE
Triggers:
    before_show_insert_1hour_gap BEFORE INSERT ON shows FOR EACH ROW EXECUTE FUNCTION check_show_time_gap()
    trg_add_seat_instances AFTER INSERT ON shows FOR EACH ROW EXECUTE FUNCTION create_seat_instances_for_show()
    trg_reset_seat_bookings_on_show_date_update AFTER UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION reset_seat_bookings_on_show_date_update()
------------+------------------------+-----------+----------+----------------------------------------

-------------+-----------------------+-----------+----------+-------------------------------------------------
                                        Table "public.seat_instances"
   Column    |         Type          | Collation | Nullable |                     Default
-------------+-----------------------+-----------+----------+-------------------------------------------------
 seat_id     | integer               |           | not null | nextval('seat_instances_seat_id_seq'::regclass)
 show_id     | integer               |           |          |
 seat_number | character varying(10) |           |          |
 seat_type   | character varying(10) |           |          |
 is_booked   | boolean               |           |          | false
 price       | numeric(10,2)         |           |          |
Indexes:
    "seat_instances_pkey" PRIMARY KEY, btree (seat_id)
Foreign-key constraints:
    "fk_show" FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE
    "seat_instances_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE
Referenced by:
    TABLE "booked_seats" CONSTRAINT "booked_seats_seat_id_fkey" FOREIGN KEY (seat_id) REFERENCES seat_instances(seat_id) ON DELETE CASCADE
Triggers:
    trg_unbook_seat_cleanup AFTER UPDATE ON seat_instances FOR EACH ROW WHEN (old.is_booked = true AND new.is_booked = false) EXECUTE FUNCTION unbook_seat_cleanup()
-------------+-----------------------+-----------+----------+-------------------------------------------------

-------------+------------------------+-----------+----------+----------------------------------------------
                                          Table "public.bookings"
   Column    |          Type          | Collation | Nullable |                   Default
-------------+------------------------+-----------+----------+----------------------------------------------
 booking_id  | integer                |           | not null | nextval('bookings_booking_id_seq'::regclass)
 show_id     | integer                |           | not null |
 theater_id  | integer                |           | not null |
 movie_id    | integer                |           | not null |
 screen_id   | integer                |           | not null |
 show_date   | date                   |           | not null |
 show_time   | time without time zone |           | not null |
 total_seats | integer                |           |          |
 email       | character varying(100) |           |          |
 total_price | numeric(10,2)          |           |          |
 book_date   | date                   |           |          |
Indexes:
    "bookings_pkey" PRIMARY KEY, btree (booking_id)
Referenced by:
    TABLE "booked_seats" CONSTRAINT "booked_seats_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
Triggers:
    trg_after_insert_booking AFTER INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION trg_insert_all_bookings()
-------------+------------------------+-----------+----------+----------------------------------------------

------------+---------------+-----------+----------+------------------------------------------
                                 Table "public.booked_seats"
   Column   |     Type      | Collation | Nullable |                 Default
------------+---------------+-----------+----------+------------------------------------------
 id         | integer       |           | not null | nextval('booked_seats_id_seq'::regclass)
 booking_id | integer       |           | not null |
 seat_id    | integer       |           | not null |
 price      | numeric(10,2) |           |          |
Indexes:
    "booked_seats_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "booked_seats_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
    "booked_seats_seat_id_fkey" FOREIGN KEY (seat_id) REFERENCES seat_instances(seat_id) ON DELETE CASCADE
Triggers:
    trg_after_insert_booked_seat AFTER INSERT ON booked_seats FOR EACH ROW EXECUTE FUNCTION trg_insert_all_booked_seats()
    trg_update_booking_seat_count_on_delete AFTER DELETE ON booked_seats FOR EACH ROW EXECUTE FUNCTION update_booking_seat_count_on_delete()
------------+---------------+-----------+----------+------------------------------------------

-------------+------------------------+-----------+----------+---------
                      Table "public.all_bookings"
   Column    |          Type          | Collation | Nullable | Default
-------------+------------------------+-----------+----------+---------
 booking_id  | integer                |           | not null |
 show_id     | integer                |           |          |
 theater_id  | integer                |           |          |
 movie_id    | integer                |           |          |
 screen_id   | integer                |           |          |
 show_date   | date                   |           |          |
 show_time   | time without time zone |           |          |
 total_seats | integer                |           |          |
 email       | character varying(100) |           |          |
 total_price | numeric(10,2)          |           |          |
 status      | character varying(25)  |           |          |
 book_date   | date                   |           |          |
Indexes:
    "pk_booking_id" PRIMARY KEY, btree (booking_id)
Referenced by:
    TABLE "all_booked_seats" CONSTRAINT "fk_all_booked_seats_booking_id" FOREIGN KEY (booking_id) REFERENCES all_bookings(booking_id) ON DELETE CASCADE
-------------+------------------------+-----------+----------+---------

------------+---------------+-----------+----------+---------
imtbs=# \d all_booked_seatsTable "public.all_booked_seats"
   Column   |     Type      | Collation | Nullable | Default
------------+---------------+-----------+----------+---------
 id         | integer       |           |          |
 booking_id | integer       |           |          |
 seat_id    | integer       |           |          |
 price      | numeric(10,2) |           |          |
Foreign-key constraints:
    "fk_all_booked_seats_booking_id" FOREIGN KEY (booking_id) REFERENCES all_bookings(booking_id) ON DELETE CASCADE
------------+---------------+-----------+----------+---------