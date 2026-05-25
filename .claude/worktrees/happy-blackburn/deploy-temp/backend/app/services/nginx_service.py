# Nginx Service
# Multi-App Platform

import os
import subprocess
import logging
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Nginx config directory
NGINX_CONF_DIR = "/etc/nginx/conf.d"
NGINX_APPS_CONF = os.path.join(NGINX_CONF_DIR, "apps.conf")


class NginxService:
    """Service for managing Nginx configuration"""
    
    def __init__(self, conf_dir: str = NGINX_CONF_DIR):
        """
        Initialize Nginx Service
        
        Args:
            conf_dir: Nginx configuration directory
        """
        self.conf_dir = conf_dir
        self.apps_conf = os.path.join(conf_dir, "apps.conf")
        os.makedirs(conf_dir, exist_ok=True)
    
    def generate_app_config(self, app_name: str, route_path: str, container_name: str, internal_port: int) -> str:
        """
        Generate Nginx configuration for an app
        
        Args:
            app_name: App name
            route_path: Route path (e.g., "/apps/ibu")
            container_name: Docker container name
            internal_port: Container internal port
            
        Returns:
            Nginx configuration string
        """
        # Normalize route_path (ensure it starts with / and doesn't end with /)
        route_path = route_path.rstrip('/')
        if not route_path.startswith('/'):
            route_path = '/' + route_path
        
        config = f"""
    # {app_name} - Auto-generated
    location {route_path}/api {{
        proxy_pass http://{container_name}_backend:{internal_port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization $http_authorization;
    }}

    location {route_path} {{
        proxy_pass http://{container_name}_frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }}
"""
        return config
    
    def add_app_config(self, app_name: str, route_path: str, container_name: str, internal_port: int) -> bool:
        """
        Add app configuration to Nginx
        
        Args:
            app_name: App name
            route_path: Route path
            container_name: Docker container name
            internal_port: Container internal port
            
        Returns:
            True if successful, False otherwise
        """
        try:
            config = self.generate_app_config(app_name, route_path, container_name, internal_port)
            
            # Append to apps.conf
            with open(self.apps_conf, 'a') as f:
                f.write(config)
            
            logger.info(f"Added Nginx config for app: {app_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to add Nginx config for {app_name}: {e}")
            return False
    
    def remove_app_config(self, app_name: str, route_path: str) -> bool:
        """
        Remove app configuration from Nginx
        
        Args:
            app_name: App name
            route_path: Route path
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not os.path.exists(self.apps_conf):
                return True
            
            # Read current config
            with open(self.apps_conf, 'r') as f:
                lines = f.readlines()
            
            # Remove lines for this app
            route_path = route_path.rstrip('/')
            new_lines = []
            skip = False
            
            for i, line in enumerate(lines):
                # Check if this is the start of our app config
                if f"# {app_name}" in line:
                    skip = True
                    continue
                
                # Check if we've reached the next location block (end of our config)
                if skip and line.strip().startswith("location "):
                    # Check if this is a different route
                    if route_path not in line:
                        skip = False
                        new_lines.append(line)
                    continue
                
                if not skip:
                    new_lines.append(line)
            
            # Write updated config
            with open(self.apps_conf, 'w') as f:
                f.writelines(new_lines)
            
            logger.info(f"Removed Nginx config for app: {app_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove Nginx config for {app_name}: {e}")
            return False
    
    def reload_nginx(self) -> bool:
        """
        Reload Nginx configuration
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Test configuration first
            result = subprocess.run(
                ["nginx", "-t"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"Nginx config test failed: {result.stderr}")
                return False
            
            # Reload Nginx
            result = subprocess.run(
                ["nginx", "-s", "reload"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"Failed to reload Nginx: {result.stderr}")
                return False
            
            logger.info("Nginx reloaded successfully")
            return True
        except subprocess.TimeoutExpired:
            logger.error("Nginx reload timeout")
            return False
        except Exception as e:
            logger.error(f"Failed to reload Nginx: {e}")
            return False
    
    def test_config(self) -> bool:
        """
        Test Nginx configuration
        
        Returns:
            True if config is valid, False otherwise
        """
        try:
            result = subprocess.run(
                ["nginx", "-t"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"Nginx config test failed: {result.stderr}")
                return False
            
            logger.info("Nginx config test passed")
            return True
        except Exception as e:
            logger.error(f"Failed to test Nginx config: {e}")
            return False

