# Tools, Libraries, Patterns & Technology Stack

This document details the complete technology stack, algorithmic tools, and architectural patterns used in the CreditIQ MSME Credit Scoring Engine.

## Architectural & Logical Patterns
* **Async Saga Worker Pattern**: **What is it?** A microservices architectural pattern that manages long-running transactions by breaking them into multiple asynchronous local steps rather than one massive synchronous lock. **How we use it:** Employed within the FastAPI ecosystem to orchestrate distributed transactions. Scoring requests are quickly acknowledged (HTTP 202) and pushed to a background worker via `stream:score_requests`, which guarantees non-blocking execution and allows the user to poll for the completed `ScoreResult`.
* **Event-Driven Pub/Sub with Consumer Groups**: **What is it?** A messaging pattern (Publish/Subscribe) where senders distribute messages into topics, and specific groups of consumers share the load of reading those messages, ensuring each message is processed exactly once by the group. **How we use it:** Redis Streams act as a decoupled message bus. The system utilizes `XREADGROUP` to ensure worker processes (`cg_feature_engine`) consume data from the GST, UPI, and EWB streams consistently and reliably, allowing horizontally scalable consumption.
* **Pipeline Batching**: **What is it?** A technique that chains multiple commands into a single network request to a database, rather than waiting for individual round-trip responses. **How we use it:** For data ingestion, `redis-py` pipelines (`client.pipeline()`) aggregate stream insertions (e.g., 500 messages per chunk) to avoid round-trip latency overhead and maximize throughput.

## Backend & API
* **FastAPI**: **What is it?** A modern, highly-performant web framework for building Python APIs based on standard Python type hints. **How we use it:** Used as the primary async REST API framework for high-throughput endpoints.
* **Uvicorn**: **What is it?** An ASGI (Asynchronous Server Gateway Interface) web server implementation for Python. **How we use it:** Lightning-fast ASGI server for running FastAPI (`uvicorn[standard]`).
* **Pydantic `>=2.0`**: **What is it?** A data validation and parsing library that enforces type hints at runtime. **How we use it:** Utilized for robust schema validation across data ingestion, feature vectors, and API payloads.

## Data Processing & Feature Engineering
* **Polars**: **What is it?** A blazingly fast DataFrame library written in Rust that emphasizes lazy evaluation and multi-threading over Pandas' eager execution. **How we use it:** Chosen over Pandas for lightning-fast, lazy-evaluated feature engineering and data transformations.
* **PyArrow**: **What is it?** A cross-language development platform for in-memory, column-oriented structured data processing. **How we use it:** The Parquet I/O backend for Polars, used for efficient data storage.
* **NumPy & SciPy**: **What are they?** The fundamental packages for advanced mathematical and algebraic computing in Python. **How we use them:** Core numerical computation and sparse matrix support.

## Message Bus & Data Streaming
* **Redis**: **What is it?** An open-source, in-memory key-value data store frequently used as a distributed database, message broker, caching layer, and streaming engine. **How we use it:** Used as an in-memory message bus via Redis Streams (`redis-py` async). It handles the flow of GST invoices, UPI transactions, and E-Way Bills, as well as scoring job requests.

## Machine Learning & AI
* **XGBoost Classifier**: **What is it?** An optimized distributed gradient boosting library representing the industry standard for creating non-neural network decision trees on tabular data using the histogram method. **How we use it:** Gradient boosted tree classifier utilizing the `hist` tree method, providing memory-efficient histogram-based node splitting designed for large-scale categorical continuous inputs (ideal for processing the `to_sparse_if_needed` inputs efficiently when >50% data sparsity happens).
* **SHAP TreeExplainer**: **What is it?** SHapley Additive exPlanations. It's a game-theoretic approach to explain the output of any machine learning model by assigning each feature an importance value. **How we use it:** Applied game theory and robust exact derivations over tree splits extracting the top 5 absolute feature magnitude attributions per GSTIN to allow model explainability.
* **llama-cpp-python**: **What is it?** Python bindings for `llama.cpp`, which allows heavily quantized (compressed) Large Language Models to run directly on standard CPU hardware without needing massive GPUs. **How we use it:** Leverages the compressed Q4_K_M quantizations of **Phi-3-mini-128k-instruct**. Provides completely local, CPU-only large language model inference using specific prompt templates mapping SHAP arrays directly into plain-language business insights without cloud calls.

