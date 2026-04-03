"""
synthetic msme data generator phase 1 credit scoring pipeline
generates gst invoices upi transactions eway bills 250 profiles
"""

import random
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import polars as pl
from faker import Faker

from config.settings import Settings


SETTINGS = Settings()

STATE_CODES: list[int] = [6, 7, 8, 9, 19, 22, 24, 27, 29, 33, 36]

BANK_HANDLES: list[str] = ["okaxis", "okhdfcbank", "okicici", "oksbi", "ybl", "ibl", "paytm"]

DOC_TYPES: list[str] = ["INV", "INV", "INV", "CHL", "BIL"]

VEHICLE_PREFIXES: list[str] = ["KA", "MH", "DL", "TN", "GJ", "RJ", "UP", "WB"]

HSN_SECTORS: dict[str, list[str]] = {
    "iron_steel": ["7201", "7202", "7204", "7207", "7208", "7209", "7210", "7213"],
    "textiles": ["5208", "5209", "5210", "5211", "6001", "6002", "6006", "5201"],
    "food_grains": ["1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008"],
    "chemicals": ["2801", "2802", "2803", "2804", "2901", "2902", "3801", "3802"],
    "machinery": ["8401", "8402", "8403", "8404", "8405", "8406", "8407", "8408"],
    "electronics": ["8501", "8502", "8503", "8504", "8505", "8506", "8507", "8508"],
    "plastics": ["3901", "3902", "3903", "3904", "3905", "3906", "3907", "3908"],
    "paper": ["4801", "4802", "4803", "4804", "4805", "4701", "4702", "4703"],
}

HSN_PRODUCT_MAP: dict[str, str] = {
    "7201": "pig iron",
    "7202": "ferro alloys",
    "7204": "ferrous scrap",
    "7207": "semi-finished steel",
    "7208": "flat-rolled steel",
    "7209": "cold-rolled steel",
    "7210": "coated steel",
    "7213": "steel wire rod",
    "5208": "woven cotton fabric",
    "5209": "heavy cotton fabric",
    "5210": "mixed cotton fabric",
    "5211": "denim fabric",
    "6001": "pile fabric",
    "6002": "knitted fabric",
    "6006": "technical fabric",
    "5201": "raw cotton",
    "1001": "wheat",
    "1002": "rye",
    "1003": "barley",
    "1004": "oats",
    "1005": "maize",
    "1006": "rice",
    "1007": "sorghum",
    "1008": "buckwheat",
    "2801": "fluorine chlorine",
    "2802": "sulphur",
    "2803": "carbon black",
    "2804": "hydrogen",
    "2901": "acyclic hydrocarbons",
    "2902": "cyclic hydrocarbons",
    "3801": "artificial graphite",
    "3802": "activated carbon",
    "8401": "nuclear reactor parts",
    "8402": "steam boilers",
    "8403": "heating boilers",
    "8404": "auxiliary plant",
    "8405": "gas generators",
    "8406": "steam turbines",
    "8407": "spark ignition engines",
    "8408": "compression engines",
    "8501": "electric motors",
    "8502": "generators",
    "8503": "motor parts",
    "8504": "transformers",
    "8505": "electromagnets",
    "8506": "primary cells",
    "8507": "batteries",
    "8508": "vacuum cleaners",
    "3901": "polyethylene",
    "3902": "polypropylene",
    "3903": "polystyrene",
    "3904": "pvc resin",
    "3905": "polyvinyl acetate",
    "3906": "acrylic polymers",
    "3907": "polyacetals",
    "3908": "polyamides",
    "4801": "newsprint",
    "4802": "writing paper",
    "4803": "tissue paper",
    "4804": "kraft paper",
    "4805": "other paper",
    "4701": "mechanical pulp",
    "4702": "chemical pulp",
    "4703": "kraft pulp",
}

PROFILE_TYPES: list[str] = [
    "GENUINE_HEALTHY",
    "GENUINE_STRUGGLING",
    "SHELL_CIRCULAR",
    "PAPER_TRADER",
    "NEW_TO_CREDIT",
]

PROFILE_WEIGHTS: list[float] = [0.40, 0.25, 0.15, 0.10, 0.10]

N_PROFILES: int = 250
CHUNK_SIZE: int = 10000
RAW_DATA_PATH: Path = Path("data/raw")


