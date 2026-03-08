"""
Birikim oranı, hedef ve skorkart endpoint'leri
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime

from backend.database import get_db
from backend.models import Transaction, SavingsGoal, MonthlySummary, User
from backend.schemas import SavingsGoalCreate, SavingsGoalResponse, MessageResponse
from backend.routers.auth import get_current_user

router = APIRouter()


def _calculate_savings_for_month(db: Session, user_id: int, year: int, month: int) -> dict:
    """Belirli bir ay için birikim oranını hesapla"""
    result = db.query(
        func.sum(Transaction.amount).filter(Transaction.type == "income").label("total_income"),
        func.sum(Transaction.amount).filter(Transaction.type == "expense").label("total_expense"),
    ).filter(
        Transaction.user_id == user_id,
        extract("year", Transaction.transaction_date) == year,
        extract("month", Transaction.transaction_date) == month,
    ).one()

    total_income = result.total_income or 0.0
    total_expense = result.total_expense or 0.0
    net_savings = total_income - total_expense
    savings_rate = (net_savings / total_income) if total_income > 0 else 0.0

    return {
        "year": year,
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": net_savings,
        "savings_rate": savings_rate,
    }


def _get_badge(savings_rate: float) -> dict:
    """Birikim oranına göre rozet döndür"""
    rate_pct = savings_rate * 100
    if rate_pct >= 70:
        return {"badge": "gold", "label": "Altın", "emoji": "🥇"}
    elif rate_pct >= 50:
        return {"badge": "silver", "label": "Gümüş", "emoji": "🥈"}
    elif rate_pct >= 30:
        return {"badge": "bronze", "label": "Bronz", "emoji": "🥉"}
    else:
        return {"badge": "critical", "label": "Kritik", "emoji": "🔴"}


@router.get("/rate/{year}/{month}")
def get_savings_rate(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Belirli bir ay için birikim oranı bilgisi"""
    data = _calculate_savings_for_month(db, current_user.id, year, month)

    # O aya ait hedef var mı?
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id,
        SavingsGoal.year == year,
        SavingsGoal.month == month,
        SavingsGoal.is_active == True,
    ).first()

    goal_rate = goal.target_rate if goal else None
    goal_met = None
    if goal_rate is not None:
        goal_met = data["savings_rate"] >= goal_rate

    badge = _get_badge(data["savings_rate"])

    # Motivasyon mesajı
    motivation = ""
    if goal_met is True:
        if data["savings_rate"] >= 0.7:
            motivation = "Bu senin en yüksek birikim dönemlerinden biri! 🏆"
        else:
            motivation = "Harika! Bu ay hedefini başarıyla aştın! 🎉"
    elif goal_met is False:
        diff = (goal_rate - data["savings_rate"]) * 100
        motivation = f"Bu ay hedefine %{diff:.1f} eksik kaldın. Gelecek ay dene! 💪"
    else:
        motivation = f"Bu ay %{data['savings_rate']*100:.1f} biriktirdin. Harika iş!"

    return {
        **data,
        "savings_rate_pct": round(data["savings_rate"] * 100, 2),
        "goal_rate": goal_rate,
        "goal_rate_pct": round(goal_rate * 100, 2) if goal_rate else None,
        "goal_met": goal_met,
        "badge": badge,
        "motivation": motivation,
    }


