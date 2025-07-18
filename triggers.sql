-----------------------------------------------------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('check_show_time_gap'::regproc);
-----------------------------------------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.check_show_time_gap()                                                  +
  RETURNS trigger                                                                                         +
  LANGUAGE plpgsql                                                                                        +
 AS $function$                                                                                            +
 DECLARE                                                                                                  +
     prev_show RECORD;                                                                                    +
     next_show RECORD;                                                                                    +
     current_movie_runtime INTERVAL;                                                                      +
     prev_end_time TIME;                                                                                  +
     new_end_time TIME;                                                                                   +
     min_gap INTERVAL := '1 hour';                                                                        +
     error_msg TEXT;                                                                                      +
 BEGIN                                                                                                    +
     -- Get runtime for the new movie                                                                     +
     SELECT runtime INTO current_movie_runtime                                                            +
     FROM movies WHERE id = NEW.movie_id;                                                                 +
                                                                                                          +
     -- Validate runtime exists and is positive                                                           +
     IF current_movie_runtime IS NULL OR current_movie_runtime <= INTERVAL '0 minutes' THEN               +
         RAISE EXCEPTION 'Movie ID % has invalid runtime: %', NEW.movie_id, current_movie_runtime;        +
     END IF;                                                                                              +
                                                                                                          +
     new_end_time := NEW.show_time + current_movie_runtime;                                               +
                                                                                                          +
     -- Check for shows that would overlap with the new one (updated without id check)                    +
     PERFORM 1 FROM shows s                                                                               +
     JOIN movies m ON s.movie_id = m.id                                                                   +
     WHERE s.theater_id = NEW.theater_id                                                                  +
       AND s.screen_id = NEW.screen_id                                                                    +
       AND s.show_date = NEW.show_date                                                                    +
       AND s.show_time < new_end_time                                                                     +
       AND (s.show_time + m.runtime) > NEW.show_time                                                      +
       AND (s.show_time != NEW.show_time OR s.movie_id != NEW.movie_id); -- Basic duplicate check         +
                                                                                                          +
     IF FOUND THEN                                                                                        +
         RAISE EXCEPTION 'New show overlaps with existing screening!';                                    +
     END IF;                                                                                              +
                                                                                                          +
     -- Rest of the function remains the same...                                                          +
     -- Get closest previous show                                                                         +
     SELECT s.show_time, m.runtime INTO prev_show                                                         +
     FROM shows s                                                                                         +
     JOIN movies m ON s.movie_id = m.id                                                                   +
     WHERE s.theater_id = NEW.theater_id                                                                  +
       AND s.screen_id = NEW.screen_id                                                                    +
       AND s.show_date = NEW.show_date                                                                    +
       AND s.show_time < NEW.show_time                                                                    +
     ORDER BY s.show_time DESC                                                                            +
     LIMIT 1;                                                                                             +
                                                                                                          +
     -- Get closest next show                                                                             +
     SELECT s.show_time, m.runtime INTO next_show                                                         +
     FROM shows s                                                                                         +
     JOIN movies m ON s.movie_id = m.id                                                                   +
     WHERE s.theater_id = NEW.theater_id                                                                  +
       AND s.screen_id = NEW.screen_id                                                                    +
       AND s.show_date = NEW.show_date                                                                    +
       AND s.show_time > NEW.show_time                                                                    +
     ORDER BY s.show_time ASC                                                                             +
     LIMIT 1;                                                                                             +
                                                                                                          +
     -- Validate against previous show                                                                    +
     IF prev_show IS NOT NULL THEN                                                                        +
         prev_end_time := prev_show.show_time + prev_show.runtime;                                        +
                                                                                                          +
         IF (NEW.show_time - prev_end_time) < min_gap THEN                                                +
             error_msg := format(                                                                         +
                 '?? TIME VIOLATION! Need %s gap after previous movie (ends at %s). Tried to start at %s',+
                 min_gap, prev_end_time, NEW.show_time                                                    +
             );                                                                                           +
             RAISE EXCEPTION '%', error_msg;                                                              +
         END IF;                                                                                          +
     END IF;                                                                                              +
                                                                                                          +
     -- Validate against next show                                                                        +
     IF next_show IS NOT NULL THEN                                                                        +
         IF (next_show.show_time - new_end_time) < min_gap THEN                                           +
             error_msg := format(                                                                         +
                 '?? TIME VIOLATION! Need %s gap before next movie (starts at %s). Your movie ends at %s',+
                 min_gap, next_show.show_time, new_end_time                                               +
             );                                                                                           +
             RAISE EXCEPTION '%', error_msg;                                                              +
         END IF;                                                                                          +
     END IF;                                                                                              +
                                                                                                          +
     RETURN NEW;                                                                                          +
 END;                                                                                                     +
 $function$                                                                                               +

