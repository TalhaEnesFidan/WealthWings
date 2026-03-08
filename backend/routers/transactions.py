"""
Gelir/Gider işlem endpoint'leri — CRUD + filtreleme + özetler
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import Optional, List
from datetime import date, datetime, timedelta

from backend.database import get_db
from backend.models import Transaction, Category
from backend.schemas import (
    TransactionCreate, TransactionUpdate, TransactionResponse, MessageResponse
)
from backend.routers.auth import get_current_user
from backend.models import User

router = APIRouter()


# ─── Yardımcı Fonksiyonlar ───────────────────────────────

def transaction_to_response(t: Transaction, category: Category = None) -> dict:
    """Transaction nesnesini response dict'e çevir"""
    return {
        "id": t.id,
        "user_id": t.user_id,
        "category_id": t.category_id,
        "type": t.type,
        "amount": t.amount,
        "description": t.description,
        "note": t.note,
        "transaction_date": t.transaction_date,
        "created_at": t.created_at,
        "category_name": category.name if category else None,
        "category_icon": category.icon if category else None,
        "category_color": category.color if category else None,
    }


# ─── CRUD Endpoint'leri ──────────────────────────────────

@router.get("")
def get_transactions(
    type: Optional[str] = None,
    category_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    sort_by: str = "transaction_date",
    sort_order: str = "desc",
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tüm işlemleri listele (filtreleme destekli)"""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    # Filtreler
    if type and type in ("income", "expense"):
        query = query.filter(Transaction.type == type)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))

    # Toplam sayı
    total = query.count()

    # Sıralama
    sort_column = getattr(Transaction, sort_by, Transaction.transaction_date)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc(), Transaction.id.asc())
    else:
        query = query.order_by(sort_column.desc(), Transaction.id.desc())

    transactions = query.offset(offset).limit(limit).all()

    # Kategori bilgilerini ekle
    category_cache = {}
    results = []
    for t in transactions:
        if t.category_id not in category_cache:
            cat = db.query(Category).filter(Category.id == t.category_id).first()
            category_cache[t.category_id] = cat
        results.append(transaction_to_response(t, category_cache.get(t.category_id)))

    return {"transactions": results, "total": total}


@router.post("")
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Yeni işlem ekle"""
    # Kategori kontrolü
    category = db.query(Category).filter(
        Category.id == data.category_id,
        Category.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadi")

    transaction = Transaction(
        user_id=current_user.id,
        category_id=data.category_id,
        type=data.type,
        amount=data.amount,
        description=data.description,
        note=data.note,
        transaction_date=data.transaction_date,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction_to_response(transaction, category)


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """İşlem güncelle"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Islem bulunamadi")

    if data.category_id is not None:
        transaction.category_id = data.category_id
    if data.type is not None:
        transaction.type = data.type
    if data.amount is not None:
        transaction.amount = data.amount
    if data.description is not None:
        transaction.description = data.description
    if data.note is not None:
        transaction.note = data.note
    if data.transaction_date is not None:
        transaction.transaction_date = data.transaction_date

    db.commit()
    db.refresh(transaction)

    category = db.query(Category).filter(Category.id == transaction.category_id).first()
    return transaction_to_response(transaction, category)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """İşlem sil"""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Islem bulunamadi")

    db.delete(transaction)
    db.commit()
    return {"message": "Islem silindi"}


# ─── Özet Endpoint'leri ──────────────────────────────────

@router.get("/summary/monthly")
def get_monthly_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aylık gelir/gider özeti"""
    today = date.today()
    y = year or today.year
    m = month or today.month

    income = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        func.strftime("%Y", Transaction.transaction_date) == str(y),
        func.strftime("%m", Transaction.transaction_date) == f"{m:02d}",
    ).scalar()

    expense = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        func.strftime("%Y", Transaction.transaction_date) == str(y),
        func.strftime("%m", Transaction.transaction_date) == f"{m:02d}",
    ).scalar()

    net = income - expense
    rate = (net / income) if income > 0 else 0

    return {
        "year": y,
        "month": m,
        "total_income": round(income, 2),
        "total_expense": round(expense, 2),
        "net_savings": round(net, 2),
        "savings_rate": round(rate, 4),
    }
