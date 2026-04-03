"""
async redis stream producer for msme synthetic data pipeline.
reads parquet chunks from data/raw and publishes records via xadd.
"""

import asyncio
import glob
from pathlib import Path
from typing import Any

import polars as pl
import redis.asyncio as aioredis

from config.settings import Settings


SETTINGS = Settings()
RAW_DATA_PATH = Path("data/raw")
BATCH_SIZE = 500
STREAM_MAP = {
    "gst_invoices": "stream:gst_invoices",
    "upi_transactions": "stream:upi_transactions",
    "eway_bills": "stream:eway_bills",
}


def row_to_redis_fields(row: dict[str, Any]) -> dict[str, str]:
    """
    converts a row dict to redis-compatible string fields.
    none becomes empty string, bools become 1 or 0, floats are rounded to 2dp.
    """
    result: dict[str, str] = {}
    for k, v in row.items():
        if v is None:
            result[k] = ""
        elif isinstance(v, bool):
            result[k] = "1" if v else "0"
        elif isinstance(v, float):
            result[k] = str(round(v, 2))
        elif isinstance(v, int):
            result[k] = str(v)
        else:
            result[k] = str(v)
    return result


async def create_consumer_groups(client: aioredis.Redis) -> None:
    """
    creates consumer groups for all streams using xgroup create with mkstream.
    ignores busygroup error when the group already exists.
    """
    group_name = SETTINGS.consumer_group
    for stream_name in STREAM_MAP.values():
        try:
            await client.xgroup_create(stream_name, group_name, id="$", mkstream=True)
        except aioredis.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise


async def stream_dataframe(
    client: aioredis.Redis,
    df: pl.DataFrame,
    stream_name: str,
) -> int:
    """
    streams all rows of a polars dataframe to the given redis stream via xadd.
    uses pipeline batching of batch_size and prints progress every 1000 records.
    """
    rows = df.to_dicts()
    total = 0
    n_rows = len(rows)
    i = 0

    while i < n_rows:
        batch = rows[i:i + BATCH_SIZE]
        pipe = client.pipeline(transaction=False)
        for row in batch:
            fields = row_to_redis_fields(row)
            pipe.xadd(stream_name, fields, maxlen=SETTINGS.stream_maxlen, approximate=True)
        await pipe.execute()
        total += len(batch)
        i += BATCH_SIZE
        if total % 1000 == 0 or total == n_rows:
            print(f"streamed {total} records to {stream_name}")

    return total


async def load_and_stream(client: aioredis.Redis, signal_type: str) -> int:
    """
    finds all parquet chunk files for the given signal type, loads and streams each.
    returns total records sent to the stream.
    """
    stream_name = STREAM_MAP[signal_type]
    pattern = str(RAW_DATA_PATH / f"{signal_type}_chunk_*.parquet")
    chunk_files = sorted(glob.glob(pattern))
    total = 0
    for file_path in chunk_files:
        df = pl.read_parquet(file_path)
        n = await stream_dataframe(client, df, stream_name)
        total += n
    return total


async def main() -> None:
    """
    entry point for the redis producer.
    connects, creates consumer groups, then streams all signal types.
    """
    print("connecting to redis")
    client = aioredis.from_url(SETTINGS.redis_url)

    print("creating consumer groups")
    await create_consumer_groups(client)

    total = 0
    for signal_type in STREAM_MAP:
        print(f"streaming {signal_type}")
        n = await load_and_stream(client, signal_type)
        total += n
        print(f"completed {signal_type} total {n} records")

    print(f"all streams loaded total {total} records")
    await client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