## Fraud Detection & Graph Algorithms
* **NetworkX**: **What is it?** A Python package for the creation, manipulation, and study of the structure, dynamics, and functions of complex networks. **How we use it:** Core engine for constructing directed multigraphs and running fraud logic.
* **Strongly Connected Components (SCC) Decomposition**: **What is it?** A graph theory algorithm which decomposes a directed graph into maximal subgraphs where there is a path from each vertex to every other vertex. **How we use it:** Leverages robust topological algorithms (either Tarjan's or Kosaraju's) running in $O(V+E)$ time to identify minimum 3-node candidate loops representing potential rings.
* **Bounded Simple Cycle Enumeration (Gupta-Suzumura Algorithm)**: **What is it?** An algorithm for finding simple cycles (paths that start and end at the same node without repeating edges) up to a bounded max-length. **How we use it:** Avoids exponential blowout issues of exact cycle counting (like Johnson's algorithm) by specifying a `length_bound=5` to isolate quick, active circular money flow loops dynamically and safely.

## Synthetic Data & Statistical Modeling
* **Faker**: **What is it?** A Python library that generates massive amounts of fake, privacy-safe dummy data. **How we use it:** Generates synthetic PII and structural MSME profile data.
* **SDV** (Synthetic Data Vault): **What is it?** An open-source library utilizing machine learning algorithms to create tabular synthetic dependencies. **How we use it:** Integrated for modeling complex synthetic distribution patterns.
* **Lognormal Distributions**: **What are they?** A continuous probability distribution where the logarithm of the variable is normally distributed resulting in heavily skewed right tails (common in wealth and financial distributions). **How we use them:** Extensively employed by `NumPy.random.lognormal()` during synthetic generation to ensure extremely realistic financial tail skews (mimicking genuine transactional activity mapping amounts securely across different profile types).
* **Exponential Inter-arrival Times**: **What are they?** The time gaps occurring between sequential events happening continuously and independently at a constant average rate (Poisson processes). **How we use them:** Generating pseudo-random clustered timestamps organically across GST distributions instead of linear intervals, allowing accurate temporal simulation.

## Testing, Logging & Build Systems
* **hatchling**: **What is it?** A modern, extensible Python build backend using PEP 621 definitions. **How we use it:** Python build backend configured in `pyproject.toml` for standard packaging and task definitions.
* **pytest** & **pytest-asyncio**: **What are they?** The standard framework for writing, asserting, and executing Python unit tests along with plugins enabling `async/await` assertions seamlessly. **How we use them:** The standard testing framework with full async support via `httpx`.
* **psutil**: **What is it?** A cross-platform library for retrieving system utilization traits (CPU, memory, disks). **How we use it:** System-level cross-platform library to monitor memory pressure (RSS) during Polars pipeline execution and prevent OOM crashes.

## Frontend Dashboard
* **React 18** (core & DOM): **What is it?** A declarative, component-based JavaScript UI library focused on building single-page applications. **How we use it:** The UI library powering the interactive dashboard.
* **Vite 5**: **What is it?** A next-generation lightning-fast frontend build tool and local dev server relying heavily on native ES modules and Rollup. **How we use it:** Fast build tool and development server for the React app.
* **Plotly**: **What is it?** A graphing library delivering interactive, publish-quality graphs directly formatted. **How we use it:** For advanced and interactive charting.
* **Streamlit**: **What is it?** An open-source Python framework for easily transforming analytics scripts into interactive web apps quickly. **How we use it:** As an alternative dashboard and visualization engine.
