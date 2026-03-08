"""
FastAPI uygulama giriş noktası
"""
import sys
import os

# Proje kök dizinini sys.path'e ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.database import create_tables
from backend.routers import auth, transactions, categories, summary, savings, debts, analysis, export

app = FastAPI(title="WealthWings - Finans & Birikim Uygulamasi")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router'ları
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(summary.router, prefix="/api/summary", tags=["Summary"])
app.include_router(savings.router, prefix="/api/savings", tags=["Savings"])
app.include_router(debts.router, prefix="/api/debts", tags=["Debts"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


# Başlangıç ayarları
@app.on_event("startup")
def on_startup():
    create_tables()
    print("[OK] Veritabani tablolari olusturuldu")
    print("[>>] WealthWings calisiyor: http://localhost:8000")


# Frontend statik dosyaları — en sona eklenmeli
FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend"
)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
