# Admin Deployment API
# Multi-App Platform

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.platform import App, AppStatus, ContainerDeployment, DeploymentStatus
from app.schemas.platform.deployment import DeploymentResponse

router = APIRouter(prefix="/platform/admin/deploy", tags=["Admin - Deployment"])

# Upload directory for Docker images
UPLOAD_DIR = "/app/uploads"


@router.post("/upload")
async def upload_docker_image(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin)
):
    """
    Upload Docker image (TAR file) (Admin only)
    Returns the file path for later deployment
    """
    # Validate file type
    if not file.filename.endswith('.tar'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .tar file"
        )
    
    # Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.tar")
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    return {
        "file_id": file_id,
        "file_path": file_path,
        "filename": file.filename,
        "size": len(content)
    }


@router.post("/{app_id}", response_model=DeploymentResponse)
async def deploy_app(
    app_id: int,
    docker_image: str,
    file_path: str = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deploy app container (Admin only)
    """
    from app.services.deployment_service import DeploymentService
    
    # Verify app exists
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    # Update docker_image if provided
    if docker_image:
        app.docker_image = docker_image
        db.commit()
    
    # Create deployment record
    deployment = ContainerDeployment(
        app_id=app_id,
        deployed_by=admin.id,
        docker_image=app.docker_image,
        deployment_status=DeploymentStatus.DEPLOYING
    )
    
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    
    # Deploy using DeploymentService
    deployment_service = DeploymentService()
    result = deployment_service.deploy_app(app, file_path, db)
    
    if not result.get("success"):
        deployment.deployment_status = DeploymentStatus.FAILED
        deployment.error_message = result.get("error", "Unknown error")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Deployment failed")
        )
    
    return deployment


@router.get("/status/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment_status(
    deployment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get deployment status (Admin only)"""
    deployment = db.query(ContainerDeployment).filter(
        ContainerDeployment.id == deployment_id
    ).first()
    
    if deployment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found"
        )
    
    return deployment


@router.get("/history", response_model=List[DeploymentResponse])
async def get_deployment_history(
    skip: int = 0,
    limit: int = 50,
    app_id: int = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get deployment history (Admin only)"""
    query = db.query(ContainerDeployment)
    
    if app_id:
        query = query.filter(ContainerDeployment.app_id == app_id)
    
    deployments = query.order_by(
        ContainerDeployment.deployed_at.desc()
    ).offset(skip).limit(limit).all()
    
    return deployments


@router.post("/stop/{app_id}")
async def stop_app(
    app_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Stop app container (Admin only)"""
    from app.services.deployment_service import DeploymentService
    
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    deployment_service = DeploymentService()
    result = deployment_service.stop_app(app, db)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Failed to stop app")
        )
    
    return result


@router.post("/start/{app_id}")
async def start_app(
    app_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Start app container (Admin only)"""
    from app.services.deployment_service import DeploymentService
    
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    deployment_service = DeploymentService()
    result = deployment_service.start_app(app, db)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Failed to start app")
        )
    
    return result

