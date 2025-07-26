import psycopg2
from datetime import date, timedelta
import db
def update_show_dates_to_today():
    try:
        con, cur = db.db_connect()

        update_query = """
        UPDATE shows
        SET show_date = %s
        """
        today  = date.today() + timedelta(days=5)
        cur.execute(update_query, (today, ))

        con.commit()
        print(f"Show dates updated to {today} successfully.")

        cur.close()

    except Exception as e:
        print(f"Error updating show dates: {e}")

    finally:
        if con is not None:
            con.close()

if __name__ == "__main__":
    update_show_dates_to_today()
