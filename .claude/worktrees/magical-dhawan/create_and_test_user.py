#!/usr/bin/env python3
import requests

BASE = "http://localhost:8000/api/v1"

def main():
    # Login as admin
    admin_login = requests.post(
        f"{BASE}/auth/login",
        json={"username": "goksche", "password": "admin123"},
        timeout=10,
    )
    print("admin login:", admin_login.status_code, admin_login.text)
    admin_login.raise_for_status()
    token = admin_login.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Create a test user
    payload = {
        "username": "logincheck",
        "email": "logincheck@example.com",
        "password": "Check123!",
        "role": "user",
        "is_active": True,
    }
    created = requests.post(f"{BASE}/auth/users", json=payload, headers=headers, timeout=10)
    print("create user:", created.status_code, created.text)

    # Try login with the new user
    new_login = requests.post(
        f"{BASE}/auth/login",
        json={"username": "logincheck", "password": "Check123!"},
        timeout=10,
    )
    print("new user login:", new_login.status_code, new_login.text)

if __name__ == "__main__":
    main()
