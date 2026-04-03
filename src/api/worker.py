"""
standalone async saga worker for msme credit scoring pipeline
reads score requests from redis stream processes full pipeline writes results
run as python -m src.api.worker
"""

from __future__ import annotations

import asyncio
import glob
import json
import random
import socket
from datetime import datetime, timezone
from pathlib import Path

import polars as pl
import redis.asyncio as aioredis

from config.settings import settings
from src.features.schemas import EngineeredFeatureVector
from src.fraud.cycle_detector import CycleDetector, merge_fraud_into_features
from src.fraud.graph_builder import FraudGraphBuilder
from src.scoring.explainer import CreditExplainer
from src.scoring.model import CreditScorer
from src.llm.translator import ShapTranslator

CONSUMER_GROUP = "cg_score_worker"
CONSUMER_NAME = f"worker-{socket.gethostname()}"
BLOCK_MS = 5000
MAX_RETRY_SLEEP = 5.0


def _infer_msme_category(fv: EngineeredFeatureVector) -> str:
    """
    infers msme category from quarterly gst volume proxy
    micro below 5cr annual small 5cr to 50cr medium above 50cr
    """
    annual_proxy = fv.gst_90d_value * 4
    if annual_proxy < 50_000_000:
        return "micro"
    if annual_proxy < 500_000_000:
        return "small"
    return "medium"


def _load_feature_vector_from_cache(gstin: str) -> EngineeredFeatureVector | None:
    """
    tries to load parquet cached feature vector for given gstin
    returns none if partition does not exist
    """
    path = Path(settings.parquet_cache_path) / f"gstin={gstin}" / "features.parquet"
    if not path.exists():
        return None
    df = pl.scan_parquet(str(path)).collect()
    if df.height == 0:
        return None
    row = df.row(0, named=True)
    row["gstin"] = gstin
    return EngineeredFeatureVector(**row)


def _load_demo_feature_vector(gstin: str) -> EngineeredFeatureVector | None:
    """
    fallback loads a random cached gstin feature vector and relabels with requested gstin
    used when no real data exists for the requested gstin
    """
    cache_root = Path(settings.parquet_cache_path)
    existing = sorted(cache_root.glob("gstin=*/features.parquet"))
    if not existing:
        return None
    chosen = random.choice(existing)
    df = pl.scan_parquet(str(chosen)).collect()
    if df.height == 0:
        return None
    row = df.row(0, named=True)
    row["gstin"] = gstin
    print(f"demo mode using cached features for {gstin}")
    return EngineeredFeatureVector(**row)


def _load_feature_vector_from_raw(gstin: str) -> EngineeredFeatureVector | None:
    """
    scans raw parquet files for gstin records and computes feature vector
    returns none if no matching raw data found
    """
    raw = Path(settings.raw_data_path)
    gst_files = sorted(glob.glob(str(raw / "gst_invoices_chunk_*.parquet")))
    upi_files = sorted(glob.glob(str(raw / "upi_transactions_chunk_*.parquet")))
    ewb_files = sorted(glob.glob(str(raw / "eway_bills_chunk_*.parquet")))

    if not gst_files:
        return None

    try:
        gst_df = pl.read_parquet(gst_files).with_columns(
            pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False)
        )
        gst_match = gst_df.filter(pl.col("gstin") == gstin)
        if gst_match.height == 0:
            return None

        if not upi_files:
            upi_df = pl.DataFrame(schema={
                "gstin": pl.Utf8,
                "vpa": pl.Utf8,
                "timestamp": pl.Datetime,
                "amount": pl.Float64,
                "direction": pl.Utf8,
                "counterparty_vpa": pl.Utf8,
                "txn_type": pl.Utf8,
                "status": pl.Utf8,
            })
        else:
            upi_df = pl.read_parquet(upi_files).with_columns(
                pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False)
            )

        if not ewb_files:
            ewb_df = pl.DataFrame(schema={
                "gstin": pl.Utf8,
                "timestamp": pl.Datetime,
                "tot_inv_value": pl.Float64,
                "trans_distance": pl.Int64,
                "doc_date": pl.Utf8,
                "main_hsn_code": pl.Utf8,
            })
        else:
            ewb_df = (
                pl.read_parquet(ewb_files)
                .rename({
                    "totInvValue": "tot_inv_value",
                    "transDistance": "trans_distance",
                    "docDate": "doc_date",
                    "mainHsnCode": "main_hsn_code",
                })
                .with_columns(
                    pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False)
                )
            )

        from src.features.engine import FeatureEngine
        engine = FeatureEngine(cache_dir=settings.parquet_cache_path)
        return engine.compute_features(gstin, gst_df, upi_df, ewb_df)

    except Exception as exc:
        print(f"raw feature load failed {exc}")
        return None


