import requests

try:
    res = requests.post("http://127.0.0.1:8000/auth/login", json={"email": "anjali@sbiloans.co.in", "password": "password"})
    res.raise_for_status()
    token = res.json()["token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    res2 = requests.get("http://127.0.0.1:8000/permissions?status=granted", headers=headers)
    print("STATUS:", res2.status_code)
    print("BODY:", res2.json())
except Exception as e:
    print(f"ERROR: {e}")