def generate_gstin(state_code: int, fake: Faker) -> str:
    """
    generates validformat gstin given state code
    pan portion follows 5letter 4digit 1letter pattern
    """
    pan_letters_a = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    pan_digits = "".join(random.choices("0123456789", k=4))
    pan_letter_b = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    pan_like = pan_letters_a + pan_digits + pan_letter_b
    entity = str(random.randint(1, 9))
    checksum = str(random.randint(0, 9))
    return f"{state_code:02d}{pan_like}{entity}Z{checksum}"


def generate_vpa(business_slug: str, fake: Faker) -> str:
    """
    generates upi vpa business name slug
    """
    slug = business_slug.lower().replace(" ", "")[:12]
    handle = random.choice(BANK_HANDLES)
    return f"{slug}@{handle}"


def generate_vehicle_no(fake: Faker) -> str:
    """
    generates synthetic indian vehicle registration number
    """
    prefix = random.choice(VEHICLE_PREFIXES)
    district = f"{random.randint(10, 99)}"
    series = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
    number = f"{random.randint(1000, 9999)}"
    return f"{prefix}{district}{series}{number}"


def build_profiles(fake: Faker) -> list[dict]:
    """
    builds master list 250 msme profiles assigned types ring ids
    """
    profile_type_assignments = random.choices(PROFILE_TYPES, weights=PROFILE_WEIGHTS, k=N_PROFILES)

    age_map: dict[str, tuple[int, int]] = {
        "GENUINE_HEALTHY": (12, 36),
        "GENUINE_STRUGGLING": (6, 36),
        "SHELL_CIRCULAR": (12, 30),
        "PAPER_TRADER": (6, 24),
        "NEW_TO_CREDIT": (1, 6),
    }

    profiles: list[dict] = []
    for ptype in profile_type_assignments:
        state_code = random.choice(STATE_CODES)
        business_name = fake.company()
        gstin = generate_gstin(state_code, fake)
        vpa = generate_vpa(business_name, fake)
        lo, hi = age_map[ptype]
        age_months = random.randint(lo, hi)
        sector = random.choice(list(HSN_SECTORS.keys()))
        profiles.append({
            "gstin": gstin,
            "vpa": vpa,
            "business_name": business_name,
            "profile_type": ptype,
            "business_age_months": age_months,
            "state_code": state_code,
            "hsn_sector": sector,
            "circular_ring_id": None,
            "created_at": datetime.now(),
        })

    shell_indices = [i for i, p in enumerate(profiles) if p["profile_type"] == "SHELL_CIRCULAR"]
    random.shuffle(shell_indices)

    ring_counter = 1
    i = 0
    while i < len(shell_indices):
        chunk_size = 4 if (len(shell_indices) - i) >= 4 else 3
        chunk = shell_indices[i:i + chunk_size]
        if len(chunk) < 3:
            chunk_size = len(chunk)
            chunk = shell_indices[i:i + chunk_size]
        ring_id = f"ring_{ring_counter:03d}"
        for idx in chunk:
            profiles[idx]["circular_ring_id"] = ring_id
        ring_counter += 1
        i += chunk_size

    return profiles


def get_active_period(profile: dict) -> tuple[datetime, datetime]:
    """
    returns start end datetimes profile based business age
    """
    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=profile["business_age_months"] * 30)
    return start_dt, end_dt


def sample_timestamps(start: datetime, end: datetime, n: int, burst: bool = False) -> list[datetime]:
    """
    generates n timestamps between start end
    burst mode clusters into 23 activity bursts separated dormant periods
    nonburst exponential interarrival times natural clustering
    """
    total_seconds = (end - start).total_seconds()
    if n == 0:
        return []

    if burst:
        n_bursts = random.randint(2, 3)
        burst_center_offsets = sorted(
            random.uniform(0.15, 0.85) * total_seconds for _ in range(n_bursts)
        )
        burst_width = total_seconds * 0.04
        timestamps: list[datetime] = []
        for k in range(n):
            center = burst_center_offsets[k % n_bursts]
            offset = center + random.gauss(0, burst_width)
            offset = max(0.0, min(total_seconds - 1.0, offset))
            timestamps.append(start + timedelta(seconds=offset))
        return sorted(timestamps)

    intervals = np.random.exponential(scale=total_seconds / max(n, 1), size=n)
    cumulative = np.cumsum(intervals)
    if cumulative[-1] > 0:
        cumulative = cumulative * (total_seconds / cumulative[-1])
    return sorted(start + timedelta(seconds=float(s)) for s in cumulative)