def _resolve_feature_vector(gstin: str) -> EngineeredFeatureVector:
    """
    resolves feature vector with three tier fallback
    cache path then raw data path then demo random gstin fallback
    raises runtimeerror if all tiers fail
    """
    fv = _load_feature_vector_from_cache(gstin)
    if fv is not None:
        print(f"cache hit for {gstin}")
        return fv

    print(f"cache miss for {gstin} trying raw")
    fv = _load_feature_vector_from_raw(gstin)
    if fv is not None:
        return fv

    print(f"no raw data for {gstin} loading demo fallback")
    fv = _load_demo_feature_vector(gstin)
    if fv is not None:
        return fv

    raise RuntimeError(f"no feature data available for {gstin}")


def _load_fraud_graph() -> object:
    """
    loads all edge parquet files from graphs directory into a multigraph
    returns empty graph if no edge files found
    """
    graphs_path = Path(settings.graphs_path)
    edge_files = sorted(graphs_path.glob("edges_*.parquet"))
    if not edge_files:
        import networkx as nx
        return nx.MultiDiGraph()

    frames = [pl.read_parquet(str(f)) for f in edge_files]
    combined = pl.concat(frames)
    builder = FraudGraphBuilder(edge_dir=str(graphs_path))
    return builder.build_from_dataframe(combined)


def _run_fraud_step(fv: EngineeredFeatureVector) -> EngineeredFeatureVector:
    """
    loads transaction graph runs cycle detector merges results into feature vector
    returns unchanged vector if graph is empty or detection fails
    """
    try:
        graph = _load_fraud_graph()
        if graph.number_of_edges() == 0:
            return fv
        detector = CycleDetector()
        fraud_results = detector.detect(graph)
        updated = merge_fraud_into_features(fraud_results, [fv])
        return updated[0]
    except Exception as exc:
        print(f"fraud step error {exc}")
        return fv


async def run_saga(
    redis_client: aioredis.Redis,
    task_id: str,
    gstin: str,
    scorer: CreditScorer,
    explainer: CreditExplainer,
    translator: ShapTranslator | None,
) -> None:
    """
    executes full scoring saga for one task
    writes status=processing then complete or failed to redis hash
    publishes realtime progress events to redis pub sub
    """
    await redis_client.hset(f"score:{task_id}", "status", "processing")
    await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "processing", "step": "starting saga"}))
    print(f"saga start task_id={task_id} gstin={gstin}")

    try:
        loop = asyncio.get_running_loop()

        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "processing", "step": "resolving features"}))
        fv = await loop.run_in_executor(None, _resolve_feature_vector, gstin)

        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "processing", "step": "running fraud graph detection"}))
        fv = await loop.run_in_executor(None, _run_fraud_step, fv)

        msme_category = _infer_msme_category(fv)
        
        use_upi_model = fv.months_active_gst < 3
        model_name = "upi_heavy" if use_upi_model else "full"
        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "processing", "step": f"scoring features dynamic routing {model_name}"}))
        print(f"routing to {model_name} model active gst months {fv.months_active_gst}")

        score_payload = await loop.run_in_executor(
            None, scorer.score_feature_vector, fv, msme_category, use_upi_model
        )

        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "processing", "step": "generating shap explanations"}))
        feature_dict = fv.model_dump()
        explain_result = await loop.run_in_executor(
            None, explainer.explain_single, feature_dict, explainer.feature_columns, use_upi_model
        )
        top_5_features: list[dict] = explain_result["top_5_features"]

        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "processing", "step": "translating explanations to plain language"}))
        top_reasons: list[str]
        if translator is not None:
            try:
                top_reasons = await loop.run_in_executor(
                    None,
                    translator.translate,
                    gstin,
                    score_payload["credit_score"],
                    score_payload["risk_band"],
                    top_5_features,
                )
            except Exception as exc:
                print(f"llm translate failed using fallback {exc}")
                top_reasons = [f["feature_name"] for f in top_5_features]
        else:
            top_reasons = [f["feature_name"] for f in top_5_features]

        while len(top_reasons) < 5:
            top_reasons.append("insufficient data for additional reason")
        top_reasons = top_reasons[:5]

        fraud_flag = fv.fraud_ring_flag
        fraud_details_json = "null"
        if fraud_flag and fv.fraud_confidence > 0:
            fraud_details_json = json.dumps({
                "confidence": fv.fraud_confidence,
                "cycle_velocity": fv.cycle_velocity,
                "cycle_recurrence": fv.cycle_recurrence,
            })

        score_freshness = datetime.now(timezone.utc).isoformat()

        await redis_client.hset(
            f"score:{task_id}",
            mapping={
                "status": "complete",
                "gstin": gstin,
                "credit_score": str(score_payload["credit_score"]),
                "risk_band": score_payload["risk_band"],
                "top_reasons": json.dumps(top_reasons),
                "recommended_wc_amount": str(score_payload["recommended_wc_amount"]),
                "recommended_term_amount": str(score_payload["recommended_term_amount"]),
                "msme_category": score_payload["msme_category"],
                "cgtmse_eligible": "true" if score_payload["cgtmse_eligible"] else "false",
                "mudra_eligible": "true" if score_payload["mudra_eligible"] else "false",
                "fraud_flag": "true" if fraud_flag else "false",
                "fraud_details": fraud_details_json,
                "score_freshness": score_freshness,
                "data_maturity_months": str(fv.months_active_gst),
            },
        )

        print(f"saga complete task_id={task_id} score={score_payload['credit_score']}")
        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "complete"}))

    except Exception as exc:
        print(f"saga failed task_id={task_id} error={exc}")
        await redis_client.hset(
            f"score:{task_id}",
            mapping={
                "status": "failed",
                "error": str(exc),
            },
        )
        await redis_client.publish(f"updates:{task_id}", json.dumps({"status": "failed", "error": str(exc)}))


