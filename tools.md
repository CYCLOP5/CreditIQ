# tools, libraries, patterns & technology stack

this document details the complete technology stack, algorithmic tools, and architectural patterns used in the creditiq msme credit scoring engine.

## architectural & logical patterns
* **async saga worker pattern**: **what is it?** a microservices architectural pattern that manages long-running transactions by breaking them into multiple asynchronous local steps rather than one massive synchronous lock. **how we use it:** employed within the fastapi ecosystem to orchestrate distributed transactions. scoring requests are quickly acknowledged (http 202) and pushed to a background worker via `stream:score_requests`, which guarantees non-blocking execution and allows the user to poll for the completed `scoreresult`.
* **event-driven pub/sub with consumer groups**: **what is it?** a messaging pattern (publish/subscribe) where senders distribute messages into topics, and specific groups of consumers share the load of reading those messages, ensuring each message is processed exactly once by the group. **how we use it:** redis streams act as a decoupled message bus. the system utilizes `xreadgroup` to ensure worker processes (`cg_feature_engine`) consume data from the gst, upi, and ewb streams consistently and reliably, allowing horizontally scalable consumption.
* **pipeline batching**: **what is it?** a technique that chains multiple commands into a single network request to a database, rather than waiting for individual round-trip responses. **how we use it:** for data ingestion, `redis-py` pipelines (`client.pipeline()`) aggregate stream insertions (e.g., 500 messages per chunk) to avoid round-trip latency overhead and maximize throughput.

## backend & api
* **fastapi**: **what is it?** a modern, highly-performant web framework for building python apis based on standard python type hints. **how we use it:** used as the primary async rest api framework for high-throughput endpoints.
* **uvicorn**: **what is it?** an asgi (asynchronous server gateway interface) web server implementation for python. **how we use it:** lightning-fast asgi server for running fastapi (`uvicorn[standard]`).
* **pydantic `>=2.0`**: **what is it?** a data validation and parsing library that enforces type hints at runtime. **how we use it:** utilized for robust schema validation across data ingestion, feature vectors, and api payloads.

## data processing & feature engineering
* **polars**: **what is it?** a blazingly fast dataframe library written in rust that emphasizes lazy evaluation and multi-threading over pandas' eager execution. **why we chose it over pandas:** 1) **lazy evaluation query engine**: unlike pandas which executes operations eagerly (holding massive intermediate dataframes in memory), polars builds an optimized logical plan before touching the data. 2) **memory ceilings**: per our `00_system_constraints.md`, the feature engine is hard-capped at 3gb ram. pandas would instantly oom crash while computing 90-day rolling velocities. polars natively supports query predicates and **parquet spilling** (pushing temporary computation state to disk rather than crashing). **how we use it:** used natively for lightning-fast, lazy-evaluated feature engineering and data transformations.
* **pyarrow**: **what is it?** a cross-language development platform for in-memory, column-oriented structured data processing. **how we use it:** the parquet i/o backend for polars, used for efficient data storage.
* **numpy & scipy**: **what are they?** the fundamental packages for advanced mathematical and algebraic computing in python. **how we use them:** core numerical computation and sparse matrix support.

## message bus & data streaming
* **redis**: **what is it?** an open-source, in-memory key-value data store frequently used as a distributed database, message broker, caching layer, and streaming engine. **how we use it:** used as an in-memory message bus via redis streams (`redis-py` async). it handles the flow of gst invoices, upi transactions, and e-way bills, as well as scoring job requests.
  > **why ONLY redis and no other database?** 
  > for this hackathon architecture, introducing a traditional rdbms (like postgresql or mysql) or a document store (like mongodb) would violate our strict constraints (12gb ram total). redis alone handles three crucial layers simultaneously without disk i/o bottlenecks:
  > 1. **pub/sub streaming:** real-time server-sent events (sse) pipeline.
  > 2. **time-series data retention:** redis streams buffer gst/upi/ewb data natively. (`xadd` appends new timestamped records instantly to an immutable log, while `xreadgroup` enables our distributed workers to consume these records exactly once, functioning as a lightweight kafka replacement without the overhead).
  > 3. **state-store:** fast key-value lookups for the generated feature vectors and graph states.
  > using a single purely in-memory engine achieves sub-millisecond data routing, keeps the architecture incredibly lean, and avoids the heavy ram tax of maintaining multiple database connections/indices alongside our xgboost and phi-3 models.

