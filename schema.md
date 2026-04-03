# data pipeline schemas & redis field mappings

> **description:** explicit json schema layouts and redis stream field constraints fed directly into the polars feature engine. payloads must strictly adhere to these definitions.

---

## table of contents

1. [gst invoices stream](#1-gst-invoices-stream-streamgst_invoices)
2. [upi transactions stream](#2-upi-transactions-stream-streamupi_transactions)
3. [e-way bills stream](#3-e-way-bills-stream-streameway_bills)
4. [engineered ml features](#4-engineered-ml-features-polars-output)

---

## 1. gst invoices stream (`stream:gst_invoices`)

derived directly from gstr-1 mandatory outward supply structures.

| field | type | constraint & purpose |
|---|---|---|
| `gstin` | `string(15)` | strict regex standard: `[0-9]{2}[a-z]{5}[0-9]{4}[a-z]{1}[1-9a-z]{1}[z]{1}[0-9a-z]{1}` |
| `invoice_id` | `uuid` | unique transaction id per payload |
| `timestamp` | `iso 8601` | chronological temporal anchor for window computations |
| `taxable_value` | `float` | exclusive base transaction amount; obeys lognormal generation |
| `gst_amount` | `float` | flat 18% mathematical multiplier of `taxable_value` |
| `buyer_gstin` | `string` | graph edge target; explicitly empty for b2c unregistered persons |
| `filing_status` | `enum` | adheres strictly to `[ontime, delayed, missing]` |
| `filing_delay_days` | `integer` | delta calculation constraint used in compliance health evaluations |
| `synthetic_batch_id` | `string` | operational trace parameter for generation workers |

---

## 2. upi transactions stream (`stream:upi_transactions`)

adheres strictly to real-time npci switch routing payloads.

| field | type | constraint & purpose |
|---|---|---|
| `gstin` | `string(15)` | root msme primary key |
| `vpa` | `string` | enforced format: `business_slug@bank_handle` |
| `timestamp` | `iso 8601` | temporal execution boundary |
| `amount` | `float` | exact inr base |
| `direction` | `enum` | `[inbound, outbound]` — net-cash positional flag |
| `counterparty_vpa` | `string` | target `networkx` graph node |
| `txn_type` | `enum` | `[p2p, p2m]` — pure peer tracking flag |
| `status` | `enum` | network routing state: `[success, failed_technical, failed_funds]` |
| `synthetic_batch_id` | `string` | worker segment debug trace |

---

## 3. e-way bills stream (`stream:eway_bills`)

nic v1.0.0621 json specification implementation mapping physical distributions.

### core transport constraints
| field | type | constraint & purpose |
|---|---|---|
| `eway_id` | `string` | mandatory nic unique numeric sequence |
| `gstin` | `string(15)` | identity of the mechanical entity hitting the portal |
| `supply_type` | `char(1)` | outward `o` / inward `i` vector logic |
| `doc_type` | `enum` | allowable subset: `[inv, chl, bil]` |
| `doc_no` | `string` | explicit foreign-key mapped back to the upstream `invoice_id` |

### topographical tracers
| field | type | constraint & purpose |
|---|---|---|
| `from_gstin` / `to_gstin` | `string(15)` | origin/destination identifiers tracking scc cycle rings |
| `from_state_code` / `to_state_code` | `int(2)` | bounded 2-digit indian routing identifier rules |
| `actual_from_state_code` / `actual_to_state_code` | `int(2)` | original dispatch and destination state codes |
| `trans_distance` | `integer` | physical trajectory calculation; hard-enforced `1-5` km boundaries detect extreme `paper_trader` anomalies |

### commodity tracers
| field | type | constraint & purpose |
|---|---|---|
| `main_hsn_code` | `string(4-8)` | product identifiers utilized in shannon entropy matrix mappings |
| `item_hsn_code` | `string` | text-generated product representations corresponding to the hsn code |
| `taxable_amount` | `float` | base listing values passed along without taxation modifiers |
| `tot_inv_value` | `float` | hard total reconciling mathematically back to `stream:gst_invoices` |

### vehicle & distribution modifiers
| field | type | constraint & purpose |
|---|---|---|
| `trans_mode` | `enum[1-4]` | constrains routing behavior (e.g., road `1`) |
| `vehicle_type` | `string` | synthetic automotive validation |



---

## 4. engineered ml features (polars output)

computed dynamically in `src/features/engine.py`. these form the final 43-dimensional vector passed into the xgboost model.

### cash flow & liquidity
| field | type | constraint & purpose |
|---|---|---|
| `upi_daily_avg_throughput` | `float` | average daily cash transfer velocity across periods |
| `cash_buffer_days` | `float` | bounded `[0.0, 90.0]`; measures survival runway via ratio of 30d inbound vs daily outflow |
| `debit_failure_rate_90d` | `float` | signals acute cash stress via `failed_funds` ratio over total volume |

### behavioral concentrations
| field | type | constraint & purpose |
|---|---|---|
| `upi_top3_concentration` | `float` | measures over-reliance on a few counterparties |
| `hsn_entropy_90d` | `float` | shannon entropy across physical goods vectors; detects impossible multi-sector `paper_trader` logic |
| `hsn_shift_count_90d` | `integer` | physical sector pivot tracking; abrupt jumps indicate shifting shell strategies |

### compliance & cadence
| field | type | constraint & purpose |
|---|---|---|
| `statutory_payment_regularity_score` | `float` | scalar measuring how rigidly tax/gst remittances occur |
| `upi_dormancy_periods` | `integer` | gaps in activity separating high burst-mode washing cycles |
| `filing_compliance_rate` | `float` | long-term consistency of `ontime` vs `missing` filings |

### graph topology & anomaly flags
| field | type | constraint & purpose |
|---|---|---|
| `fraud_ring_flag` | `boolean` | output of the tarjan scc decomposition indicating direct cycle membership |
| `gst_upi_receivables_gap` | `float` | cross-signal mismatch between GST booked revenue and actual UPI cash realization |
| `ewb_smurfing_index` | `float` | ratio of EWB transactions deliberately sized just below the ₹50,000 legal threshold |
| `pagerank_score` | `float` | Hub-and-Spoke indicator calculating node centrality in the global UPI directed multigraph |
| `temporal_anomaly_flag` | `float` | binary `1.0`/`0.0` output from the isolation forest identifying robotic chronological cadence |
| `fraud_confidence` | `float` | weighted severity metric bounded `[0.0, 1.0]` combining cycle volumes and graph edges |
| `cycle_velocity` | `float` | speed at which capital traverses the isolated graph loop |
| `counterparty_fraud_exposure` | `float` | proximity penalty for doing business with identified `shell_circular` networks |

---

