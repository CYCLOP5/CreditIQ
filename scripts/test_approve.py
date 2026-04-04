import asyncio
from src.api.mock_db import db
from src.api.router_msme import PermissionAction
import logging

async def test():
    # Simulate msme action
    perm = db.get("permissions", "id", "129ab319-f636-415d-8a29-e1fecf0ed6ae")
    print("BEFORE:", perm)
    
    # Do db update manually like endpoint
    stat = "granted"
    db.update("permissions", "id", "129ab319-f636-415d-8a29-e1fecf0ed6ae", {"status": stat})
    db.update("loan_requests", "id", perm["loan_request_id"], {"status": "bank_reviewing"})
    
    perm_after = db.get("permissions", "id", "129ab319-f636-415d-8a29-e1fecf0ed6ae")
    print("AFTER:", perm_after)

asyncio.run(test())