------------------------------------------------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('trg_insert_all_booked_seats'::regproc);
------------------------------------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.trg_insert_all_booked_seats()                                     +
  RETURNS trigger                                                                                    +
  LANGUAGE plpgsql                                                                                   +
 AS $function$                                                                                       +
 BEGIN                                                                                               +
   INSERT INTO all_booked_seats (                                                                    +
     id,                                                                                             +
     booking_id,                                                                                     +
     seat_id,                                                                                        +
     price  -- Added price column                                                                    +
   )                                                                                                 +
   VALUES (                                                                                          +
     NEW.id,                                                                                         +
     NEW.booking_id,                                                                                 +
     NEW.seat_id,                                                                                    +
     (SELECT price FROM seat_instances WHERE seat_id = NEW.seat_id)  -- Get price from seat_instances+
   );                                                                                                +
   RETURN NEW;                                                                                       +
 END;                                                                                                +
 $function$                                                                                          +

------------------------------------------------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('update_booking_seat_count_on_delete'::regproc);         
-------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.update_booking_seat_count_on_delete()+
  RETURNS trigger                                                       +
  LANGUAGE plpgsql                                                      +
 AS $function$                                                          +
 BEGIN                                                                  +
   -- First get the seat price from the booked_seats table              +
   DECLARE                                                              +
     seat_price NUMERIC;                                                +
   BEGIN                                                                +
     SELECT price INTO seat_price                                       +
     FROM seat_instances                                                +
     WHERE seat_id = OLD.seat_id;                                       +
                                                                        +
     -- Update both total_seats and total_price in bookings table       +
     UPDATE bookings                                                    +
     SET                                                                +
       total_seats = total_seats - 1,                                   +
       total_price = total_price - COALESCE(seat_price, 0)              +
     WHERE booking_id = OLD.booking_id;                                 +
   END;                                                                 +
                                                                        +
   -- Delete booking if total_seats drops to 0                          +
   DELETE FROM bookings                                                 +
   WHERE booking_id = OLD.booking_id AND total_seats <= 0;              +
                                                                        +
   RETURN OLD;                                                          +
 END;                                                                   +
 $function$                                                             +

-------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('trg_insert_all_bookings'::regproc);
-------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.trg_insert_all_bookings()+
  RETURNS trigger                                           +
  LANGUAGE plpgsql                                          +
 AS $function$                                              +
 BEGIN                                                      +
   INSERT INTO all_bookings (                               +
     booking_id,                                            +
     show_id,                                               +
     theater_id,                                            +
     movie_id,                                              +
     screen_id,                                             +
     show_date,                                             +
     show_time,                                             +
     total_seats,                                           +
     total_price,                                           +
     email,                                                 +
     status,                                                +
     book_date  -- Added book_date column                   +
   )                                                        +
   VALUES (                                                 +
     NEW.booking_id,                                        +
     NEW.show_id,                                           +
     NEW.theater_id,                                        +
     NEW.movie_id,                                          +
     NEW.screen_id,                                         +
     NEW.show_date,                                         +
     NEW.show_time,                                         +
     NEW.total_seats,                                       +
     COALESCE(NEW.total_price, 0),                          +
     NEW.email,                                             +
     'booked',                                              +
     NEW.book_date                                          +
   );                                                       +
   RETURN NEW;                                              +
 END;                                                       +
 $function$                                                 +

