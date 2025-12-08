"""
EUSuite Public Backend - User Routes
User profile management
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import PublicUser
from ..schemas import UserResponse, UserUpdate, ChangePassword, BaseResponse
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: PublicUser = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse(**current_user.to_dict())


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    update_data = data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if value is not None:
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"User profile updated: {current_user.email}")
    
    return UserResponse(**current_user.to_dict())


@router.post("/me/change-password", response_model=BaseResponse)
async def change_password(
    data: ChangePassword,
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for current user."""
    if not current_user.check_password(data.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.set_password(data.new_password)
    db.commit()
    
    logger.info(f"Password changed: {current_user.email}")
    
    return BaseResponse(success=True, message="Password changed successfully")


@router.delete("/me", response_model=BaseResponse)
async def delete_account(
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user account."""
    # Soft delete - deactivate account
    current_user.is_active = False
    db.commit()
    
    logger.info(f"Account deactivated: {current_user.email}")
    
    return BaseResponse(success=True, message="Account deleted successfully")


@router.get("/me/subscriptions")
async def get_user_subscriptions(
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscriptions."""
    subscriptions = current_user.subscriptions
    return [sub.to_dict() for sub in subscriptions]


@router.get("/me/payments")
async def get_user_payments(
    current_user: PublicUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's payment history."""
    payments = current_user.payments
    return [payment.to_dict() for payment in payments]
