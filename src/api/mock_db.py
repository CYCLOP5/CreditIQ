import json
import threading
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path("data/frontend_db.json")

class MockDB:
    def __init__(self):
        self.lock = threading.Lock()
        self.data = {
            "users": [
                {"id": "user_msme", "name": "Rajesh MSME", "email": "msme@demo.com", "role": "msme", "gstin": "08UNOEW2000L4Z4", "status": "active"},
                {"id": "user_loan_officer", "name": "HDFC Officer", "email": "officer@demo.com", "role": "loan_officer", "bank_id": "bank_hdfc", "status": "active"},
                {"id": "user_credit_analyst", "name": "Alice Analyst", "email": "analyst@demo.com", "role": "credit_analyst", "status": "active"},
                {"id": "user_risk_manager", "name": "Bob Risk", "email": "risk@demo.com", "role": "risk_manager", "status": "active"},
                {"id": "user_admin", "name": "System Admin", "email": "admin@demo.com", "role": "admin", "status": "active"},
            ],
            "loan_requests": [],
            "permissions": [],
            "disputes": [],
            "reminders": [],
            "notifications": [],
            "banks": [
                {"id": "bank_hdfc", "name": "HDFC Bank", "registration_number": "REG123", "status": "active", "officer_count": 1, "api_key_count": 0, "created_at": "2026-01-01T00:00:00"}
            ],
            "api_keys": [],
            "audit_log": [],
            "risk_thresholds": {
                "bands": [
                    {"band": "very_low", "min_score": 800, "max_score": 900},
                    {"band": "low", "min_score": 700, "max_score": 799},
                    {"band": "medium", "min_score": 550, "max_score": 699},
                    {"band": "high", "min_score": 300, "max_score": 549}
                ],
                "recommendation_rules": [
                    {"msme_category": "micro", "risk_band": "very_low", "max_wc_amount": 5000000, "max_term_amount": 10000000}
                ],
                "system_config": {
                    "fraud_confidence_threshold": 0.7,
                    "data_maturity_min_months": 3
                }
            }
        }
        self.load()

    def load(self):
        if dict_path := DB_PATH:
            if dict_path.exists():
                try:
                    with open(dict_path, "r") as f:
                        saved = json.load(f)
                        self.data.update(saved)
                except Exception as e:
                    print(f"could not load mock db: {e}")
            else:
                self.save()

    def save(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(DB_PATH, "w") as f:
            json.dump(self.data, f, indent=2)

    def write(self, table: str, record: dict):
        with self.lock:
            self.data[table].append(record)
            self.save()
            return record

    def update(self, table: str, pk_field: str, pk_value: str, updates: dict):
        with self.lock:
            for item in self.data[table]:
                if item.get(pk_field) == pk_value:
                    item.update(updates)
                    self.save()
                    return item
            return None

    def query(self, table: str, filter_func=lambda x: True):
        with self.lock:
            return [item for item in self.data.get(table, []) if filter_func(item)]

    def get(self, table: str, pk_field: str, pk_value: str):
        with self.lock:
            for item in self.data.get(table, []):
                if item.get(pk_field) == pk_value:
                    return item
            return None

db = MockDB()
