#!/usr/bin/env python3
import requests

data = requests.get("http://localhost:8000/openapi.json", timeout=10).json()
paths = data.get("paths", {})
print("auth users endpoint present:", "/api/v1/auth/users" in paths)
print("matching paths:", [p for p in paths.keys() if "auth/users" in p])
