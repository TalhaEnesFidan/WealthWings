"""
SQLite veritabanı bağlantısı ve session yönetimi
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Proje kök dizini
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Çevre değişkeninden veritabanı URL'sini al, yoksa lokal SQLite kullan.
# Vercel'deki PostgreSQL URL'si şu formatta olacak: postgresql://user:pass@host/db
ENV_DATABASE_URL = os.environ.get("DATABASE_URL")

if ENV_DATABASE_URL:
    # Bulut (Vercel / Postgres) Bağlantısı
    # Eğer postgres:// ile başlıyorsa sqlalchemy için postgresql:// yapmalıyız
    if ENV_DATABASE_URL.startswith("postgres://"):
        ENV_DATABASE_URL = ENV_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    DATABASE_URL = ENV_DATABASE_URL
    # PostgreSQL'de check_same_thread parametresi geçersizdir.
    engine = create_engine(DATABASE_URL)
else:
    # Yerel (Bilgisayar) Bağlantısı (Hiçbir veri kaybolmaz)
    DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'finans.db')}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Veritabanı oturumu dependency injection"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Tüm tabloları oluştur"""
    from backend import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
