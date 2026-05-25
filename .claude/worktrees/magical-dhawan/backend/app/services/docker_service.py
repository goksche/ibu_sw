# Docker Service
# Multi-App Platform

import docker
from docker.errors import DockerException, ImageNotFound, ContainerNotFound, APIError
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class DockerService:
    """Service for managing Docker containers and images"""
    
    def __init__(self):
        """Initialize Docker client"""
        try:
            # Connect to Docker daemon
            # In production, this should connect to the host Docker daemon
            # via /var/run/docker.sock (mounted as volume)
            self.client = docker.from_env()
            logger.info("Docker client initialized successfully")
        except DockerException as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise
    
    def load_image(self, image_file_path: str) -> str:
        """
        Load Docker image from TAR file
        
        Args:
            image_file_path: Path to the TAR file containing the Docker image
            
        Returns:
            Image ID of the loaded image
            
        Raises:
            DockerException: If image loading fails
        """
        try:
            logger.info(f"Loading Docker image from {image_file_path}")
            with open(image_file_path, 'rb') as f:
                images = self.client.images.load(f.read())
            
            if not images:
                raise DockerException("No images found in TAR file")
            
            image = images[0]
            logger.info(f"Image loaded successfully: {image.id}")
            return image.id
        except Exception as e:
            logger.error(f"Failed to load image: {e}")
            raise DockerException(f"Failed to load image: {str(e)}")
    
    def get_image(self, image_name: str) -> Optional[docker.models.images.Image]:
        """
        Get Docker image by name
        
        Args:
            image_name: Image name (with or without tag)
            
        Returns:
            Image object or None if not found
        """
        try:
            image = self.client.images.get(image_name)
            return image
        except ImageNotFound:
            return None
    
    def list_images(self) -> List[Dict]:
        """
        List all Docker images
        
        Returns:
            List of image dictionaries
        """
        try:
            images = self.client.images.list()
            return [
                {
                    "id": img.id,
                    "tags": img.tags,
                    "created": img.attrs.get("Created"),
                    "size": img.attrs.get("Size", 0)
                }
                for img in images
            ]
        except DockerException as e:
            logger.error(f"Failed to list images: {e}")
            return []
    
    def get_container(self, container_name: str) -> Optional[docker.models.containers.Container]:
        """
        Get Docker container by name
        
        Args:
            container_name: Container name
            
        Returns:
            Container object or None if not found
        """
        try:
            container = self.client.containers.get(container_name)
            return container
        except ContainerNotFound:
            return None
    
    def container_exists(self, container_name: str) -> bool:
        """
        Check if container exists
        
        Args:
            container_name: Container name
            
        Returns:
            True if container exists, False otherwise
        """
        return self.get_container(container_name) is not None
    
    def start_container(self, container_name: str) -> bool:
        """
        Start a Docker container
        
        Args:
            container_name: Container name
            
        Returns:
            True if successful, False otherwise
        """
        try:
            container = self.get_container(container_name)
            if container is None:
                logger.error(f"Container not found: {container_name}")
                return False
            
            container.start()
            logger.info(f"Container started: {container_name}")
            return True
        except DockerException as e:
            logger.error(f"Failed to start container {container_name}: {e}")
            return False
    
    def stop_container(self, container_name: str) -> bool:
        """
        Stop a Docker container
        
        Args:
            container_name: Container name
            
        Returns:
            True if successful, False otherwise
        """
        try:
            container = self.get_container(container_name)
            if container is None:
                logger.error(f"Container not found: {container_name}")
                return False
            
            container.stop()
            logger.info(f"Container stopped: {container_name}")
            return True
        except DockerException as e:
            logger.error(f"Failed to stop container {container_name}: {e}")
            return False
    
    def restart_container(self, container_name: str) -> bool:
        """
        Restart a Docker container
        
        Args:
            container_name: Container name
            
        Returns:
            True if successful, False otherwise
        """
        try:
            container = self.get_container(container_name)
            if container is None:
                logger.error(f"Container not found: {container_name}")
                return False
            
            container.restart()
            logger.info(f"Container restarted: {container_name}")
            return True
        except DockerException as e:
            logger.error(f"Failed to restart container {container_name}: {e}")
            return False
    
    def remove_container(self, container_name: str, force: bool = False) -> bool:
        """
        Remove a Docker container
        
        Args:
            container_name: Container name
            force: Force removal even if container is running
            
        Returns:
            True if successful, False otherwise
        """
        try:
            container = self.get_container(container_name)
            if container is None:
                logger.error(f"Container not found: {container_name}")
                return False
            
            container.remove(force=force)
            logger.info(f"Container removed: {container_name}")
            return True
        except DockerException as e:
            logger.error(f"Failed to remove container {container_name}: {e}")
            return False
    
    def get_container_status(self, container_name: str) -> Optional[str]:
        """
        Get container status
        
        Args:
            container_name: Container name
            
        Returns:
            Container status (running, stopped, etc.) or None if not found
        """
        container = self.get_container(container_name)
        if container is None:
            return None
        
        container.reload()
        return container.status
    
    def get_container_logs(self, container_name: str, tail: int = 100) -> str:
        """
        Get container logs
        
        Args:
            container_name: Container name
            tail: Number of lines to return
            
        Returns:
            Container logs as string
        """
        try:
            container = self.get_container(container_name)
            if container is None:
                return ""
            
            logs = container.logs(tail=tail, timestamps=True)
            return logs.decode('utf-8') if isinstance(logs, bytes) else logs
        except DockerException as e:
            logger.error(f"Failed to get logs for {container_name}: {e}")
            return ""
    
    def create_container(
        self,
        image_name: str,
        container_name: str,
        ports: Dict[str, int] = None,
        environment: Dict[str, str] = None,
        volumes: Dict[str, Dict] = None,
        network: str = None,
        command: str = None
    ) -> Optional[docker.models.containers.Container]:
        """
        Create a new Docker container
        
        Args:
            image_name: Docker image name
            container_name: Name for the container
            ports: Port mappings {container_port: host_port}
            environment: Environment variables
            volumes: Volume mappings
            network: Network name
            command: Command to run
            
        Returns:
            Container object or None if creation fails
        """
        try:
            # Check if container already exists
            if self.container_exists(container_name):
                logger.warning(f"Container already exists: {container_name}")
                return self.get_container(container_name)
            
            # Prepare port bindings
            port_bindings = {}
            if ports:
                for container_port, host_port in ports.items():
                    port_bindings[container_port] = host_port
            
            # Create container
            container = self.client.containers.create(
                image=image_name,
                name=container_name,
                ports=port_bindings,
                environment=environment or {},
                volumes=volumes or {},
                network=network,
                command=command,
                detach=True
            )
            
            logger.info(f"Container created: {container_name}")
            return container
        except DockerException as e:
            logger.error(f"Failed to create container {container_name}: {e}")
            return None


