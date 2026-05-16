# Backend Main - FastAPI Application
# v1.2.0-alpha.2

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import logging
import time

logger = logging.getLogger("ibu.api")

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.api.v1 import auth, tournaments, participants, groups, matches, tables, info, leagues, locations, access_requests, settings as settings_router, logs as logs_router
from app.api.v1.platform import dashboard, feedback
from app.api.v1.platform.admin import users, apps, permissions, deployment, logs as admin_logs
from app.models.logs import ApiRequestLog, AdminActionLog
from app.services.logs_service import extract_client_ip, extract_user_agent, get_user_context, maybe_cleanup_old_logs

app = FastAPI(
    title=settings.APP_NAME,
    description="API für IBU Turnier-Verwaltung",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware - Allow all for local development
from fastapi.middleware.cors import CORSMiddleware

# Add CORS middleware BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Request logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = None
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception:
        status_code = 500
        raise
    finally:
        path = request.url.path
        should_log = path.startswith("/api")
        if path.startswith("/health") or path.startswith("/docs") or path.startswith("/openapi"):
            should_log = False
        if path.startswith("/api/v1/logs") or path.startswith("/api/v1/platform/admin/logs"):
            should_log = False
        if should_log:
            duration_ms = int((time.time() - start_time) * 1000)
            user_id, role = get_user_context(request)
            ip = extract_client_ip(request)
            user_agent = extract_user_agent(request)

            db = SessionLocal()
            try:
                api_log = ApiRequestLog(
                    user_id=user_id,
                    method=request.method,
                    path=path,
                    status_code=status_code,
                    duration_ms=duration_ms,
                    ip=ip,
                    user_agent=user_agent
                )
                db.add(api_log)

                if role == "admin" and request.method not in ("GET", "HEAD", "OPTIONS"):
                    admin_log = AdminActionLog(
                        user_id=user_id,
                        method=request.method,
                        path=path,
                        status_code=status_code,
                        action=f"{request.method} {path}",
                        ip=ip,
                        user_agent=user_agent
                    )
                    db.add(admin_log)
                db.commit()
                try:
                    maybe_cleanup_old_logs(db)
                except Exception:
                    pass
            except Exception:
                db.rollback()
            finally:
                db.close()
    return response

# Include API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tournaments.router, prefix="/api/v1")
app.include_router(participants.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1/groups", tags=["Groups"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["Matches"])
app.include_router(tables.router, prefix="/api/v1/tables", tags=["Tables"])
app.include_router(leagues.router, prefix="/api/v1")
app.include_router(locations.router, prefix="/api/v1")
app.include_router(info.router, prefix="/api/v1")
app.include_router(access_requests.router, prefix="/api/v1")
app.include_router(settings_router.router, prefix="/api/v1")
app.include_router(logs_router.router, prefix="/api/v1")

# Platform Routers
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(apps.router, prefix="/api/v1")
app.include_router(permissions.router, prefix="/api/v1")
app.include_router(deployment.router, prefix="/api/v1")
app.include_router(admin_logs.router, prefix="/api/v1")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Initialize Database on Startup
@app.on_event("startup")
async def startup_event():
    logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    init_db()


@app.get("/")
async def root():
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": "/api/v1"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "backend",
        "version": settings.APP_VERSION
    }