def generate_gst_invoices(profiles: list[dict], fake: Faker) -> pl.DataFrame:
    """
    generates gst invoice records profiles returns single polars dataframe
    invoice counts taxable values filing behaviour vary profile type
    """
    all_gstins = [p["gstin"] for p in profiles]

    n_invoice_map: dict[str, tuple[int, int]] = {
        "GENUINE_HEALTHY": (2, 5),
        "GENUINE_STRUGGLING": (1, 3),
        "SHELL_CIRCULAR": (3, 6),
        "PAPER_TRADER": (4, 8),
        "NEW_TO_CREDIT": (1, 8),
    }

    lognormal_params: dict[str, tuple[float, float]] = {
        "GENUINE_HEALTHY": (10.8, 0.8),
        "GENUINE_STRUGGLING": (9.9, 1.2),
        "SHELL_CIRCULAR": (12.2, 0.4),
        "PAPER_TRADER": (12.6, 0.3),
        "NEW_TO_CREDIT": (9.6, 1.5),
    }

    filing_weights: dict[str, list[float]] = {
        "GENUINE_HEALTHY": [0.85, 0.12, 0.03],
        "GENUINE_STRUGGLING": [0.55, 0.35, 0.10],
        "SHELL_CIRCULAR": [0.70, 0.28, 0.02],
        "PAPER_TRADER": [0.60, 0.30, 0.10],
        "NEW_TO_CREDIT": [0.75, 0.20, 0.05],
    }

    records: list[dict] = []

    print("generating gst invoices for genuine healthy profiles")
    for profile in profiles:
        ptype = profile["profile_type"]
        age = profile["business_age_months"]

        if ptype == "NEW_TO_CREDIT":
            n_invoices = random.randint(1, 8)
        else:
            lo, hi = n_invoice_map[ptype]
            n_invoices = age * random.randint(lo, hi)

        start_dt, end_dt = get_active_period(profile)
        timestamps = sample_timestamps(start_dt, end_dt, n_invoices, burst=False)

        mean, sigma = lognormal_params[ptype]
        weights = filing_weights[ptype]

        for ts in timestamps:
            taxable_value = float(np.random.lognormal(mean=mean, sigma=sigma))
            gst_amount = taxable_value * 0.18

            if random.random() < 0.30:
                buyer_gstin = "URP"
            else:
                other_gstins = [g for g in all_gstins if g != profile["gstin"]]
                buyer_gstin = random.choice(other_gstins) if other_gstins else "URP"

            filing_status = random.choices(
                ["ontime", "delayed", "missing"], weights=weights
            )[0]

            if filing_status == "ontime":
                filing_delay_days = 0
            elif filing_status == "delayed":
                filing_delay_days = int(np.random.exponential(scale=12))
            else:
                filing_delay_days = int(np.random.exponential(scale=30))

            records.append({
                "gstin": profile["gstin"],
                "invoice_id": f"INV{int(ts.timestamp() * 1000)}",
                "timestamp": ts.isoformat(),
                "taxable_value": round(taxable_value, 2),
                "gst_amount": round(gst_amount, 2),
                "buyer_gstin": buyer_gstin,
                "filing_status": filing_status,
                "filing_delay_days": filing_delay_days,
                "synthetic_batch_id": "batch_001",
            })

    return pl.DataFrame(records)


