# lending domain knowledge

## overview

this document captures the regulatory, structural, and operational knowledge governing msme credit in india. it reconciles authoritative sources: the ministry of msme know-your-lender 2025 handbook and the bank of india msme credit policy 2024. all score bands, loan limits, and lending norms in this pipeline are derived from these official sources.

---

## section 1, msme classification

per the msmed act 2006 amended july 2020. classification uses both investment in plant and machinery or equipment and turnover simultaneously.

| category | investment ceiling | turnover ceiling |
|---|---|---|
| micro | ≤ rs.1 crore | ≤ rs.5 crore |
| small | ≤ rs.10 crore | ≤ rs.50 crore |
| medium | ≤ rs.50 crore | ≤ rs.250 crore |

udyam registration is the official portal for msme registration. udyam registration certificate (urc) is mandatory for availing psb loans, cgtmse eligibility, and psl targeting by banks. since july 2021 retail and wholesale trade are considered msme for psl purposes.

the certificate issued on udyam assist portal to informal micro enterprises is treated at par with urc for psl classification purposes.

---

## section 2, lender types and roles

| lender type | full name | primary msme product |
|---|---|---|
| scb | scheduled commercial banks | term loans, working capital, composite loans |
| nbfc | non-banking financial company | unsecured business loans, supply chain finance |
| mfi | microfinance institution | group lending to micro enterprises, jlg model |
| fintech | digital-first nbfc | psb 59-minute loans, gst-api-based underwriting |
| dfi | development finance institution | sidbi refinance lines to banks |

### priority sector lending targets

banks must allocate mandated fractions of adjusted net bank credit to priority sectors including msme. sub-target for micro enterprises within msme is 7.5% for scheduled commercial banks, rrbs, and sfbs.

| bank type | psl target of anbc | micro sub-target |
|---|---|---|
| domestic scheduled commercial banks | 40% | 7.5% |
| foreign banks | 40% | na |
| regional rural banks | 75% | 7.5% |
| scheduled small finance banks | 60% | 7.5% |
| urban co-operative banks | 60% | 7.5% |

failure to meet psl targets requires banks to deposit the shortfall in nabard or nho ridf funds at below-market rates, creating a direct financial incentive to lend to msme.

banks must also achieve: 20% yoy growth in credit to micro and small enterprises, 10% annual growth in number of micro enterprise accounts, 60% of total lending to mse sector directed to micro enterprises.

---

## section 3, types of msme loans

### term loan

used for capital expenditure, machinery purchase, infrastructure construction. repaid over fixed schedule. bank of india policy: tenure 7-10 years general, up to 15 years for specific products and infrastructure projects including initial moratorium. our pipeline uses 84 months (7 years) as the very_low_risk ceiling.

### working capital loan

covers operational expenses: raw material procurement, wages, receivables gap. assessed annually. two sub-types: cc (cash credit) revolving facility against stock and receivables, od (overdraft) against current account balance.

### composite loan

single-window product combining both wc and term loan. composite loan limit of rs.1 crore can be sanctioned to enable msme entrepreneurs to avail working capital and term loan through single window. cgtmse covers composite loans.

---

## section 4, working capital assessment methodologies

### turnover method (nayak committee)

the reserve bank of india mandated the nayak committee formula for msme working capital assessment. applicable for wc limits up to rs.5 crore.

**standard assessment (all mse not meeting digital threshold):**
- minimum 20% of projected annual turnover as bank finance
- borrower must contribute 5% (1/5th of wc requirement) as net working capital

**digital bonus for mse with digital turnover ≥ 25% of total turnover (bank of india policy 2024):**
- for non-digital portion: minimum 25% of projected turnover
- for digital portion: 30% of projected turnover
- digital transactions are all sales reflected in bank books other than cash and paper instruments

### mpbf method (maximum permissible bank finance)

used for limits above rs.5 crore or units with longer operating cycle. formula: mpbf = 75% × (current assets - current liabilities excluding bank borrowings). minimum 25% net working capital contribution by borrower.

### cash budget method

used for contractors, seasonal businesses, and wc requirement above rs.5 crore. peak level cash deficit from projected cash budget statement is the total wc finance extended.

---

## section 5, credit guarantee schemes

### cgtmse (credit guarantee fund trust for micro and small enterprises)

- administered by: sidbi and ministry of msme jointly
- eligible lenders: all scheduled commercial banks, rrbs, urban co-op banks, select nbfcs
- eligible borrowers: micro and small enterprises only (not medium enterprises)
- **coverage per borrower: up to rs.10 crore** (revised per kyl 2025 handbook; earlier limit was rs.500 lakh)
- coverage ratio: 75% of outstanding principal (85% for micro, women, northeast, sc/st)
- collateral requirement: no collateral for loans guaranteed under cgtmse
- rbi mandatory directive: no collateral for loans up to rs.10 lakh to msme sector; banks may extend collateral-free loans up to rs.25 lakh for borrowers with good track record and strong financials
- composite loan limit: rs.1 crore via single window