@router.get("/history")
def get_savings_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tüm aylık birikim geçmişi"""
    # Kullanıcının işlem yaptığı ay-yılları bul
    months = db.query(
        extract("year", Transaction.transaction_date).label("year"),
        extract("month", Transaction.transaction_date).label("month"),
    ).filter(
        Transaction.user_id == current_user.id
    ).distinct().order_by(
        extract("year", Transaction.transaction_date),
        extract("month", Transaction.transaction_date),
    ).all()

    history = []
    for row in months:
        year, month = int(row.year), int(row.month)
        data = _calculate_savings_for_month(db, current_user.id, year, month)

        goal = db.query(SavingsGoal).filter(
            SavingsGoal.user_id == current_user.id,
            SavingsGoal.year == year,
            SavingsGoal.month == month,
            SavingsGoal.is_active == True,
        ).first()

        goal_rate = goal.target_rate if goal else None
        goal_met = (data["savings_rate"] >= goal_rate) if goal_rate else None
        badge = _get_badge(data["savings_rate"])

        history.append({
            **data,
            "savings_rate_pct": round(data["savings_rate"] * 100, 2),
            "goal_rate": goal_rate,
            "goal_rate_pct": round(goal_rate * 100, 2) if goal_rate else None,
            "goal_met": goal_met,
            "badge": badge,
        })

    return history


@router.get("/scorecard")
def get_scorecard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Skorkart — tüm aylık verilerle birlikte istatistikler"""
    history = get_savings_history(db=db, current_user=current_user)

    # Kümülatif (Tüm Zamanlar) Toplam Birikim hesapla (Her durumda gerekli)
    total_inc = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(Transaction.user_id == current_user.id, Transaction.type == "income").scalar()

    total_exp = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(Transaction.user_id == current_user.id, Transaction.type == "expense").scalar()

    overall_savings = float(total_inc) - float(total_exp)

    if not history:
        return {
            "history": [],
            "stats": {
                "avg_rate": 0,
                "best_month": None,
                "worst_month": None,
                "total_net_savings": 0,
                "overall_savings": round(overall_savings, 2),
                "goal_streak": 0,
            },
            "suggestion": None,
        }

    avg_rate = sum(h["savings_rate"] for h in history) / len(history)
    best = max(history, key=lambda x: x["savings_rate"])
    worst = min(history, key=lambda x: x["savings_rate"])
    total_net = sum(h["net_savings"] for h in history)

    # Üst üste hedef tutturma serisi (en son seriden geriye doğru)
    streak = 0
    for h in reversed(history):
        if h["goal_met"] is True:
            streak += 1
        else:
            break

    # Öneri: son ayın oranına göre
    last = history[-1]
    suggestion_rate = min(last["savings_rate"] + 0.07, 0.95)  # +7%
    month_names = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                   "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
    suggestion = (
        f"Geçen ay %{last['savings_rate']*100:.0f} biriktirdin. "
        f"Bu ay en az %{suggestion_rate*100:.0f} hedefle! 🎯"
    ) if len(history) > 0 else None

    # overall_savings yukarida hesaplandı

    return {
        "history": history,
        "stats": {
            "avg_rate": round(avg_rate * 100, 2),
            "best_month": {**best, "month_name": month_names[best["month"]]},
            "worst_month": {**worst, "month_name": month_names[worst["month"]]},
            "total_net_savings": round(total_net, 2),
            "overall_savings": round(overall_savings, 2),
            "goal_streak": streak,
        },
        "suggestion": suggestion,
        "suggested_rate": round(suggestion_rate * 100, 0),
    }


@router.post("/goal", response_model=SavingsGoalResponse)
def set_savings_goal(
    goal_data: SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aylık birikim hedefi belirle veya güncelle"""
    # Mevcut hedefi pasif yap
    existing = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id,
        SavingsGoal.year == goal_data.year,
        SavingsGoal.month == goal_data.month,
        SavingsGoal.is_active == True,
    ).first()

    if existing:
        existing.target_rate = goal_data.target_rate
        existing.title = goal_data.title
        db.commit()
        db.refresh(existing)
        return existing

    new_goal = SavingsGoal(
        user_id=current_user.id,
        title=goal_data.title,
        target_rate=goal_data.target_rate,
        month=goal_data.month,
        year=goal_data.year,
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal


@router.get("/goals", response_model=List[SavingsGoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tüm birikim hedefleri"""
    return db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id,
        SavingsGoal.is_active == True,
    ).order_by(SavingsGoal.year.desc(), SavingsGoal.month.desc()).all()