def generate_upi_transactions(
    profiles: list[dict],
    gstin_to_profile: dict[str, dict],
    fake: Faker,
) -> pl.DataFrame:
    """
    generates upi transaction records profiles
    shell circular profiles exhibit burst patterns ring counterparty rotation
    """
    n_txn_map: dict[str, tuple[int, int]] = {
        "GENUINE_HEALTHY": (20, 50),
        "GENUINE_STRUGGLING": (5, 15),
        "SHELL_CIRCULAR": (30, 60),
        "PAPER_TRADER": (10, 20),
        "NEW_TO_CREDIT": (5, 30),
    }

    lognormal_params: dict[str, tuple[float, float]] = {
        "GENUINE_HEALTHY": (9.5, 0.9),
        "GENUINE_STRUGGLING": (8.8, 1.1),
        "SHELL_CIRCULAR": (11.5, 0.5),
        "PAPER_TRADER": (10.0, 0.7),
        "NEW_TO_CREDIT": (8.2, 1.3),
    }

    p2m_prob: dict[str, float] = {
        "GENUINE_HEALTHY": 0.70,
        "GENUINE_STRUGGLING": 0.45,
        "SHELL_CIRCULAR": 0.0,
        "PAPER_TRADER": 0.30,
        "NEW_TO_CREDIT": 0.55,
    }

    inbound_prob: dict[str, float] = {
        "GENUINE_HEALTHY": 0.57,
        "GENUINE_STRUGGLING": 0.50,
        "SHELL_CIRCULAR": 0.50,
        "PAPER_TRADER": 0.50,
        "NEW_TO_CREDIT": 0.50,
    }

    status_weights: dict[str, list[float]] = {
        "GENUINE_HEALTHY": [0.97, 0.02, 0.01],
        "GENUINE_STRUGGLING": [0.89, 0.03, 0.08],
        "SHELL_CIRCULAR": [0.98, 0.01, 0.01],
        "PAPER_TRADER": [0.93, 0.03, 0.04],
        "NEW_TO_CREDIT": [0.92, 0.04, 0.04],
    }

    ring_vpas: dict[str, list[str]] = {}
    ring_profile_pos: dict[str, int] = {}
    for p in profiles:
        ring_id: Optional[str] = p.get("circular_ring_id")
        if ring_id is not None:
            if ring_id not in ring_vpas:
                ring_vpas[ring_id] = []
            ring_profile_pos[p["gstin"]] = len(ring_vpas[ring_id])
            ring_vpas[ring_id].append(p["vpa"])

    all_vpas = [p["vpa"] for p in profiles]

    records: list[dict] = []

    print("generating upi transactions for all profiles")
    for profile in profiles:
        ptype = profile["profile_type"]
        age = profile["business_age_months"]

        if ptype == "NEW_TO_CREDIT":
            n_txns = random.randint(5, 30)
        else:
            lo, hi = n_txn_map[ptype]
            n_txns = age * random.randint(lo, hi)

        is_burst = ptype == "SHELL_CIRCULAR"
        start_dt, end_dt = get_active_period(profile)
        timestamps = sample_timestamps(start_dt, end_dt, n_txns, burst=is_burst)

        mean, sigma = lognormal_params[ptype]
        p2m = p2m_prob[ptype]
        p_inbound = inbound_prob[ptype]
        sw = status_weights[ptype]

        ring_id = profile.get("circular_ring_id")
        pos = ring_profile_pos.get(profile["gstin"], 0)
        ring_members = ring_vpas.get(ring_id, []) if ring_id else []

        for ts in timestamps:
            amount = float(np.random.lognormal(mean=mean, sigma=sigma))

            direction = random.choices(
                ["inbound", "outbound"],
                weights=[p_inbound, 1.0 - p_inbound],
            )[0]

            if ptype == "SHELL_CIRCULAR" and ring_members:
                if random.random() < 0.70:
                    target_pos = (pos + 1) % len(ring_members)
                    counterparty_vpa = ring_members[target_pos]
                else:
                    counterparty_vpa = random.choice(all_vpas)
            else:
                counterparty_vpa = random.choice(all_vpas)

            txn_type = random.choices(
                ["P2M", "P2P"],
                weights=[p2m, 1.0 - p2m],
            )[0]

            status = random.choices(
                ["success", "failed_technical", "failed_funds"],
                weights=sw,
            )[0]

            records.append({
                "gstin": profile["gstin"],
                "vpa": profile["vpa"],
                "timestamp": ts.isoformat(),
                "amount": round(amount, 2),
                "direction": direction,
                "counterparty_vpa": counterparty_vpa,
                "txn_type": txn_type,
                "status": status,
                "synthetic_batch_id": "batch_001",
            })

    return pl.DataFrame(records)


