# Backend Main - FastAPI Application
# v1.2.0-alpha.2

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import auth, tournaments, participants, groups, matches

app = FastAPI(
    title=settings.APP_NAME,
    description="API für IBU Turnier-Verwaltung",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tournaments.router, prefix="/api/v1")
app.include_router(participants.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1/groups", tags=["Groups"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["Matches"])

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

