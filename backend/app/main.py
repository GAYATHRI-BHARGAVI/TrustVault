import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.seed import seed_database
from app.routers import auth, documents, grants, audit, security, health, admin
from app.models import User, AppRole

def migrate_legacy_roles():
    """Preserve existing users and map legacy roles to exactly 3 roles: ADMIN, OWNER, VIEWER."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        legacy_mapping = {
            "admin": AppRole.ADMIN,
            "security_officer": AppRole.ADMIN,
            "compliance_auditor": AppRole.VIEWER,
            "standard_user": AppRole.OWNER,
            "viewer": AppRole.VIEWER,
            "owner": AppRole.OWNER,
        }
        modified = False
        for u in users:
            if u.role in legacy_mapping:
                u.role = legacy_mapping[u.role]
                modified = True
            elif u.role not in AppRole.all_roles():
                u.role = AppRole.OWNER
                modified = True
        if modified:
            db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage vault dir exists
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    # Seed initial users & confidential documents
    seed_database()
    # Migrate any legacy roles to the standardized 3 roles
    migrate_legacy_roles()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Secure Document Sharing with a Cryptographically Verifiable Audit Trail. Encrypted with AES-256-GCM and HMAC-SHA256 Hash Chain Integrity.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend - supports local development and deployed origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://13.204.213.166",
    "http://13.204.213.166",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|13\.204\.213\.166|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# Register Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(documents.router)
app.include_router(grants.router)
app.include_router(audit.router)
app.include_router(security.router)
app.include_router(health.router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": settings.TAGLINE,
        "version": "1.0.0",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
