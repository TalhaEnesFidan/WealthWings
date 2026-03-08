"""
Kimlik doğrulama endpoint'leri — Kayıt, Giriş, Çıkış, Kullanıcı bilgisi
"""
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.database import get_db
from backend.models import User, Category
from backend.schemas import UserCreate, UserLogin, UserResponse, Token, UserUpdate, PasswordChange

router = APIRouter()
security = HTTPBearer()

SECRET_KEY = "wealthwings-secret-key-2025-finans-app"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ─── Varsayılan Kategoriler ──────────────────────────────

DEFAULT_CATEGORIES = [
    # Gelir kategorileri
    {"name": "Maaş / Ücret", "type": "income", "icon": "💼", "color": "#22c55e"},
    {"name": "Serbest Çalışma", "type": "income", "icon": "💻", "color": "#3b82f6"},
    {"name": "Kira Geliri", "type": "income", "icon": "🏠", "color": "#8b5cf6"},
    {"name": "Yatırım Getirisi", "type": "income", "icon": "📈", "color": "#06b6d4"},
    {"name": "Hediye / Bağış", "type": "income", "icon": "🎁", "color": "#f43f5e"},
    {"name": "Diğer Gelir", "type": "income", "icon": "💰", "color": "#84cc16"},
    # Gider kategorileri
    {"name": "Market / Gıda", "type": "expense", "icon": "🛒", "color": "#ef4444"},
    {"name": "Kira / Aidat", "type": "expense", "icon": "🏠", "color": "#f97316"},
    {"name": "Faturalar", "type": "expense", "icon": "⚡", "color": "#eab308"},
    {"name": "Ulaşım", "type": "expense", "icon": "🚗", "color": "#14b8a6"},
    {"name": "Sağlık", "type": "expense", "icon": "🏥", "color": "#ec4899"},
    {"name": "Eğitim", "type": "expense", "icon": "🎓", "color": "#8b5cf6"},
    {"name": "Giyim", "type": "expense", "icon": "👗", "color": "#d946ef"},
    {"name": "Eğlence / Hobi", "type": "expense", "icon": "🎬", "color": "#6366f1"},
    {"name": "Yemek / Restoran", "type": "expense", "icon": "🍽️", "color": "#f43f5e"},
    {"name": "Abonelikler", "type": "expense", "icon": "📱", "color": "#0ea5e9"},
    {"name": "Eczane", "type": "expense", "icon": "💊", "color": "#10b981"},
    {"name": "Spor", "type": "expense", "icon": "🏋️", "color": "#f59e0b"},
    {"name": "Diğer Gider", "type": "expense", "icon": "💸", "color": "#64748b"},
]


# ─── Yardımcı Fonksiyonlar ───────────────────────────────

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """JWT token'dan aktif kullanıcıyı döner"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Geçersiz token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return user


def seed_default_categories(db: Session, user_id: int):
    """Yeni kullanıcı için varsayılan kategorileri oluştur"""
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(
            user_id=user_id,
            name=cat["name"],
            type=cat["type"],
            icon=cat["icon"],
            color=cat["color"],
            is_default=True,
        ))
    db.commit()


# ─── Endpoint'ler ────────────────────────────────────────

@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Yeni kullanıcı kaydı"""
    # Kullanıcı adı kontrolü
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Bu kullanıcı adı zaten kullanılıyor"
        )

    # E-posta kontrolü
    if user_data.email:
        email_exists = db.query(User).filter(User.email == user_data.email).first()
        if email_exists:
            raise HTTPException(
                status_code=400,
                detail="Bu e-posta adresi zaten kullanılıyor"
            )

    # Kullanıcı oluştur
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hashed_password,
        full_name=user_data.full_name,
        currency=user_data.currency,
        language=user_data.language,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Varsayılan kategorileri oluştur
    seed_default_categories(db, new_user.id)

    # Token üret
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Kullanıcı girişi"""
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not bcrypt.checkpw(user_data.password.encode('utf-8'), user.password.encode('utf-8')):
        raise HTTPException(
            status_code=401,
            detail="Kullanıcı adı veya şifre hatalı"
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.post("/logout")
def logout():
    """Çıkış (client-side token silme)"""
    return {"message": "Çıkış başarılı"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Aktif kullanıcı bilgisi"""
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kullanıcı profil bilgilerini (ad, email, dil, tema vb.) günceller"""
    if user_data.email and user_data.email != current_user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanılıyor")
            
    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name
    if user_data.email is not None:
        current_user.email = user_data.email
    if user_data.currency is not None:
        current_user.currency = user_data.currency
    if user_data.language is not None:
        current_user.language = user_data.language
    if user_data.theme is not None:
        current_user.theme = user_data.theme
        
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/password")
def change_password(
    pwd_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kullanıcının şifresini günceller"""
    if not bcrypt.checkpw(pwd_data.current_password.encode('utf-8'), current_user.password.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı")
        
    hashed_password = bcrypt.hashpw(pwd_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    current_user.password = hashed_password
    db.commit()
    
    return {"message": "Şifre başarıyla güncellendi. Lütfen tekrar giriş yapın."}
@router.delete("/account")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kullanıcı hesabını ve tüm ilişkili verilerini siler"""
    user_id = current_user.id
    
    # İlişkili verileri sil (Sıralama önemli: ForeignKey kısıtlamaları için)
    # 1. Borç ödemeleri
    from backend.models import Transaction, SavingsGoal, Debt, DebtPayment, MonthlySummary
    db.query(DebtPayment).filter(DebtPayment.user_id == user_id).delete()
    # 2. Borçlar
    db.query(Debt).filter(Debt.user_id == user_id).delete()
    # 3. İşlemler
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    # 4. Birikim hedefleri
    db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).delete()
    # 5. Aylık özetler
    db.query(MonthlySummary).filter(MonthlySummary.user_id == user_id).delete()
    # 6. Kategoriler
    db.query(Category).filter(Category.user_id == user_id).delete()
    # 7. Kullanıcı
    db.query(User).filter(User.id == user_id).delete()
    
    db.commit()
    return {"message": "Hesabınız ve tüm verileriniz başarıyla silindi."}
