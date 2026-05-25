#!/usr/bin/env python3
import requests
import json

# Test login for admin user
url = 'http://localhost:8000/api/v1/auth/login'
data = {
    'username': 'goksche',
    'password': 'admin123'
}

try:
    response = requests.post(url, json=data)
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        print('Login successful!')
        token_data = response.json()
        print(f'Token received: {token_data["access_token"][:50]}...')
    else:
        print(f'Response: {response.text}')
except Exception as e:
    print(f'Error: {e}')