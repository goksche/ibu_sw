# Deployment Service
# Multi-App Platform

import logging
from typing import Optional, Dict
from sqlalchemy.orm import Session

from app.models.platform import App, AppStatus, ContainerDeployment, DeploymentStatus
from app.services.docker_service import DockerService
from app.services.nginx_service import NginxService

logger = logging.getLogger(__name__)


class DeploymentService:
    """Service for orchestrating app deployments"""
    
    def __init__(self):
        """Initialize Deployment Service"""
        self.docker_service = DockerService()
        self.nginx_service = NginxService()
    
    def deploy_app(
        self,
        app: App,
        docker_image_path: Optional[str] = None,
        db: Session = None
    ) -> Dict:
        """
        Deploy an app
        
        Args:
            app: App model instance
            docker_image_path: Path to Docker image TAR file (optional)
            db: Database session
            
        Returns:
            Dictionary with deployment result
        """
        try:
            logger.info(f"Starting deployment for app: {app.name}")
            
            # Update app status
            if db:
                app.status = AppStatus.DEPLOYING
                db.commit()
            
            # Load image if path provided
            if docker_image_path:
                logger.info(f"Loading Docker image from {docker_image_path}")
                image_id = self.docker_service.load_image(docker_image_path)
                logger.info(f"Image loaded: {image_id}")
            
            # Create deployment record
            deployment = None
            if db:
                deployment = ContainerDeployment(
                    app_id=app.id,
                    deployed_by=1,  # TODO: Get from current user
                    docker_image=app.docker_image,
                    deployment_status=DeploymentStatus.DEPLOYING
                )
                db.add(deployment)
                db.commit()
                db.refresh(deployment)
            
            # Check if container already exists
            if self.docker_service.container_exists(app.container_name):
                logger.info(f"Container already exists: {app.container_name}")
                # Stop and remove existing container
                self.docker_service.stop_container(app.container_name)
                self.docker_service.remove_container(app.container_name, force=True)
            
            # Create and start container
            # Note: This is a simplified version. In production, you might want to use
            # docker-compose or more complex container configuration
            container = self.docker_service.create_container(
                image_name=app.docker_image,
                container_name=app.container_name,
                ports={f"{app.internal_port}/tcp": None},  # Auto-assign host port
                network="ibu_network"  # TODO: Make configurable
            )
            
            if container is None:
                raise Exception("Failed to create container")
            
            # Start container
            if not self.docker_service.start_container(app.container_name):
                raise Exception("Failed to start container")
            
            # Add Nginx configuration
            if not self.nginx_service.add_app_config(
                app_name=app.name,
                route_path=app.route_path,
                container_name=app.container_name,
                internal_port=app.internal_port
            ):
                logger.warning(f"Failed to add Nginx config for {app.name}, but continuing...")
            
            # Test and reload Nginx
            if not self.nginx_service.test_config():
                logger.error("Nginx config test failed")
                # Rollback: stop container
                self.docker_service.stop_container(app.container_name)
                raise Exception("Nginx configuration invalid")
            
            if not self.nginx_service.reload_nginx():
                logger.error("Failed to reload Nginx")
                # Rollback: stop container
                self.docker_service.stop_container(app.container_name)
                raise Exception("Failed to reload Nginx")
            
            # Update app status
            if db:
                app.status = AppStatus.ACTIVE
                if deployment:
                    deployment.deployment_status = DeploymentStatus.SUCCESS
                db.commit()
            
            logger.info(f"Deployment successful for app: {app.name}")
            
            return {
                "success": True,
                "message": "Deployment successful",
                "container_name": app.container_name,
                "deployment_id": deployment.id if deployment else None
            }
            
        except Exception as e:
            logger.error(f"Deployment failed for {app.name}: {e}")
            
            # Update status to error
            if db:
                app.status = AppStatus.ERROR
                if deployment:
                    deployment.deployment_status = DeploymentStatus.FAILED
                    deployment.error_message = str(e)
                db.commit()
            
            return {
                "success": False,
                "message": f"Deployment failed: {str(e)}",
                "error": str(e)
            }
    
    def stop_app(self, app: App, db: Session = None) -> Dict:
        """
        Stop an app
        
        Args:
            app: App model instance
            db: Database session
            
        Returns:
            Dictionary with result
        """
        try:
            logger.info(f"Stopping app: {app.name}")
            
            # Stop container
            if not self.docker_service.stop_container(app.container_name):
                logger.warning(f"Container not found or already stopped: {app.container_name}")
            
            # Update app status
            if db:
                app.status = AppStatus.INACTIVE
                db.commit()
            
            return {
                "success": True,
                "message": "App stopped successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to stop app {app.name}: {e}")
            return {
                "success": False,
                "message": f"Failed to stop app: {str(e)}",
                "error": str(e)
            }
    
    def start_app(self, app: App, db: Session = None) -> Dict:
        """
        Start an app
        
        Args:
            app: App model instance
            db: Database session
            
        Returns:
            Dictionary with result
        """
        try:
            logger.info(f"Starting app: {app.name}")
            
            # Check if container exists
            if not self.docker_service.container_exists(app.container_name):
                logger.error(f"Container not found: {app.container_name}")
                return {
                    "success": False,
                    "message": "Container not found. Please deploy the app first."
                }
            
            # Start container
            if not self.docker_service.start_container(app.container_name):
                raise Exception("Failed to start container")
            
            # Update app status
            if db:
                app.status = AppStatus.ACTIVE
                db.commit()
            
            return {
                "success": True,
                "message": "App started successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to start app {app.name}: {e}")
            
            if db:
                app.status = AppStatus.ERROR
                db.commit()
            
            return {
                "success": False,
                "message": f"Failed to start app: {str(e)}",
                "error": str(e)
            }
    
    def get_app_status(self, app: App) -> Dict:
        """
        Get app deployment status
        
        Args:
            app: App model instance
            
        Returns:
            Dictionary with status information
        """
        container_status = self.docker_service.get_container_status(app.container_name)
        
        return {
            "app_id": app.id,
            "app_name": app.name,
            "app_status": app.status.value,
            "container_name": app.container_name,
            "container_status": container_status,
            "container_exists": container_status is not None
        }

