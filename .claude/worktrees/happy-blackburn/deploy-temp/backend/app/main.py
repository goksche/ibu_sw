# Backend Main - FastAPI Application
# v1.2.0-alpha.2

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import auth, tournaments, participants, groups, matches, tables, info
from app.api.v1.platform import dashboard, feedback
from app.api.v1.platform.admin import users, apps, permissions, deployment

app = FastAPI(
    title=settings.APP_NAME,
    description="API für IBU Turnier-Verwaltung",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware - muss VOR allen Routen hinzugefügt werden
# Wichtig: Die Middleware wird in umgekehrter Reihenfolge ausgeführt (letzte zuerst)
# Daher sollte CORS als letzte Middleware hinzugefügt werden, damit sie zuerst ausgeführt wird
cors_origins = settings.CORS_ORIGINS_LIST
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Erlaube alle Methoden
    allow_headers=["*"],  # Erlaube alle Header
    expose_headers=["Content-Type", "Authorization", "Location", "X-Total-Count"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Include API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tournaments.router, prefix="/api/v1")
app.include_router(participants.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1/groups", tags=["Groups"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["Matches"])
app.include_router(tables.router, prefix="/api/v1/tables", tags=["Tables"])
app.include_router(info.router, prefix="/api/v1")

# Platform Routers
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(apps.router, prefix="/api/v1")
app.include_router(permissions.router, prefix="/api/v1")
app.include_router(deployment.router, prefix="/api/v1")

# Initialize Database on Startup
@app.on_event("startup")
async def startup_event():
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

