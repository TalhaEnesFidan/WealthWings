"""
Pydantic istek/yanıt şemaları
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


# ─── Auth Şemaları ────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    currency: str = "TRY"
    language: str = "tr"


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    currency: str
    language: str
    theme: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ─── Category Şemaları ────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    type: str  # 'income' veya 'expense'
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool

    class Config:
        from_attributes = True


# ─── Transaction Şemaları ─────────────────────────────────

class TransactionCreate(BaseModel):
    category_id: int
    type: str  # 'income' veya 'expense'
    amount: float
    description: Optional[str] = None
    note: Optional[str] = None
    transaction_date: date


class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    note: Optional[str] = None
    transaction_date: Optional[date] = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    type: str
    amount: float
    description: Optional[str] = None
    note: Optional[str] = None
    transaction_date: date
    created_at: datetime
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Savings Şemaları ─────────────────────────────────────

class SavingsGoalCreate(BaseModel):
    title: str
    target_rate: float  # 0.0 - 1.0
    month: int
    year: int


class SavingsGoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    target_rate: float
    month: int
    year: int
    is_active: bool

    class Config:
        from_attributes = True


# ─── Debt Şemaları ────────────────────────────────────────

class DebtCreate(BaseModel):
    title: str
    total_amount: float
    description: Optional[str] = None
    due_date: Optional[date] = None


class DebtUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None


class DebtResponse(BaseModel):
    id: int
    user_id: int
    title: str
    total_amount: float
    remaining: float
    description: Optional[str] = None
    due_date: Optional[date] = None
    is_paid: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DebtPaymentCreate(BaseModel):
    amount: float
    note: Optional[str] = None
    paid_at: date


class DebtPaymentResponse(BaseModel):
    id: int
    debt_id: int
    amount: float
    note: Optional[str] = None
    paid_at: date
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Genel Yanıt Şemaları ────────────────────────────────

class MessageResponse(BaseModel):
    message: str