**zed certification concession on cgtmse annual guarantee fee:**
ten percent relaxation on fee rate for zed-certified msme borrowers. this applies on top of social category (sc/st/women/pwd/agniveer) and geographic (ner, aspirational district) relaxations of 10% each. maximum combined discount is 30%.

**annual guarantee fee structure (revised from 01-04-2023):**
| slab | standard rate (%pa) | effective rate with risk premium (%pa) |
|---|---|---|
| up to rs.10l | 0.37 | 0.63 |
| rs.10l to rs.50l | 0.55 | 0.94 |
| rs.50l to rs.1cr | 0.60 | 1.02 |
| rs.1cr to rs.2cr | 1.20 | 2.04 |
| rs.2cr to rs.5cr | 1.35 | 2.30 |

### cgfmu (credit guarantee fund for micro units)

- covers mudra loans under pmmy
- administered by ncgtc
- maximum loan amount up to rs.10 lakh and overdraft up to rs.10,000 under pmjdy

### cgss (credit guarantee scheme for startups)

- dpiit-recognized startups only
- 85% coverage for loans up to rs.10 crore; 75% for loans above rs.10 crore
- maximum guarantee cover per borrower up to rs.20 crore
- annual fee: 2% pa on sanction amount (1.5% for northeast/women)

### mcgsmsme (mutual credit guarantee scheme for msme)

- new scheme for term loan assistance for machinery and equipment purchase
- guarantee cover: 60% of amount in default
- maximum loan per borrower: rs.100 crore
- guarantee fee: nil in year of sanction; 1.5% pa of outstanding for next 3 years; 1% pa thereafter
- this scheme is distinct from cgtmse and covers medium enterprises as well

---

## section 6, government schemes

### pmmy / mudra (pradhan mantri mudra yojana)

provides loans up to rs.20 lakh to income-generating micro enterprises.

| tier | loan range | target segment |
|---|---|---|
| shishu | up to rs.50,000 | earliest stage micro |
| kishor | rs.50,000 to rs.5 lakh | established micro |
| tarun | rs.5 lakh to rs.10 lakh | growing micro |
| tarun plus | rs.10 lakh to rs.20 lakh | high-growth micro with prior tarun repayment history |

covered under cgfmu guarantee. collateral not to be insisted for loans up to rs.10 lakh per rbi mandate. nil margin for shishu, 15% margin for kishor and above.

### pmegp (prime minister's employment generation programme)

- manufacturing: up to rs.50 lakh project cost
- service sector: up to rs.20 lakh project cost
- subsidy: 15-35% capital subsidy depending on category and geography
- no collateral required for loans up to rs.10 lakh

### stand up india

- eligible borrowers: sc/st entrepreneurs and women entrepreneurs only
- composite loan range: rs.10 lakh to rs.1 crore
- purpose: greenfield enterprise in manufacturing, services, or trading
- repayment: 84 months with 18-month moratorium maximum

### pm vishwakarma

- target: traditional artisans and craftspeople (18 trades)
- collateral-free credit: up to rs.3 lakh in two tranches
- concessional interest rate: available
- digital payment incentive: re.1 per digital transaction up to 100 per month

### mse gift scheme (green investment and financing for transformation)

- provides 2% interest subvention on term loans up to rs.2 crore for adoption of green technologies
- credit guarantee covering 75% of eligible loans under cgtmse
- promotes clean energy, waste management, and sustainable manufacturing in mse

### mse-spice scheme (scheme for promotion and investment in circular economy)

- credit linked capital subsidy for circular economy projects: 25% of investment in plant and machinery or rs.12.5 lakh, whichever is lower
- focus on circular economy sectors: plastic, rubber, e-waste
- encourages compliance with extended producer responsibility

### psb loans in 59 minutes

- digital platform: psbloansin59minutes.com
- loan range: rs.1 lakh to rs.5 crore
- data inputs: gst data api, bank account statement, itr, bureau score
- in-principle approval within 59 minutes of application

---

## section 7, credit information companies and score bands

### licensed cics in india

| cic | full name | primary bureau product |
|---|---|---|
| cibil | transunion cibil | cibil score 300-900 |
| experian | experian credit information company | experian score 300-850 |
| equifax | equifax credit information services | equifax score 1-999 |
| crif highmark | crif highmark credit information | crif score 300-900 |

### cibil score bands (official per kyl 2025 handbook)

