#!/usr/bin/env python3
import requests
import json

# Test login API
url = 'http://localhost:8000/api/v1/auth/login'
data = {
    'username': 'goksche',
    'password': 'admin123'
}

try:
    response = requests.post(url, json=data)
    print(f'Status: {response.status_code}')
    print(f'Response: {response.text}')
except Exception as e:
    print(f'Error: {e}')