-------------------------------------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('prevent_runtime_update'::regproc);
-------------------------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.prevent_runtime_update()                               +
  RETURNS trigger                                                                         +
  LANGUAGE plpgsql                                                                        +
 AS $function$                                                                            +
 DECLARE                                                                                  +
     scheduled_count INT;                                                                 +
 BEGIN                                                                                    +
     IF NEW.runtime IS DISTINCT FROM OLD.runtime THEN                                     +
         SELECT COUNT(*) INTO scheduled_count FROM shows WHERE movie_id = OLD.id;         +
         IF scheduled_count > 0 THEN                                                      +
             RAISE EXCEPTION 'Cannot update run time of a movie scheduled for screening.';+
         END IF;                                                                          +
     END IF;                                                                              +
     RETURN NEW;                                                                          +
 END;                                                                                     +
 $function$                                                                               +

-----------------------------------------------------------
imtbs=SELECT pg_get_functiondef('unbook_seat_cleanup'::regproc);
-----------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.unbook_seat_cleanup()  +
  RETURNS trigger                                         +
  LANGUAGE plpgsql                                        +
 AS $function$                                            +
 BEGIN                                                    +
   IF OLD.is_booked = TRUE AND NEW.is_booked = FALSE THEN +
     -- Just remove the seat from booked_seats            +
     DELETE FROM booked_seats WHERE seat_id = NEW.seat_id;+
   END IF;                                                +
                                                          +
   RETURN NEW;                                            +
 END;                                                     +
 $function$                                               +

------------------------------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('create_seat_instances_for_show'::regproc);
------------------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.create_seat_instances_for_show()                +
  RETURNS trigger                                                                  +
  LANGUAGE plpgsql                                                                 +
 AS $function$                                                                     +
 DECLARE                                                                           +
   e_count INT;                                                                    +
   p_count INT;                                                                    +
   e_price NUMERIC(10,2);                                                          +
   p_price NUMERIC(10,2);                                                          +
   i INT;                                                                          +
 BEGIN                                                                             +
   -- Get seat counts and prices from screens table                                +
   SELECT elite_seats, premium_seats, elite_price, premium_price                   +
   INTO e_count, p_count, e_price, p_price                                         +
   FROM screens                                                                    +
   WHERE theater_id = NEW.theater_id AND screen_id = NEW.screen_id;                +
                                                                                   +
   -- Insert elite seats with dynamic pricing                                      +
   FOR i IN 1..e_count LOOP                                                        +
     INSERT INTO seat_instances (show_id, seat_number, seat_type, is_booked, price)+
     VALUES (NEW.show_id, 'E' || i, 'elite', false, e_price);                      +
   END LOOP;                                                                       +
                                                                                   +
   -- Insert premium seats with dynamic pricing                                    +
   FOR i IN 1..p_count LOOP                                                        +
     INSERT INTO seat_instances (show_id, seat_number, seat_type, is_booked, price)+
     VALUES (NEW.show_id, 'P' || i, 'premium', false, p_price);                    +
   END LOOP;                                                                       +
                                                                                   +
   RETURN NEW;                                                                     +
 END;                                                                              +
 $function$                                                                        +

-----------------------------------------------------------------------------
imtbs=SELECT pg_get_functiondef('reset_seat_bookings_on_show_date_update'::regproc);
-----------------------------------------------------------------------------
 CREATE OR REPLACE FUNCTION public.reset_seat_bookings_on_show_date_update()+
  RETURNS trigger                                                           +
  LANGUAGE plpgsql                                                          +
 AS $function$                                                              +
 BEGIN                                                                      +
   -- Only act if show_date was actually changed                            +
   IF OLD.show_date <> NEW.show_date THEN                                   +
     -- Reset is_booked in seat_instances for this show                     +
     UPDATE seat_instances                                                  +
     SET is_booked = FALSE                                                  +
     WHERE show_id = NEW.show_id;                                           +
   END IF;                                                                  +
                                                                            +
   RETURN NEW;                                                              +
 END;                                                                       +
 $function$                                                                 +
