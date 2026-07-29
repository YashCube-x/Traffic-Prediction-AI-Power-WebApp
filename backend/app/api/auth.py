from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    role: Optional[UserRole] = UserRole.COMMUTER


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: UserRole


def seed_default_users_if_needed(db: Session):
    """Seed initial demo accounts into Neon DB if database is empty."""
    default_users = [
        {
            "email": "admin@trafficvision.ai",
            "full_name": "System Administrator",
            "password": "admin",
            "role": UserRole.ADMIN
        },
        {
            "email": "operator@trafficvision.ai",
            "full_name": "City Traffic Operator",
            "password": "operator",
            "role": UserRole.OPERATOR
        },
        {
            "email": "commuter@trafficvision.ai",
            "full_name": "Smart City Commuter",
            "password": "commuter",
            "role": UserRole.COMMUTER
        }
    ]
    for u_data in default_users:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            new_user = User(
                email=u_data["email"],
                full_name=u_data["full_name"],
                password_hash=hash_password(u_data["password"]),
                role=u_data["role"]
            )
            db.add(new_user)
    db.commit()


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user credentials against Neon DB and return signed JWT token.
    """
    seed_default_users_if_needed(db)
    
    user = db.query(User).filter(User.email == req.email.lower()).first()
    
    # Fallback matching for demo accounts if user entered shorthand email
    if not user:
        if "admin" in req.email.lower():
            user = db.query(User).filter(User.email == "admin@trafficvision.ai").first()
        elif "operator" in req.email.lower():
            user = db.query(User).filter(User.email == "operator@trafficvision.ai").first()
        elif "commuter" in req.email.lower():
            user = db.query(User).filter(User.email == "commuter@trafficvision.ai").first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role.value})
    
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role
    )


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register new user account into Neon DB.
    """
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    new_user = User(
        email=req.email.lower(),
        full_name=req.full_name,
        password_hash=hash_password(req.password),
        role=req.role or UserRole.COMMUTER
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.id, "email": new_user.email, "role": new_user.role.value})

    return AuthResponse(
        access_token=token,
        user_id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role
    )


@router.get("/me", response_model=AuthResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current logged in user profile from JWT token.
    """
    token = create_access_token(data={"sub": current_user.id, "email": current_user.email, "role": current_user.role.value})
    return AuthResponse(
        access_token=token,
        user_id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role
    )