def generate_eway_bills(profiles: list[dict], fake: Faker) -> pl.DataFrame:
    """
    generates eway bill records official field structure
    paper traders produce bills low distance mixed hsn codes
    shell companies produce bills reflecting minimal physical goods movement
    """
    all_gstins = [p["gstin"] for p in profiles]
    gstin_to_state: dict[str, int] = {p["gstin"]: p["state_code"] for p in profiles}
    gstin_to_name: dict[str, str] = {p["gstin"]: p["business_name"] for p in profiles}

    all_sector_keys = list(HSN_SECTORS.keys())

    records: list[dict] = []

    print("generating eway bills for all profiles")
    for profile in profiles:
        ptype = profile["profile_type"]
        age = profile["business_age_months"]

        if ptype == "GENUINE_HEALTHY":
            n_bills = age * random.randint(2, 6)
        elif ptype == "GENUINE_STRUGGLING":
            n_bills = age * random.randint(1, 3)
        elif ptype == "SHELL_CIRCULAR":
            n_bills = age * random.randint(0, 2)
        elif ptype == "PAPER_TRADER":
            n_bills = age * random.randint(5, 10)
        else:
            n_bills = random.randint(0, 5)

        if n_bills == 0:
            continue

        start_dt, end_dt = get_active_period(profile)
        timestamps = sample_timestamps(start_dt, end_dt, n_bills, burst=False)

        if ptype == "GENUINE_HEALTHY":
            txbl_mean, txbl_sigma = 10.5, 0.8
        elif ptype == "PAPER_TRADER":
            txbl_mean, txbl_sigma = 12.5, 0.3
        else:
            txbl_mean, txbl_sigma = 10.0, 1.0

        for ts in timestamps:
            if ptype == "PAPER_TRADER":
                if random.random() < 0.60:
                    eligible = [s for s in all_sector_keys if s != profile["hsn_sector"]]
                    chosen_sector = random.choice(eligible) if eligible else profile["hsn_sector"]
                else:
                    chosen_sector = profile["hsn_sector"]
            else:
                if random.random() < 0.10:
                    chosen_sector = random.choice(all_sector_keys)
                else:
                    chosen_sector = profile["hsn_sector"]

            hsn_code = random.choice(HSN_SECTORS[chosen_sector])
            product_name = HSN_PRODUCT_MAP.get(hsn_code, "goods")

            if random.random() < 0.20:
                to_gstin = "URP"
                to_trd_name = "unregistered person"
                to_state_code = profile["state_code"]
            else:
                other_gstins = [g for g in all_gstins if g != profile["gstin"]]
                to_gstin = random.choice(other_gstins) if other_gstins else "URP"
                to_trd_name = gstin_to_name.get(to_gstin, "buyer")
                to_state_code = gstin_to_state.get(to_gstin, profile["state_code"])

            intra_state = profile["state_code"] == to_state_code

            trans_mode = random.choices([1, 2, 3, 4], weights=[0.70, 0.20, 0.05, 0.05])[0]

            if ptype == "PAPER_TRADER":
                trans_distance = random.randint(1, 5)
            else:
                trans_distance = random.randint(50, 2000)

            taxable_amount = float(np.random.lognormal(mean=txbl_mean, sigma=txbl_sigma))

            cgst_value = round(taxable_amount * 0.09, 2) if intra_state else 0.0
            sgst_value = round(taxable_amount * 0.09, 2) if intra_state else 0.0
            igst_value = 0.0 if intra_state else round(taxable_amount * 0.18, 2)
            cess_value = 0.0
            oth_value = 0.0
            tot_inv_value = round(taxable_amount + cgst_value + sgst_value + igst_value, 2)

            records.append({
                "gstin": profile["gstin"],
                "eway_id": f"EWB{int(ts.timestamp())}",
                "timestamp": ts.isoformat(),
                "userGstin": profile["gstin"],
                "supplyType": random.choices(["O", "I"], weights=[0.8, 0.2])[0],
                "subSupplyType": random.choices([1, 4, 9, 1], weights=[0.7, 0.1, 0.1, 0.1])[0],
                "subSupplyDesc": "",
                "docType": random.choice(DOC_TYPES),
                "docNo": fake.bothify(text="???###??##"),
                "docDate": ts.strftime("%d/%m/%Y"),
                "transType": random.choices([1, 2], weights=[0.8, 0.2])[0],
                "fromGstin": profile["gstin"],
                "fromTrdName": profile["business_name"],
                "fromAddr1": fake.street_address()[:120],
                "fromAddr2": "",
                "fromPlace": fake.city()[:50],
                "fromPincode": random.randint(100000, 999999),
                "fromStateCode": profile["state_code"],
                "actualFromStateCode": profile["state_code"],
                "toGstin": to_gstin,
                "toTrdName": to_trd_name,
                "toAddr1": fake.street_address()[:120],
                "toAddr2": "",
                "toPlace": fake.city()[:50],
                "toPincode": random.randint(100000, 999999),
                "toStateCode": to_state_code,
                "actualToStateCode": to_state_code,
                "transMode": trans_mode,
                "transDistance": trans_distance,
                "transporterName": fake.company()[:25] if trans_mode in [2, 3, 4] else "",
                "transporterId": "",
                "transDocNo": fake.bothify(text="TRN#####") if trans_mode in [2, 3] else "",
                "transDocDate": ts.strftime("%d/%m/%Y") if trans_mode in [2, 3] else "",
                "vehicleNo": generate_vehicle_no(fake) if trans_mode == 1 else "",
                "vehicleType": "R",
                "mainHsnCode": hsn_code,
                "itemList_itemNo": 1,
                "itemList_hsnCode": hsn_code,
                "itemList_productName": product_name,
                "itemList_productDesc": product_name,
                "itemList_quantity": random.randint(1, 500),
                "itemList_qtyUnit": "KGS",
                "itemList_taxableAmount": round(taxable_amount, 2),
                "itemList_sgstRate": 9.0 if intra_state else 0.0,
                "itemList_cgstRate": 9.0 if intra_state else 0.0,
                "itemList_igstRate": 0.0 if intra_state else 18.0,
                "itemList_cessRate": 0.0,
                "itemList_cessNonAdvol": 0.0,
                "totalValue": round(taxable_amount, 2),
                "cgstValue": cgst_value,
                "sgstValue": sgst_value,
                "igstValue": igst_value,
                "cessValue": cess_value,
                "TotNonAdvolVal": 0.0,
                "OthValue": oth_value,
                "totInvValue": tot_inv_value,
                "synthetic_batch_id": "batch_001",
            })

    return pl.DataFrame(records)


