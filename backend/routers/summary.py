"""
Dashboard özet ve istatistik endpoint'leri
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

from backend.database import get_db
from backend.models import Transaction, Category, User
from backend.routers.auth import get_current_user

router = APIRouter()


@router.get("/dashboard")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dashboard için tüm özet verileri tek seferde döner"""
    today = date.today()
    current_year = str(today.year)
    current_month = f"{today.month:02d}"

    # ─── Bu ayın gelir/gider toplamları ──────────────
    this_month_income = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        func.strftime("%Y", Transaction.transaction_date) == current_year,
        func.strftime("%m", Transaction.transaction_date) == current_month,
    ).scalar()

    this_month_expense = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        func.strftime("%Y", Transaction.transaction_date) == current_year,
        func.strftime("%m", Transaction.transaction_date) == current_month,
    ).scalar()

    net_savings = this_month_income - this_month_expense
    savings_rate = (net_savings / this_month_income) if this_month_income > 0 else 0

    # ─── Kümülatif (Tüm Zamanlar) Toplam Birikim ─────
    total_income_all = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income"
    ).scalar()

    total_expense_all = db.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense"
    ).scalar()

    cumulative_savings = total_income_all - total_expense_all

    # ─── Son 6 ay gelir/gider (çubuk grafik) ────────
    monthly_data = []
    for i in range(5, -1, -1):
        d = today - relativedelta(months=i)
        y = str(d.year)
        m = f"{d.month:02d}"

        income = db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            func.strftime("%Y", Transaction.transaction_date) == y,
            func.strftime("%m", Transaction.transaction_date) == m,
        ).scalar()

        expense = db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.strftime("%Y", Transaction.transaction_date) == y,
            func.strftime("%m", Transaction.transaction_date) == m,
        ).scalar()

        month_names = [
            "", "Oca", "Sub", "Mar", "Nis", "May", "Haz",
            "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"
        ]

        monthly_data.append({
            "label": f"{month_names[d.month]} {d.year}",
            "income": round(float(income), 2),
            "expense": round(float(expense), 2),
        })

    # ─── Bu ayın kategori bazlı gider dağılımı (pasta grafik) ────
    category_expenses = db.query(
        Category.name,
        Category.icon,
        Category.color,
        func.sum(Transaction.amount).label("total")
    ).join(
        Transaction, Transaction.category_id == Category.id
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        func.strftime("%Y", Transaction.transaction_date) == current_year,
        func.strftime("%m", Transaction.transaction_date) == current_month,
    ).group_by(Category.id).order_by(func.sum(Transaction.amount).desc()).all()

    expense_by_category = [
        {
            "name": ce.name,
            "icon": ce.icon,
            "color": ce.color,
            "total": round(float(ce.total), 2),
        }
        for ce in category_expenses
    ]

    # ─── Son 12 ay birikim oranları (çizgi grafik) ───
    savings_trend = []
    for i in range(11, -1, -1):
        d = today - relativedelta(months=i)
        y = str(d.year)
        m = f"{d.month:02d}"

        inc = db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            func.strftime("%Y", Transaction.transaction_date) == y,
            func.strftime("%m", Transaction.transaction_date) == m,
        ).scalar()

        exp = db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.strftime("%Y", Transaction.transaction_date) == y,
            func.strftime("%m", Transaction.transaction_date) == m,
        ).scalar()

        rate = ((float(inc) - float(exp)) / float(inc) * 100) if float(inc) > 0 else 0

        month_names = [
            "", "Oca", "Sub", "Mar", "Nis", "May", "Haz",
            "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"
        ]

        savings_trend.append({
            "label": f"{month_names[d.month]} {d.year}",
            "rate": round(rate, 1),
        })

    # ─── Son 10 işlem ────────────────────────────────
    recent_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc()).limit(10).all()

    recent_list = []
    for t in recent_transactions:
        cat = db.query(Category).filter(Category.id == t.category_id).first()
        recent_list.append({
            "id": t.id,
            "type": t.type,
            "amount": t.amount,
            "description": t.description,
            "transaction_date": str(t.transaction_date),
            "category_name": cat.name if cat else "",
            "category_icon": cat.icon if cat else "",
            "category_color": cat.color if cat else "",
        })

    return {
        "this_month": {
            "income": round(float(this_month_income), 2),
            "expense": round(float(this_month_expense), 2),
            "net_savings": round(float(net_savings), 2),
            "savings_rate": round(float(savings_rate), 4),
            "cumulative_savings": round(float(cumulative_savings), 2),
        },
        "monthly_chart": monthly_data,
        "expense_by_category": expense_by_category,
        "savings_trend": savings_trend,
        "recent_transactions": recent_list,
    }
