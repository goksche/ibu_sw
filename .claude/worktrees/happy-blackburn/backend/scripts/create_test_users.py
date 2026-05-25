#!/usr/bin/env python3
"""
Script zum Erstellen von Test-Usern für das Rollen-System
Erstellt: admin, testuser (USER), testviewer (VIEWER)
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

def create_test_users():
    """Erstellt Test-User für alle Rollen"""
    db = SessionLocal()
    
    try:
        # Initialize database
        init_db()
        
        # Test-User Daten
        test_users = [
            {
                'username': 'admin',
                'email': 'admin@test.local',
                'password': 'admin123',
                'role': UserRole.ADMIN,
                'description': 'Admin-User (bereits vorhanden oder wird erstellt)'
            },
            {
                'username': 'testuser',
                'email': 'testuser@test.local',
                'password': 'testuser123',
                'role': UserRole.USER,
                'description': 'Test-User mit USER-Rolle'
            },
            {
                'username': 'testviewer',
                'email': 'testviewer@test.local',
                'password': 'testviewer123',
                'role': UserRole.VIEWER,
                'description': 'Test-User mit VIEWER-Rolle'
            }
        ]
        
        created_count = 0
        existing_count = 0
        
        for user_data in test_users:
            # Prüfe ob User bereits existiert
            existing_user = db.query(User).filter(User.username == user_data['username']).first()
            
            if existing_user:
                print(f"ℹ️  User '{user_data['username']}' existiert bereits (Rolle: {existing_user.role.value})")
                existing_count += 1
            else:
                # Erstelle neuen User
                new_user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    hashed_password=get_password_hash(user_data['password']),
                    role=user_data['role'],
                    is_active=True
                )
                db.add(new_user)
                print(f"✅ User '{user_data['username']}' erstellt ({user_data['role'].value})")
                created_count += 1
        
        db.commit()
        
        print("\n" + "="*60)
        print(f"Zusammenfassung:")
        print(f"  - Erstellt: {created_count}")
        print(f"  - Bereits vorhanden: {existing_count}")
        print("="*60)
        print("\nTest-User Credentials:")
        print("  Admin:    admin / admin123")
        print("  User:     testuser / testuser123")
        print("  Viewer:   testviewer / testviewer123")
        print("\n✅ Test-User erfolgreich erstellt!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Fehler beim Erstellen der Test-User: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == '__main__':
    create_test_users()
