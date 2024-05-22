--TO NOT UPDATE RUNTIME AFTER SCHEDULING
DELIMITER //

CREATE OR REPLACE TRIGGER before_runtime_update_on_scheduled_movies
BEFORE UPDATE ON movies FOR EACH ROW
BEGIN
    DECLARE movie_exists INT;
    IF NEW.run_time != OLD.run_time THEN

        -- Check if the movie is present in the TM table
        SELECT COUNT(*) INTO movie_exists
        FROM TM
        WHERE MOVIE_ID = NEW.MOVIE_ID;

        -- If the movie is present in the TM table, prevent the update
        IF movie_exists > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot update run time of a movie scheduled for screening.';
        END IF;
    END IF;
END //

DELIMITER ;



--ENSURES THAT IF NEW MOVIE IS INSERTED IT IS ATLEAST INSERTED AFTER 1 HOUR AFTER ITS PREVIOUS MOVIE GETS OVER (SHOW_TIME BASED) 
--AND IT IS ATLEAST INSERTED AFTER 1 HOUR BEFORE THE NEXT MOVIE STARTS.
DELIMITER //

CREATE OR REPLACE TRIGGER before_tm_insert_1hour_hibernation
BEFORE INSERT ON TM FOR EACH ROW
BEGIN

    DECLARE prev_run_time TIME;
    DECLARE prev_movie_start_time TIME;
    DECLARE prev_movie_end_time TIME;

    DECLARE new_run_time TIME;
    DECLARE new_movie_start_time TIME;
    DECLARE new_movie_end_time TIME;

    DECLARE next_run_time TIME;
    DECLARE next_movie_start_time TIME;
    DECLARE next_movie_end_time TIME;

    DECLARE prev_movieid INT;
    DECLARE next_movieid INT;

    DECLARE time_diff_before TIME;
    DECLARE time_diff_after TIME;

    SELECT TM.MOVIE_ID, SHOW_TIME
    INTO prev_movieid, prev_movie_start_time
    FROM TM
    WHERE THEATER_ID = NEW.THEATER_ID
        AND SCREEN_ID = NEW.SCREEN_ID
        AND SHOW_DATE = NEW.SHOW_DATE
        AND SHOW_TIME < NEW.SHOW_TIME
    ORDER BY SHOW_TIME DESC
    LIMIT 1;

    SELECT TM.MOVIE_ID, SHOW_TIME
    INTO next_movieid, next_movie_start_time
    FROM TM
    WHERE THEATER_ID = NEW.THEATER_ID
        AND SCREEN_ID = NEW.SCREEN_ID
        AND SHOW_DATE = NEW.SHOW_DATE
        AND SHOW_TIME > NEW.SHOW_TIME
    ORDER BY SHOW_TIME ASC
    LIMIT 1;

    SET prev_run_time = MAKETIME(CEIL((SELECT RUN_TIME FROM MOVIES WHERE MOVIE_ID = prev_movieid) / 60), 0, 0);
    SET prev_movie_end_time = ADDTIME(prev_movie_start_time, prev_run_time);
    
    SET new_run_time = MAKETIME(CEIL((SELECT RUN_TIME FROM MOVIES WHERE MOVIE_ID = NEW.MOVIE_ID) / 60), 0, 0);
    SET new_movie_start_time = NEW.SHOW_TIME;
    SET new_movie_end_time = ADDTIME(new_movie_start_time, new_run_time);

    SET next_run_time = MAKETIME(CEIL((SELECT RUN_TIME FROM MOVIES WHERE MOVIE_ID = next_movieid) / 60), 0, 0);
    SET next_movie_end_time = ADDTIME(next_movie_start_time, next_run_time);

    SET time_diff_before = TIMEDIFF(new_movie_start_time, prev_movie_end_time);
    SET time_diff_after = TIMEDIFF(next_movie_start_time, new_movie_end_time);

    IF (time_diff_before < '01:00:00') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TIME GAP BETWEEN 2 SCREENINGS SHOULD BE ATLEAST 1 HOUR AFTER THE MOVIE ENDS.';
    END IF;

    IF (time_diff_after < '01:00:00') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TIME GAP BETWEEN 2 SCREENINGS SHOULD BE ATLEAST 1 HOUR AFTER THE MOVIE ENDS.';
    END IF;

    IF (time_diff_before = '00:00:00') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ANOTHER MOVIE IS SCREENED ENDS.';
    END IF;

    IF (time_diff_after = '00:00:00') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ANOTHER MOVIE IS SCREENED.';
    END IF;
    
END//

DELIMITER ;



--TO NOT ADD 2 MOVIES AT SAME SCREEN, TIME, DATE, THEATER
DELIMITER //
CREATE TRIGGER prevent_duplicate_movie
BEFORE INSERT ON TM
FOR EACH ROW
BEGIN
    DECLARE existing_movie_count INT;

    SELECT COUNT(*)
    INTO existing_movie_count
    FROM TM
    WHERE THEATER_ID = NEW.THEATER_ID
    AND SCREEN_ID = NEW.SCREEN_ID
    AND SHOW_DATE = NEW.SHOW_DATE
    AND SHOW_TIME = NEW.SHOW_TIME;

    IF existing_movie_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot insert. Another movie is scheduled for the same theater, screen, date, and time.';
    END IF;
END //
DELIMITER ;


