#!/usr/bin/env python3
"""Check SMTP configuration"""
import sys
sys.path.insert(0, '/app')

from app.core.config import settings

print("SMTP Configuration:")
print(f"  SMTP_HOST: {settings.SMTP_HOST}")
print(f"  SMTP_PORT: {settings.SMTP_PORT}")
print(f"  SMTP_USERNAME: {settings.SMTP_USERNAME}")
print(f"  SMTP_PASSWORD: {'***' if settings.SMTP_PASSWORD else None}")
print(f"  SMTP_FROM: {settings.SMTP_FROM}")
print(f"  SMTP_USE_TLS: {settings.SMTP_USE_TLS}")
print(f"\nOTP Configuration:")
print(f"  OTP_DEV_MODE: {settings.OTP_DEV_MODE}")
print(f"  OTP_EXPIRY_MINUTES: {settings.OTP_EXPIRY_MINUTES}")
print(f"  OTP_LENGTH: {settings.OTP_LENGTH}")

if settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
    print("\n✓ SMTP is configured")
else:
    print("\n✗ SMTP is NOT fully configured")
    if settings.OTP_DEV_MODE:
        print("  But OTP_DEV_MODE is enabled, so OTP codes will be printed to console")