def write_chunks(df: pl.DataFrame, prefix: str, chunk_size: int) -> int:
    """
    writes dataframe parquet files chunks returns chunk count
    """
    RAW_DATA_PATH.mkdir(parents=True, exist_ok=True)
    n_rows = len(df)
    n_chunks = math.ceil(n_rows / chunk_size)
    for i in range(n_chunks):
        chunk = df.slice(i * chunk_size, chunk_size)
        out_path = RAW_DATA_PATH / f"{prefix}_chunk_{i:04d}.parquet"
        chunk.write_parquet(out_path)
    return n_chunks


def write_profiles(profiles: list[dict]) -> None:
    """
    serialises profile metadata list parquet file
    """
    RAW_DATA_PATH.mkdir(parents=True, exist_ok=True)
    serialisable = []
    for p in profiles:
        row = dict(p)
        row["created_at"] = row["created_at"].isoformat()
        serialisable.append(row)
    df = pl.DataFrame(serialisable)
    df.write_parquet(RAW_DATA_PATH / "msme_profiles.parquet")


if __name__ == "__main__":
    print("starting synthetic msme data generation")
    fake = Faker("en_IN")
    Faker.seed(42)
    np.random.seed(42)
    random.seed(42)

    print("building msme profiles")
    profiles = build_profiles(fake)
    gstin_to_profile = {p["gstin"]: p for p in profiles}

    print("generating gst invoice stream")
    gst_df = generate_gst_invoices(profiles, fake)
    n_gst_chunks = write_chunks(gst_df, "gst_invoices", CHUNK_SIZE)

    print("generating upi transaction stream")
    upi_df = generate_upi_transactions(profiles, gstin_to_profile, fake)
    n_upi_chunks = write_chunks(upi_df, "upi_transactions", CHUNK_SIZE)

    print("generating eway bill stream")
    ewb_df = generate_eway_bills(profiles, fake)
    n_ewb_chunks = write_chunks(ewb_df, "eway_bills", CHUNK_SIZE)

    print("writing profile metadata")
    write_profiles(profiles)

    print(f"profiles generated {len(profiles)}")
    print(f"gst invoices {len(gst_df)} records in {n_gst_chunks} chunks")
    print(f"upi transactions {len(upi_df)} records in {n_upi_chunks} chunks")
    print(f"eway bills {len(ewb_df)} records in {n_ewb_chunks} chunks")
    print("generation complete")