--TO AUTO INCREMENT BOOKING ID (DOESN'T INCREASES EVEN IF ERROR OCCURS)
DELIMITER //
CREATE TRIGGER set_booking_id BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE last_id INT;

    SELECT MAX(booking_id) INTO last_id FROM bookings;

    IF last_id IS NULL THEN
        SET NEW.booking_id = 1;
    ELSE
        SET NEW.booking_id = last_id + 1;
    END IF;
END //
DELIMITER ;


--TO INCREEMT USER ID
DELIMITER //
CREATE TRIGGER set_user_id BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    DECLARE last_id INT;

    SELECT MAX(user_id) INTO last_id FROM users;

    IF last_id IS NULL THEN
        SET NEW.user_id = 1;
    ELSE
        SET NEW.user_id = last_id + 1;
    END IF;
END //
DELIMITER ;



--PROCEDURE TO DELETE THEATER IF MOVIE IS NOT SCREENED
DELIMITER //
CREATE PROCEDURE DELETE_THEATER (IN theater_id_param INT)
BEGIN
    DECLARE screens_exist INT;

    SELECT COUNT(*) INTO screens_exist FROM SCREENS WHERE THEATER_ID = theater_id_param;

    IF screens_exist > 0 THEN
        BEGIN
            DELETE FROM SCREENS WHERE THEATER_ID = theater_id_param;
        END;
    END IF;

    DELETE FROM THEATERS WHERE THEATER_ID = theater_id_param;
END //
DELIMITER ;


--FUNCTION TO RETURN REVENUE OF EACH THEATER
DELIMITER //

CREATE OR REPLACE FUNCTION calculate_theater_revenue(theater_id_param INT)
RETURNS DECIMAL(10, 2)
BEGIN
    DECLARE elite_total DECIMAL(10, 2);
    DECLARE premium_total DECIMAL(10, 2);
    DECLARE total DECIMAL(10, 2);

    -- Calculate total price for elite seats 
    SELECT COALESCE(SUM(no_of_elite_seats) * 150, 0) INTO elite_total
    FROM BOOKINGS
    WHERE theater_id = theater_id_param;

    -- Calculate total price for premium seats
    SELECT COALESCE(SUM(no_of_premium_seats) * 190, 0) INTO premium_total
    FROM BOOKINGS
    WHERE theater_id = theater_id_param;

    -- Add total price for elite and premium seats
    SET total = elite_total + premium_total;

    -- Return the total price
    RETURN total;
END //

DELIMITER ;

--FUNCTION TO RETURN REVENUE OF EACH MOVIE
DELIMITER //

CREATE OR REPLACE FUNCTION calculate_movie_revenue(movie_id_param INT) RETURNS DECIMAL(10, 2)
BEGIN
    DECLARE total_revenue_1 DECIMAL(10, 2);
    DECLARE total_revenue_2 DECIMAL(10, 2);
    DECLARE total_revenue DECIMAL(10, 2);
    
    -- Calculate revenue for elite seats
    SELECT COALESCE(SUM(no_of_elite_seats) * 150, 0) INTO total_revenue_1
    FROM BOOKINGS
    WHERE movie_id = movie_id_param;

    -- Add revenue for premium seats
    SELECT COALESCE(SUM(no_of_premium_seats) * 190, 0) INTO total_revenue_2
    FROM BOOKINGS
    WHERE movie_id = movie_id_param;

    -- Calculate total revenue
    SET total_revenue = total_revenue_1 + total_revenue_2;

    -- Return the total revenue for the movie
    RETURN total_revenue;
END //

DELIMITER ;



--CURSOR TO CALCULATE ACTIVE USERS
DELIMITER //

CREATE OR REPLACE PROCEDURE active_users()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE user_count INT DEFAULT 0;
    DECLARE user_id_current INT;

    DECLARE user_cursor CURSOR FOR
        SELECT DISTINCT user_id FROM BOOKINGS;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN user_cursor;

    read_loop: LOOP
        FETCH user_cursor INTO user_id_current;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET user_count = user_count + 1;
    END LOOP;

    CLOSE user_cursor;

    SELECT CONCAT('Total active users: ', user_count) AS user_count;
END//

DELIMITER ;

--CURSOR TO CALCULATE TOTAL MOVIES
DELIMITER //

CREATE OR REPLACE PROCEDURE calculate_movie_count()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE movie_count INT DEFAULT 0;
    DECLARE movie_id_current INT;

    DECLARE movie_cursor CURSOR FOR
        SELECT movie_id FROM MOVIES;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN movie_cursor;

    read_movie_loop: LOOP
        FETCH movie_cursor INTO movie_id_current;
        IF done THEN
            LEAVE read_movie_loop;
        END IF;
        SET movie_count = movie_count + 1;
    END LOOP;

    CLOSE movie_cursor;

    SELECT movie_count;
END//

DELIMITER ;

--CURSOR TO CALCULATE TOTAL THEATERS
DELIMITER //

CREATE OR REPLACE PROCEDURE calculate_theater_count()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE theater_count INT DEFAULT 0;
    DECLARE theater_id_current INT;

    DECLARE theater_cursor CURSOR FOR
        SELECT theater_id FROM THEATERS;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN theater_cursor;

    read_theater_loop: LOOP
        FETCH theater_cursor INTO theater_id_current;
        IF done THEN
            LEAVE read_theater_loop;
        END IF;
        SET theater_count = theater_count + 1;
    END LOOP;

    CLOSE theater_cursor;

    SELECT theater_count;
END//

DELIMITER ;
