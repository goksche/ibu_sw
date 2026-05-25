# Script to create test user
import requests

url = "http://localhost:8000/api/v1/auth/register"
data = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "secret123",
    "role": "admin"
}

response = requests.post(url, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

