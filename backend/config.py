import os
# user="postgres"
# password="Yellow123*"
# dbname="imtbs"
# host="localhost"
# port=5432
jwt_secret_key = os.getenv("JWT_SECRET_KEY")
jwt_refresh_key = os.getenv("JWT_REFRESH_KEY")