| band name | score range | lending implication |
|---|---|---|
| excellent | 750-900 | prime borrower, lowest interest rates, full product access |
| good | 650-750 | near-prime, standard terms, most products available |
| average | 550-650 | sub-prime, restricted product range, higher rates |
| poor | 300-550 | high risk, limited access, mudra micro-credit only |

### how our pipeline score maps to cibil bands

our xgboost model produces a synthetic 300-900 score calibrated to align with cibil band semantics. the pipeline uses non-overlapping contiguous bands where each band boundary is exclusive of the lower band.

| our risk band | score range | cibil equivalent | lending pathway |
|---|---|---|---|
| very_low_risk | 750-900 | excellent | full msme credit access, cgtmse tier 1 |
| low_risk | 650-749 | good | standard msme lending, cgtmse eligibility |
| medium_risk | 550-649 | average | restricted to cgtmse-guaranteed collateral-free products |
| high_risk | 300-549 | poor | mudra shishu/kishor only, manual review for anything above |

---

## section 8, bank credit rating models

bank of india uses internal scorecard models segmented by borrower size. our pipeline identifies which model a borrower would fall under based on declared turnover.

| model | applicability by turnover | limit ceiling |
|---|---|---|
| saral | limits up to rs.10 lakh | rs.10 lakh |
| scbl (score card based loan) | rs.10 lakh to rs.1 crore turnover | rs.1 crore |
| sbs (small business segment) | rs.1 crore to rs.5 crore turnover | varies |
| sme model | rs.5 crore to rs.50 crore turnover | varies |
| ms model | rs.50 crore to rs.250 crore turnover | varies |
| hlc model | rs.250 crore and above | varies |

### financial ratios checked by banks (bank of india policy)

| ratio | minimum threshold | maximum relaxation permitted by board |
|---|---|---|
| debt equity ratio (tol/tnw) | max 4:1 | max 5:1 |
| current ratio | min 1.0 | min 0.7 for seasonal/cash-budget sectors; 0.8 others |
| dscr (debt service coverage ratio) | min 1.25 average over tenure | 1.10 minimum average |

benchmark financial ratios for healthy credit: der max 3:1, current ratio min 1.33, dscr min 1.50 average.

external credit rating from a sebi-registered cra is mandatory for aggregate credit exposure ≥ rs.7.5 crore (from regulatory capital perspective) and mandatorily required for exposure ≥ rs.50 crore.

---

## section 9, digital lending framework

### rbi digital lending guidelines (2025-26)

rbi has issued comprehensive guidelines for digital lending applicable to all regulated entities including banks and nbfcs. key requirements:

- regulated entities must obtain economic profile information including age, occupation, and income before extending any loan
- key fact statement (kfs) mandatory for all digital loans
- digitally signed documents must flow automatically to borrower on registered email/sms upon loan execution
- cooling-off period: borrower may exit digital loan by paying principal and proportionate apr without penalty during board-determined cooling-off period (minimum one day)
- one-time processing fee may be retained if borrower exits during cooling-off period

### straight through processing (stp)

stp for shishu mudra loans: fully digital end-to-end automated processing without manual intervention up to rs.50,000 for existing customers. enables instant kyc via aadhaar/otp, auto-populated forms, direct credit assessments using bureau data, and faster sanction without branch visits.

for larger digital loans, stp with objective decisioning based on digitally fetched verifiable data: pan/nsdl authentication, otp verification, gst api fetch, bank statement analysis via account aggregator, itr upload, bureau fetch via cic api, fraud checks.

### time norms for loan processing (per rbi and bank of india policy)

| loan size | maximum processing time |
|---|---|
| up to rs.10 lakh | 7 business days from complete application |
| rs.10 lakh to rs.5 crore | 14 business days from complete application |
| above rs.5 crore | 30 business days from complete application |

---

## section 10, portals for credit access

### treds (trade receivables discounting system)

rbi-licensed electronic platforms for msme invoice discounting. msme raises invoice against buyer, buyer accepts on platform, financiers bid to discount the invoice, msme receives payment within 1-3 days. no collateral required.

five operational treds platforms (as of 2025):
1. rxil (receivables exchange of india limited)
2. m1xchange
3. invoicemart
4. kredx
5. c2treds

### gst sahay (sidbi invoice-based financing)

gst registered udyam registered micro and small enterprises can apply for gst sahay invoice-based financing (ibf) from sidbi. supports both purchase invoice based financing (pibf) and sales invoice based financing (sibf). key features:
- collateral-free short-term working capital loans based on gst invoices
- fully digital process using aadhaar, upi, e-sign, and enach
- funds typically disbursed within 24 hours
- built on ocen (open credit enablement network) and account aggregator framework
- real-time gst data used for creditworthiness assessment

