import jwt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from src.api.mock_db import db

auth_router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

SECRET_KEY = "hackathon_super_secret"

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    role: str
    gstin: Optional[str] = None
    bank_id: Optional[str] = None

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="invalid token")
        user = db.get("users", "id", user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="user not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="could not validate credentials")

def require_role(allowed_roles: list[str]):
    def role_checker(user: dict = Depends(get_current_user)):
        if "admin" in allowed_roles: pass 
        if user["role"] not in allowed_roles and user["role"] != "admin": 
            raise HTTPException(status_code=403, detail="unauthorized role")
        return user
    return role_checker

@auth_router.post("/login")
async def login(req: LoginRequest):
    user = db.get("users", "email", req.email)
    if not user:
        raise HTTPException(status_code=401, detail="invalid credentials")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {"token": token, "user": user}

@auth_router.post("/logout")
async def logout():
    return {"status": "ok"}

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user
