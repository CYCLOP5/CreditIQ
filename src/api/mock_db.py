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
                {"id": "usr_001", "name": "Priya Sharma",   "email": "priya@bakerycraft.in",       "role": "msme",           "gstin": "19HLPRM4249Z3Z1", "status": "active"},
                {"id": "usr_002", "name": "Rahul Desai",    "email": "rahul@boltautomotive.in",    "role": "msme",           "gstin": "09EXVAF9205D6Z0", "status": "active"},
                {"id": "usr_003", "name": "Imran Shaikh",   "email": "imran@textilezone.in",       "role": "msme",           "gstin": "33QEFVT7885F2Z4", "status": "active"},
                {"id": "usr_004", "name": "Anjali Mehta",   "email": "anjali@sbiloans.co.in",      "role": "loan_officer",   "bank_id": "bank_001", "status": "active"},
                {"id": "usr_005", "name": "Vikram Nair",    "email": "vikram@analyst.platform.in", "role": "credit_analyst", "status": "active"},
                {"id": "usr_006", "name": "Deepa Krishnan", "email": "deepa@risk.platform.in",     "role": "risk_manager",   "status": "active"},
                {"id": "usr_007", "name": "Arjun Kapoor",   "email": "arjun@admin.platform.in",    "role": "admin",          "status": "active"},
            ],
            "loan_requests": [],
            "permissions": [],
            "disputes": [],
            "reminders": [],
            "notifications": [],
            "banks": [
                {"id": "bank_001", "name": "State Bank of India", "registration_number": "RBI-SCB-0001", "status": "active", "officer_count": 1, "api_key_count": 0, "created_at": "2026-01-01T00:00:00"},
                {"id": "bank_002", "name": "Canara Bank",          "registration_number": "RBI-SCB-0045", "status": "active", "officer_count": 0, "api_key_count": 0, "created_at": "2026-01-01T00:00:00"},
                {"id": "bank_003", "name": "HDFC Bank",            "registration_number": "RBI-PVT-0201", "status": "active", "officer_count": 0, "api_key_count": 0, "created_at": "2026-01-01T00:00:00"},
                {"id": "bank_004", "name": "Axis Bank",            "registration_number": "RBI-PVT-0312", "status": "suspended", "officer_count": 0, "api_key_count": 0, "created_at": "2026-01-01T00:00:00"},
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
                },
                "amnesty_config": {
                    "active": False,
                    "quarter": 1,
                    "year": 2025,
                    "filing_penalty_multiplier": 0.0,
                    "description": "GST amnesty: late filings in selected quarter will not be penalised in credit scoring"
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
                    # Merge saved data but never overwrite seeded users/banks
                    seeded_user_ids = {u["id"] for u in self.data["users"]}
                    seeded_bank_ids = {b["id"] for b in self.data["banks"]}
                    for key, val in saved.items():
                        if key == "users":
                            # Append any saved users not already seeded
                            for u in val:
                                if u.get("id") not in seeded_user_ids:
                                    self.data["users"].append(u)
                        elif key == "banks":
                            for b in val:
                                if b.get("id") not in seeded_bank_ids:
                                    self.data["banks"].append(b)
                        else:
                            self.data[key] = val
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
