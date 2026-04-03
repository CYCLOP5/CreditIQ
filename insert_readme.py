import re

with open("README.md", "r") as f:
    text = f.read()

insert_text = """

### 🚀 Next-Gen Hackathon Flex Features
This platform implements advanced features to stand out to the judges:
* **Server-Sent Events (SSE) Real-Time Streaming:** The API provides `GET /score/{task_id}/stream` to push pipeline status updates to the client without polling.
* **Temporal Graph Validation:** Circular transaction rings are only flagged if the cashflows actually move sequentially forward in time (`is_temporal_cycle`), significantly reducing false positives vs strict simple cycle detection.
* **Sparse Data Dynamic Routing (Cold-Start Handling):** A `data_maturity_flag` intelligently routes new-to-credit MSMEs with < 3 months of GST to a specialized UPI-Heavy XGBoost model, protecting them from missing data penalty.
* **RAG-based Credit Analyst Chat:** After scoring, `/score/{task_id}/chat` exposes an interactive, purely local CPU-bound GenAI assistant that retrieves the MSME feature context, allowing loan officers to ask follow-up questions to understand the 'why' behind the score.
"""

new_text = re.sub(r'(## 2\. System Architecture)', insert_text + r'\n\1', text)

with open("README.md", "w") as f:
    f.write(new_text)

print("Updated README.md")
