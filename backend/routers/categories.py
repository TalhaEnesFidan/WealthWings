"""
Kategori yönetim endpoint'leri — CRUD
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.database import get_db
from backend.models import Category, Transaction, User
from backend.schemas import CategoryCreate, CategoryUpdate, CategoryResponse, MessageResponse
from backend.routers.auth import get_current_user

router = APIRouter()


@router.get("")
def get_categories(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tüm kategorileri listele"""
    query = db.query(Category).filter(Category.user_id == current_user.id)

    if type and type in ("income", "expense"):
        query = query.filter(Category.type == type)

    categories = query.order_by(Category.type, Category.name).all()

    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "name": c.name,
            "type": c.type,
            "icon": c.icon,
            "color": c.color,
            "is_default": c.is_default,
        }
        for c in categories
    ]


@router.post("")
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Yeni özel kategori ekle"""
    if data.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Tur 'income' veya 'expense' olmali")

    category = Category(
        user_id=current_user.id,
        name=data.name,
        type=data.type,
        icon=data.icon or "📌",
        color=data.color or "#6366f1",
        is_default=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "user_id": category.user_id,
        "name": category.name,
        "type": category.type,
        "icon": category.icon,
        "color": category.color,
        "is_default": category.is_default,
    }


@router.put("/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kategori güncelle"""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadi")

    if data.name is not None:
        category.name = data.name
    if data.icon is not None:
        category.icon = data.icon
    if data.color is not None:
        category.color = data.color

    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "user_id": category.user_id,
        "name": category.name,
        "type": category.type,
        "icon": category.icon,
        "color": category.color,
        "is_default": category.is_default,
    }


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kategori sil (varsayılanlar silinemez)"""
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadi")

    if category.is_default:
        raise HTTPException(status_code=400, detail="Varsayilan kategoriler silinemez")

    # Bu kategoriye ait işlem var mı kontrol et
    has_transactions = db.query(Transaction).filter(
        Transaction.category_id == category_id
    ).first()
    if has_transactions:
        raise HTTPException(
            status_code=400,
            detail="Bu kategoriye ait islemler var. Once islemleri silin veya baska kategoriye tasiyin."
        )

    db.delete(category)
    db.commit()
    return {"message": "Kategori silindi"}
