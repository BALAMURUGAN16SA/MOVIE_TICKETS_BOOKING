--IF DUAL SCREENING FOR SAME SCREEN AT SAME TIME
DELIMITER //

CREATE OR REPLACE TRIGGER before_tm_insert
BEFORE INSERT ON TM FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;

    -- Count the number of conflicting records
    SELECT COUNT(*) INTO conflict_count
    FROM TM
    WHERE THEATER_ID = NEW.THEATER_ID
    AND SCREEN_ID = NEW.SCREEN_ID
    AND SHOW_DATE = NEW.SHOW_DATE
    AND SHOW_TIME = NEW.SHOW_TIME;

    -- Check if there is a conflict
    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Another movie is already scheduled for the same screen at the same date and time.';
    END IF;
END//

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


--TO DELETE ALL RESERVED MOVIES FROM TM

DELIMITER //

CREATE OR REPLACE TRIGGER before_movies_delete
BEFORE DELETE ON movies FOR EACH ROW
BEGIN
    DELETE FROM TM WHERE MOVIE_ID = OLD.MOVIE_ID;
END //

DELIMITER ;


SELECT MOVIES.MOVIE_ID, MOVIES.MOVIE_NAME, MOVIES.GENRE, MOVIES.RATING, MOVIES.DESCRIPTION, MOVIES.URL, MOVIES.RUN_TIME,  
GROUP_CONCAT(TM.SCREEN_ID SEPARATOR ', ') AS Screens,
GROUP_CONCAT(TM.SHOW_TIME SEPARATOR ', ') AS Times
FROM MOVIES
JOIN TM ON TM.MOVIE_ID = MOVIES.MOVIE_ID
JOIN THEATERS ON TM.THEATER_ID = THEATERS.THEATER_ID
WHERE THEATERS.THEATER_ID = 1
GROUP BY MOVIES.MOVIE_ID;


-- USER_ID
BEGIN
DECLARE last_id INT;


SELECT MAX(user_id) INTO last_id FROM users;


IF last_id IS NULL THEN
    SET NEW.user_id = 1;
ELSE
    SET NEW.user_id = last_id + 1;
END IF;
END