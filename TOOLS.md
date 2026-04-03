# Tools, Libraries & Technology Stack

This document details the complete technology stack used in the CreditIQ MSME Credit Scoring Engine.

## Backend & API
* **FastAPI**: Used as the primary async REST API framework for high-throughput endpoints.
* **Uvicorn**: Lightning-fast ASGI server for running FastAPI (`uvicorn[standard]`).
* **Pydantic `>=2.0`**: Utilized for robust schema validation across data ingestion, feature vectors, and API payloads.

## Data Processing & Feature Engineering
* **Polars**: Chosen over Pandas for lightning-fast, lazy-evaluated feature engineering and data transformations.
* **PyArrow**: The Parquet I/O backend for Polars, used for efficient data storage.
* **NumPy & SciPy**: Core numerical computation and sparse matrix support.

## Message Bus & Data Streaming
* **Redis**: Used as an in-memory message bus via Redis Streams (`redis-py` async). It handles the flow of GST invoices, UPI transactions, and E-Way Bills, as well as scoring job requests.

## Machine Learning & AI
* **XGBoost**: Gradient boosted tree classifier (`hist` tree method) used to predict MSME default probabilities.
* **SHAP**: `TreeExplainer` is used to crack open the XGBoost black box, extracting the top 5 feature attributions for score explainability.
* **llama-cpp-python**: Powers the local Phi-3 LLM inference (CPU-only) to translate SHAP values into plain-language bullet points.

## Fraud Detection
* **NetworkX**: Core engine for constructing directed multigraphs and running algorithms like SCC (Strongly Connected Components) and bounded simple cycle enumeration to detect circular trading fraud.

## Synthetic Data Generation
* **Faker**: Generates synthetic PII and structural MSME profile data.
* **SDV** (Synthetic Data Vault): Integrated for modeling complex synthetic distribution patterns.

## Testing, Logging & Build Systems
* **hatchling**: Python build backend configured in `pyproject.toml` for standard packaging and task definitions.
* **pytest** & **pytest-asyncio**: The standard testing framework with full async support via `httpx`.
* **psutil**: System-level cross-platform library to monitor memory pressure (RSS) during Polars pipeline execution and prevent OOM crashes.

## Frontend Dashboard
* **React 18** (core & DOM): The UI library powering the interactive dashboard.
* **Vite 5**: Fast build tool and development server for the React app.
* **Plotly**: For advanced and interactive charting.
* **Streamlit**: As an alternative dashboard and visualization engine.
