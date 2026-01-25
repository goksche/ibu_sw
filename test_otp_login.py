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

    # Create user (email whitelist)
    payload = {
        "username": "otptest",
        "email": "otptest@example.com",
        "role": "user",
        "is_active": True,
    }
    created = requests.post(f"{BASE}/auth/users", json=payload, headers=headers, timeout=10)
    print("create user:", created.status_code, created.text)

    # Send OTP
    otp = requests.post(f"{BASE}/auth/send-otp", json={"email": payload["email"]}, timeout=10)
    print("send otp:", otp.status_code, otp.text)
    otp.raise_for_status()
    otp_code = otp.json().get("dev_otp_code")
    print("dev otp code:", otp_code)

    # Verify OTP
    verify = requests.post(
        f"{BASE}/auth/verify-otp",
        json={"email": payload["email"], "otp_code": otp_code},
        timeout=10,
    )
    print("verify otp:", verify.status_code, verify.text)

if __name__ == "__main__":
    main()
