from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    application settings loaded environment or env file
    """

    redis_url: str = "redis://localhost:6379/0"
    redis_max_memory_mb: int = 2048
    max_polars_memory_mb: int = 3072
    max_networkx_memory_mb: int = 1536
    parquet_cache_path: str = "data/features"
    raw_data_path: str = "data/raw"
    models_path: str = "data/models"
    graphs_path: str = "data/graphs"
    xgb_model_path: str = "data/models/xgb_credit.ubj"
    phi3_model_path: str = "data/models/phi-3-mini-128k-instruct-q4_k_m.gguf"
    phi3_n_gpu_layers: int = 33
    phi3_max_tokens: int = 512
    uvicorn_workers: int = 2
    stream_gst: str = "stream:gst_invoices"
    stream_upi: str = "stream:upi_transactions"
    stream_eway: str = "stream:eway_bills"
    stream_score_requests: str = "stream:score_requests"
    consumer_group: str = "cg_feature_engine"
    stream_maxlen: int = 10000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