async def _ensure_consumer_group(redis_client: aioredis.Redis) -> None:
    """
    creates consumer group for stream:score_requests with mkstream
    ignores busygroup error if group already exists
    """
    try:
        await redis_client.xgroup_create(
            settings.stream_score_requests,
            CONSUMER_GROUP,
            id="0",
            mkstream=True,
        )
        print(f"consumer group {CONSUMER_GROUP} created")
    except Exception as exc:
        if "BUSYGROUP" not in str(exc):
            raise
        print(f"consumer group {CONSUMER_GROUP} already exists")


def _load_scorer() -> CreditScorer:
    """
    loads credit scorer from models path raises on missing model file
    """
    return CreditScorer(model_dir=settings.models_path)


def _load_explainer(scorer: CreditScorer) -> CreditExplainer:
    """
    creates credit explainer sharing dual models and feature columns from scorer
    """
    return CreditExplainer(scorer)


def _load_translator() -> ShapTranslator | None:
    """
    attempts to load shap translator from phi3 gguf path
    returns none if gguf file is missing logs warning
    """
    phi3_path = Path(settings.phi3_model_path)
    if not phi3_path.exists():
        print(f"phi3 model not found at {phi3_path} llm disabled")
        return None
    try:
        return ShapTranslator(model_path=phi3_path)
    except Exception as exc:
        print(f"phi3 load failed {exc} llm disabled")
        return None


async def main() -> None:
    """
    worker entry point connects to redis loads models starts consume loop
    reads from stream:score_requests via xreadgroup processes each message
    """
    print(f"worker starting consumer={CONSUMER_NAME}")

    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)

    await _ensure_consumer_group(redis_client)

    print("loading scoring models")
    loop = asyncio.get_event_loop()

    scorer: CreditScorer | None = None
    explainer: CreditExplainer | None = None

    try:
        scorer = await loop.run_in_executor(None, _load_scorer)
        explainer = await loop.run_in_executor(None, _load_explainer, scorer)
    except Exception as exc:
        print(f"model load failed {exc} worker cannot continue")
        await redis_client.aclose()
        return

    translator = await loop.run_in_executor(None, _load_translator)

    print("worker ready consuming stream:score_requests")

    while True:
        try:
            result = await redis_client.xreadgroup(
                groupname=CONSUMER_GROUP,
                consumername=CONSUMER_NAME,
                streams={settings.stream_score_requests: ">"},
                count=1,
                block=BLOCK_MS,
            )

            if not result:
                continue

            for _stream_name, messages in result:
                for msg_id, fields in messages:
                    task_id: str = fields.get("task_id", "")
                    gstin: str = fields.get("gstin", "")

                    if not task_id or not gstin:
                        print(f"malformed message {msg_id} skipping")
                        await redis_client.xack(
                            settings.stream_score_requests, CONSUMER_GROUP, msg_id
                        )
                        continue

                    await run_saga(
                        redis_client=redis_client,
                        task_id=task_id,
                        gstin=gstin,
                        scorer=scorer,
                        explainer=explainer,
                        translator=translator,
                    )

                    await redis_client.xack(
                        settings.stream_score_requests, CONSUMER_GROUP, msg_id
                    )

        except asyncio.CancelledError:
            print("worker cancelled shutting down")
            break
        except Exception as exc:
            print(f"worker loop error {exc} retrying in {MAX_RETRY_SLEEP}s")
            await asyncio.sleep(MAX_RETRY_SLEEP)

    await redis_client.aclose()
    print("worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
