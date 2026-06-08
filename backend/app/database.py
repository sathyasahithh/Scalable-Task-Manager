import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse, unquote
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

def init_postgres_db():
    """
    Automated check to create the target PostgreSQL database if it does not exist.
    Returns True on success, False if connection fails.
    """
    if not settings.DATABASE_URL.startswith("postgresql"):
        return False
        
    try:
        result = urlparse(settings.DATABASE_URL)
        username = unquote(result.username) if result.username else None
        password = unquote(result.password) if result.password else None
        database = result.path[1:]
        hostname = result.hostname
        port = result.port or 5432
        
        # Connect to default 'postgres' system DB to run CREATE DATABASE
        con = psycopg2.connect(
            dbname='postgres',
            user=username,
            password=password,
            host=hostname,
            port=port,
            connect_timeout=3
        )
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = con.cursor()
        
        # Check database catalog
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (database,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(f'CREATE DATABASE "{database}"')
            
        cursor.close()
        con.close()
        return True
    except Exception as e:
        print(f"PostgreSQL database connection/creation failed: {e}")
        return False

# Configure DB Engine with SQLite fallback capability
engine = None
use_sqlite = False

if settings.DATABASE_URL.startswith("postgresql"):
    # Bootstrap postgres database first
    postgres_init_success = init_postgres_db()
    if postgres_init_success:
        try:
            engine = create_engine(settings.DATABASE_URL)
            # Verify the connection directly
            with engine.connect() as conn:
                pass
            print("Successfully connected to PostgreSQL database.")
        except Exception as e:
            print(f"PostgreSQL connection validation failed: {e}")
            use_sqlite = True
    else:
        use_sqlite = True
else:
    use_sqlite = True

if use_sqlite:
    sqlite_fallback_url = "sqlite:///./task_manager.db"
    print(f"Falling back to local SQLite database: {sqlite_fallback_url}")
    engine = create_engine(
        sqlite_fallback_url, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
