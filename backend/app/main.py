from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.complaints import router as complaints_router
from app.api.departments import router as departments_router
from app.api.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Error handlers (RULES §4 — consistent error shape) ───────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": str(exc.status_code), "message": str(exc.detail)}}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": {"code": "VALIDATION_ERROR", "message": str(exc.errors())}}
    )


# ── Health / Root ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API. Visit /docs for API specifications."}


@app.get(settings.API_V1_STR, tags=["Root"])
async def api_v1_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API v1",
        "docs": "/docs",
        "status": "operational",
    }


# ── Register API routers under /api/v1 ────────────────────────────────────────

PREFIX = settings.API_V1_STR   # "/api/v1"

app.include_router(auth_router,        prefix=PREFIX)
app.include_router(complaints_router,  prefix=PREFIX)
app.include_router(departments_router, prefix=PREFIX)
app.include_router(admin_router,       prefix=PREFIX)
