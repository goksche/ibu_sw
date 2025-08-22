import sqlite3
import os

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
DB_PATH = os.path.join(DB_DIR, 'ibu.sqlite')

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dummy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                info TEXT
            )
        """)
        conn.commit()
