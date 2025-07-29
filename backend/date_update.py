import psycopg2
from datetime import datetime, timedelta
import pytz
import db

def update_show_dates_to_today():
    try:
        con, cur = db.db_connect()

        # Get current time in IST
        ist = pytz.timezone('Asia/Kolkata')
        ist_now = datetime.now(ist)
        ist_tomorrow = ist_now.date() + timedelta(days=1)

        update_query = """
        UPDATE shows
        SET show_date = %s
        """
        cur.execute(update_query, (ist_tomorrow, ))

        con.commit()
        print(f"Show dates updated to {ist_tomorrow} successfully.")

        cur.close()

    except Exception as e:
        print(f"Error updating show dates: {e}")

    finally:
        if con is not None:
            con.close()

if __name__ == "__main__":
    update_show_dates_to_today()
