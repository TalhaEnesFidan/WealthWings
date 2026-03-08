"""
Borç yönetimi endpoint'leri
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import date, datetime

from backend.database import get_db
from backend.models import Debt, DebtPayment, User
from backend.schemas import (
    DebtCreate, DebtUpdate, DebtResponse,
    DebtPaymentCreate, DebtPaymentResponse,
    MessageResponse,
)
from backend.routers.auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[DebtResponse])
def list_debts(
    include_paid: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borçları listele"""
    query = db.query(Debt).filter(Debt.user_id == current_user.id)
    if not include_paid:
        query = query.filter(Debt.is_paid == False)
    return query.order_by(Debt.created_at.desc()).all()


@router.post("", response_model=DebtResponse)
def create_debt(
    debt_data: DebtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Yeni borç ekle"""
    new_debt = Debt(
        user_id=current_user.id,
        title=debt_data.title,
        total_amount=debt_data.total_amount,
        remaining=debt_data.total_amount,  # Başlangıçta kalan = toplam
        description=debt_data.description,
        due_date=debt_data.due_date,
    )
    db.add(new_debt)
    db.commit()
    db.refresh(new_debt)
    return new_debt


@router.put("/{debt_id}", response_model=DebtResponse)
def update_debt(
    debt_id: int,
    debt_data: DebtUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borç bilgisini güncelle"""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id,
    ).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Borç bulunamadı")

    if debt_data.title is not None:
        debt.title = debt_data.title
    if debt_data.description is not None:
        debt.description = debt_data.description
    if debt_data.due_date is not None:
        debt.due_date = debt_data.due_date

    debt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}", response_model=MessageResponse)
def delete_debt(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borç sil"""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id,
    ).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Borç bulunamadı")

    # Önce ödeme geçmişini sil
    db.query(DebtPayment).filter(DebtPayment.debt_id == debt_id).delete()
    db.delete(debt)
    db.commit()
    return {"message": "Borç silindi"}


@router.post("/{debt_id}/pay", response_model=DebtResponse)
def pay_debt(
    debt_id: int,
    payment_data: DebtPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borca ödeme yap"""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id,
    ).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Borç bulunamadı")

    if debt.is_paid:
        raise HTTPException(status_code=400, detail="Bu borç zaten tamamen ödenmiş")

    if payment_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Ödeme miktarı sıfırdan büyük olmalı")

    if payment_data.amount > debt.remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Ödeme miktarı ({payment_data.amount}) kalan borçtan ({debt.remaining}) fazla olamaz",
        )

    # Ödeme kaydı oluştur
    payment = DebtPayment(
        debt_id=debt_id,
        user_id=current_user.id,
        amount=payment_data.amount,
        note=payment_data.note,
        paid_at=payment_data.paid_at,
    )
    db.add(payment)

    # Kalan borcu güncelle
    debt.remaining -= payment_data.amount
    debt.updated_at = datetime.utcnow()

    # Tamamen ödendi mi?
    if debt.remaining <= 0:
        debt.remaining = 0
        debt.is_paid = True

    db.commit()
    db.refresh(debt)
    return debt


@router.get("/{debt_id}/payments", response_model=List[DebtPaymentResponse])
def get_debt_payments(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borcun ödeme geçmişi"""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id,
    ).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Borç bulunamadı")

    return db.query(DebtPayment).filter(
        DebtPayment.debt_id == debt_id
    ).order_by(DebtPayment.paid_at.desc()).all()


@router.get("/summary/all")
def get_debt_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borç özet istatistikleri"""
    # Aktif borçlar
    active_debts = db.query(Debt).filter(
        Debt.user_id == current_user.id,
        Debt.is_paid == False,
    ).all()

    # Tamamlanan borçlar
    paid_debts = db.query(Debt).filter(
        Debt.user_id == current_user.id,
        Debt.is_paid == True,
    ).all()

    total_remaining = sum(d.remaining for d in active_debts)
    total_original = sum(d.total_amount for d in active_debts)

    # Bu ayki ödemeler
    now = datetime.now()
    monthly_payments = db.query(func.sum(DebtPayment.amount)).filter(
        DebtPayment.user_id == current_user.id,
        extract("year", DebtPayment.paid_at) == now.year,
        extract("month", DebtPayment.paid_at) == now.month,
    ).scalar() or 0.0

    # Vadesi geçmiş borçlar
    today = date.today()
    overdue_count = sum(
        1 for d in active_debts
        if d.due_date and d.due_date < today
    )

    return {
        "total_remaining": total_remaining,
        "total_original": total_original,
        "total_paid_amount": total_original - total_remaining,
        "active_count": len(active_debts),
        "paid_count": len(paid_debts),
        "overdue_count": overdue_count,
        "monthly_payments": monthly_payments,
        "active_debts": [
            {
                "id": d.id,
                "title": d.title,
                "total_amount": d.total_amount,
                "remaining": d.remaining,
                "paid_pct": round((1 - d.remaining / d.total_amount) * 100, 1) if d.total_amount > 0 else 0,
                "due_date": d.due_date.isoformat() if d.due_date else None,
                "is_overdue": bool(d.due_date and d.due_date < today),
            }
            for d in active_debts
        ],
    }