### psb loans in 59 minutes

digital platform integrating multiple public sector banks, private banks, and nbfcs. loans from rs.1 lakh to rs.5 crore with in-principle approval within 59 minutes.

### jan samarth national portal

government of india single portal for all credit-linked government schemes. seven loan categories covering education, housing, agriculture, livelihood, and business activity schemes. connects users with public and private sector banks and nbfcs.

---

## section 11, key regulatory requirements

### key fact statement (kfs)

mandatory for all retail and msme loans per rbi circular. kfs must disclose: apr inclusive of all charges, all fees penalties and prepayment terms, total repayment schedule, grievance redressal officer details, cooling-off period terms. kfs must include amortisation schedule and apr computation sheet. fees not mentioned in kfs cannot be charged by regulated entities.

### npa definition (rbi prudential norms)

a loan becomes a non-performing asset after 90 days of non-payment of any instalment or interest. for overdraft and cash credit accounts, if account remains inactive or overdrawn beyond allowed limit for 90 days, also classified as npa. once classified npa: credit score drops sharply for enterprise and promoters on all cic bureau reports, recovery proceedings can be initiated under sarfaesi act or lok adalat, cgtmse files a claim if loan was guaranteed.

### delayed payment rule (msmed act section 15-23)

buyers must pay msme suppliers within 45 days of delivery or within agreed credit period (whichever is less, max 45 days). if delayed, compound interest accrues at 3 times the rbi bank rate with monthly rests. this is a significant protection for msme cash flow and is relevant to receivables risk assessment in our pipeline.

---

## section 12, corrected loan recommendation framework

this is the authoritative mapping used in our pipeline for the hackathon demo. it reflects bank of india msme policy and kyl 2025 handbook.

| risk band | score range | wc max | term loan max | wc tenure | term tenure | cgtmse | collateral |
|---|---|---|---|---|---|---|---|
| very_low_risk | 750-900 | rs.50 lakh | rs.1 crore | 12 months rolling | 84 months | eligible | not required |
| low_risk | 650-749 | rs.25 lakh | rs.50 lakh | 12 months rolling | 60 months | eligible | not required |
| medium_risk | 550-649 | rs.10 lakh | rs.25 lakh | 12 months rolling | 36 months | eligible | not required (rbi directive ≤10L) |
| high_risk | 300-549 | rs.5 lakh | not recommended | 12 months | none | not eligible | mudra only |

notes:
- the rs.10 lakh no-collateral threshold is a mandatory rbi directive, not bank discretion
- banks may extend collateral-free loans up to rs.25 lakh for borrowers with strong financials and good track record, per rbi
- cgtmse coverage per borrower is now rs.10 crore (raised from rs.500 lakh per kyl 2025)
- mcgsmsme additionally covers term loans up to rs.100 crore for machinery purchase at 60% coverage
- working capital is assessed annually and renewed; tenure refers to the cc/od facility period
- mudra shishu and kishor schemes apply to high_risk micro-segment borrowers
- very_low_risk term loan of rs.1 crore is available under cgtmse composite guarantee
- mse gift provides 2% interest subvention on green technology term loans up to rs.2 crore, available across bands

---

## section 13, signal integration summary for this pipeline

| real-world factor | how pipeline captures it | feature / field |
|---|---|---|
| msme category | declared turnover from generator | msme_category field in response |
| digital transaction ratio | upi p2m and inbound ratio | upi_p2m_ratio_30d, upi_30d_inbound_count |
| digital wc bonus eligibility | upi p2m ratio exceeds 0.25 threshold | upi_p2m_ratio_30d as signal |
| udyam registration | binary flag in synthetic profile | udyam_registered bool |
| gst filing regularity | filing_status, delay_days from gst stream | filing_compliance_rate, gst_filing_delay_trend, statutory_payment_regularity_score |
| itr cross-check | simulated via data completeness | data_completeness_score |
| cash flow health | derived from upi inflow/outflow ratio | cash_buffer_days, upi_inbound_outbound_ratio_30d |
| debit failure rate | upi outbound failures over 90d | debit_failure_rate_90d |
| business diversification | hsn entropy and shift across eway bills | hsn_entropy_90d, hsn_shift_count_90d |
| cgtmse eligibility | derived from msme category + fraud flag | cgtmse_eligible bool in response |
| mudra eligibility | derived from high_risk band + micro category | mudra_eligible bool in response |
| cibil score alignment | our score calibrated to cibil 300-900 bands | credit_score int, risk_band string |
| delayed payment exposure | inbound ratio and ewb invoice lag | ewb_distance_per_value_ratio, invoice_to_ewb_lag_hours_median |
