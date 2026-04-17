import requests

res = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"email": "admin@cloudpilot.io", "password": "admin123"},
)

print(res.status_code)
print(res.text)