## machine learning & ai
* **xgboost classifier**: **what is it?** an optimized distributed gradient boosting library representing the industry standard for creating non-neural network decision trees on tabular data using the histogram method. **how we use it:** gradient boosted tree classifier utilizing the `hist` tree method, providing memory-efficient histogram-based node splitting designed for large-scale categorical continuous inputs (ideal for processing the `to_sparse_if_needed` inputs efficiently when >50% data sparsity happens).
* **shap treeexplainer**: **what is it?** shapley additive explanations. it's a game-theoretic approach to explain the output of any machine learning model by assigning each feature an importance value. **how we use it:** applied game theory and robust exact derivations over tree splits extracting the top 5 absolute feature magnitude attributions per gstin to allow model explainability.
* **llama-cpp-python**: **what is it?** python bindings for `llama.cpp`, which allows heavily quantized (compressed) large language models to run directly on standard cpu hardware without needing massive gpus. **how we use it:** leverages the compressed q4_k_m quantizations of **phi-3-mini-128k-instruct**. provides completely local, cpu-only large language model inference using specific prompt templates mapping shap arrays directly into plain-language business insights without cloud calls.

## fraud detection & graph algorithms
* **networkx**: **what is it?** a python package for the creation, manipulation, and study of the structure, dynamics, and functions of complex networks. **how we use it:** core engine for constructing directed multigraphs and running fraud logic.
* **strongly connected components (scc) decomposition**: **what is it?** a graph theory algorithm which decomposes a directed graph into maximal subgraphs where there is a path from each vertex to every other vertex. **how we use it:** leverages robust topological algorithms (either tarjan's or kosaraju's) running in $o(v+e)$ time to identify minimum 3-node candidate loops representing potential rings.
* **bounded simple cycle enumeration (gupta-suzumura algorithm)**: **what is it?** an algorithm for finding simple cycles (paths that start and end at the same node without repeating edges) up to a bounded max-length. **how we use it:** avoids exponential blowout issues of exact cycle counting (like johnson's algorithm) by specifying a `length_bound=5` to isolate quick, active circular money flow loops dynamically and safely.

## synthetic data & statistical modeling
* **faker**: **what is it?** a python library that generates massive amounts of fake, privacy-safe dummy data. **how we use it:** generates synthetic pii and structural msme profile data.
* **sdv** (synthetic data vault): **what is it?** an open-source library utilizing machine learning algorithms to create tabular synthetic dependencies. **how we use it:** integrated for modeling complex synthetic distribution patterns.
* **lognormal distributions**: **what are they?** a continuous probability distribution where the logarithm of the variable is normally distributed resulting in heavily skewed right tails (common in wealth and financial distributions). **how we use them:** extensively employed by `numpy.random.lognormal()` during synthetic generation to ensure extremely realistic financial tail skews (mimicking genuine transactional activity mapping amounts securely across different profile types).
* **exponential inter-arrival times**: **what are they?** the time gaps occurring between sequential events happening continuously and independently at a constant average rate (poisson processes). **how we use them:** generating pseudo-random clustered timestamps organically across gst distributions instead of linear intervals, allowing accurate temporal simulation.

## testing, logging & build systems
* **hatchling**: **what is it?** a modern, extensible python build backend using pep 621 definitions. **how we use it:** python build backend configured in `pyproject.toml` for standard packaging and task definitions.
* **pytest** & **pytest-asyncio**: **what are they?** the standard framework for writing, asserting, and executing python unit tests along with plugins enabling `async/await` assertions seamlessly. **how we use them:** the standard testing framework with full async support via `httpx`.
* **psutil**: **what is it?** a cross-platform library for retrieving system utilization traits (cpu, memory, disks). **how we use it:** system-level cross-platform library to monitor memory pressure (rss) during polars pipeline execution and prevent oom crashes.

## frontend dashboard
* **react 18** (core & dom): **what is it?** a declarative, component-based javascript ui library focused on building single-page applications. **how we use it:** the ui library powering the interactive dashboard.
* **vite 5**: **what is it?** a next-generation lightning-fast frontend build tool and local dev server relying heavily on native es modules and rollup. **how we use it:** fast build tool and development server for the react app.
* **plotly**: **what is it?** a graphing library delivering interactive, publish-quality graphs directly formatted. **how we use it:** for advanced and interactive charting.
* **streamlit**: **what is it?** an open-source python framework for easily transforming analytics scripts into interactive web apps quickly. **how we use it:** as an alternative dashboard and visualization engine.
