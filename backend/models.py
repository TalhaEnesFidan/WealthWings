"""
SQLAlchemy veritabanı modelleri
"""
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.sql import func
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False, unique=True)
    email = Column(String, unique=True)
    password = Column(String, nullable=False)
    full_name = Column(String)
    currency = Column(String, default="TRY")
    language = Column(String, default="tr")
    theme = Column(String, default="light")
    created_at = Column(DateTime, server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)       # 'income' veya 'expense'
    icon = Column(String)                        # Emoji
    color = Column(String)                       # Hex renk kodu
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    type = Column(String, nullable=False)        # 'income' veya 'expense'
    amount = Column(Float, nullable=False)
    description = Column(Text)
    note = Column(Text)
    transaction_date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    target_rate = Column(Float, nullable=False)  # 0.70 = %70
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    remaining = Column(Float, nullable=False)
    description = Column(Text)
    due_date = Column(Date)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    debt_id = Column(Integer, ForeignKey("debts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    note = Column(Text)
    paid_at = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class MonthlySummary(Base):
    __tablename__ = "monthly_summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_income = Column(Float, default=0)
    total_expense = Column(Float, default=0)
    net_savings = Column(Float, default=0)
    savings_rate = Column(Float, default=0)
    goal_rate = Column(Float)
    goal_met = Column(Boolean)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'month', 'year'),
    )
