import os
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, SessionLocal, Base
from .models import User
from .utils.security import get_password_hash
from .routers import auth, tasks, admin

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed initial admin user if not exists
db = SessionLocal()
try:
    admin_user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER_EMAIL).first()
    if not admin_user:
        hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
        admin_user = User(
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=hashed_password,
            full_name="System Administrator",
            role="admin"
        )
        db.add(admin_user)
        db.commit()
finally:
    db.close()

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for standard clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["Tasks"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin Operations"])

# Custom Validation Error Handler (returns clean JSON structure)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field_path = " -> ".join([str(loc) for loc in error["loc"][1:]]) if len(error["loc"]) > 1 else str(error["loc"][0])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "message": "Input validation failed",
            "errors": errors
        }
    )

# Setup Static Directory and Mount
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Mount the static folder at root /
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
