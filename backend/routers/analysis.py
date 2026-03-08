"""
Analiz endpoint'leri: Yıllık ısı haritası, karşılaştırmalı aylar ve kategori trendleri
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime

from backend.database import get_db
from backend.models import Transaction, Category, User
from backend.routers.auth import get_current_user

router = APIRouter()

@router.get("/yearly/{year}")
def get_yearly_analysis(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Belirli bir yılın tüm ayları için gelir, gider ve net bakiye (Isı haritası verisi)"""
    monthly_stats = []
    
    # Tüm yıl boyunca ayları 1'den 12'ye kadar döngüye al
    for month in range(1, 13):
        income = db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month,
        ).scalar()

        expense = db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month,
        ).scalar()
        
        income = float(income)
        expense = float(expense)
        net = income - expense
        
        # Heatmap rengi (0-1 arası normalize edilebilir veya backend doğrudan durum dönebilir)
        # Çok iyi: Net > 0 ve Oran yüksek vs... Basitçe pozitif iyi, negatif kötü
        
        status = "neutral"
        if net > 0:
            status = "positive"
        elif net < 0:
            status = "negative"

        monthly_stats.append({
            "month": month,
            "income": round(income, 2),
            "expense": round(expense, 2),
            "net": round(net, 2),
            "status": status
        })
        
    return {"year": year, "data": monthly_stats}

@router.get("/compare")
def compare_periods(
    m1: int, y1: int,
    m2: int, y2: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """İki dönemin gelir/gider verilerini ve kategori bazlı farklılıklarını kıyaslar"""
    
    def get_period_data(month, year):
        inc = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month
        ).scalar()
        
        exp = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month
        ).scalar()
        
        cat_exp = db.query(
            Category.name,
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        ).join(Transaction, Transaction.category_id == Category.id).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            extract('year', Transaction.transaction_date) == year,
            extract('month', Transaction.transaction_date) == month
        ).group_by(Category.name).all()
        
        categories = [{"name": c[0], "amount": float(c[1])} for c in cat_exp]
        
        return {
            "period": f"{month:02d}/{year}",
            "income": float(inc),
            "expense": float(exp),
            "net": float(inc) - float(exp),
            "categories": sorted(categories, key=lambda x: x["amount"], reverse=True)
        }
        
    p1_data = get_period_data(m1, y1)
    p2_data = get_period_data(m2, y2)
    
    return {"period1": p1_data, "period2": p2_data}
