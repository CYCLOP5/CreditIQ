# e-way bill schema reference

## version note

schema version 1.0.0621 from nic/gst portal. the bulk api accepts a json object with a `version` string field and a `billLists` array. each element of `billLists` is one e-way bill object. all field names in the api are camelCase as specified below. this document uses lowercase prose but preserves original camelCase attribute names exactly as required by the api.

---

## full attribute reference table

| attribute name | type | mandatory | description | validation rules |
|---|---|---|---|---|
| userGstin | text 15 | yes | gstin of the user generating the bill | valid 15-char gstin pattern only |
| supplyType | char 1 | yes | outward or inward supply | o for outward, i for inward |
| subSupplyType | number 1 | yes | sub-type of supply | 1-12, selection constrained by supply type |
| subSupplyDesc | text 100 | conditional | required when sub supply type is others (8) | free text, max 100 chars |
| docType | char 3 | yes | document type | inv, bil, boe, chl, oth only |
| docNo | text 16 | yes | document number | alphanumeric, hyphen, slash, dot only |
| docDate | text 10 | yes | document date | dd/mm/yyyy format, must not be future date |
| transType | number 1 | yes | transaction type | 1 regular, 2 bill-to-ship-to, 3 bill-from-dispatch-from, 4 combination |
| fromGstin | text 15 | yes | gstin of the consignor | valid 15-char gstin or urp |
| fromTrdName | text 100 | no | trade name of consignor | alphanumeric with @, #, -, /, &, . |
| fromAddr1 | text 120 | no | consignor address line 1 | alphanumeric with @, #, -, /, &, . |
| fromAddr2 | text 120 | no | consignor address line 2 | alphanumeric with @, #, -, /, &, . |
| fromPlace | text 50 | no | consignor city or place | alphanumeric |
| fromPincode | number 6 | yes | consignor pincode | 6-digit number, 100000 to 999999 |
| fromStateCode | number 2 | yes | bill-from state code | valid state code per master list |
| actualFromStateCode | number 2 | yes | dispatch-from state code | valid state code per master list |
| toGstin | text 15 | yes | gstin of the consignee | valid 15-char gstin or urp |
| toTrdName | text 100 | no | trade name of consignee | alphanumeric with @, #, -, /, &, . |
| toAddr1 | text 120 | no | consignee address line 1 | alphanumeric with @, #, -, /, &, . |
| toAddr2 | text 120 | no | consignee address line 2 | alphanumeric with @, #, -, /, &, . |
| toPlace | text 50 | no | consignee city or place | alphanumeric |
| toPincode | number 6 | yes | consignee pincode | 6-digit number |
| toStateCode | number 2 | yes | bill-to state code | valid state code per master list |
| actualToStateCode | number 2 | yes | ship-to state code | valid state code per master list |
| totalValue | number 18 | no | sum of assessable value | numeric, 2 decimal places |
| cgstValue | number 18 | no | central gst amount | numeric, 2 decimal places |
| sgstValue | number 18 | no | state gst amount | numeric, 2 decimal places |
| igstValue | number 18 | no | integrated gst amount | numeric, 2 decimal places |
| cessValue | number 18 | no | cess amount | numeric, 2 decimal places |
| TotNonAdvolVal | number 18 | no | total non-advol cess value | negative and non-negative allowed |
| OthValue | number 18 | no | other charges | numeric, 2 decimal places |
| totInvValue | number 18 | yes | total invoice value | sum of taxable + tax + other charges |
| transMode | number 1 | no | mode of transport | 1 road, 2 rail, 3 air, 4 ship/road-cum-ship |
| transDistance | number 4 | yes | distance in km | integer, max 4000 |
| transporterName | text 25 | no | transporter name | alphanumeric |
| transporterId | text 15 | conditional | transporter gstin or transin | required if road mode and no vehicle number |
| transDocNo | text 16 | conditional | transport document number | required if rail or air mode |
| transDocDate | text 10 | conditional | transport document date | dd/mm/yyyy, must be on or after doc date |
| vehicleNo | text 15 | conditional | vehicle registration number | required if road mode and no transporter id |
| vehicleType | char 1 | conditional | vehicle category | r for regular, o for odc (over dimensional cargo) |
| mainHsnCode | text 8 | no | primary hsn code for the consignment | 4 or 8 digit valid hsn code |
| hsnCode | text 8 | yes (item level) | per-item hsn code | 4 or 8 digit valid hsn code |
| quantity | number 12 | no (item level) | goods quantity | numeric |
| qtyUnit | text 3 | no (item level) | unit of measure | valid unit code per master list |
| taxableAmount | number 18 | yes (item level) | per-item taxable value | numeric, 2 decimal places |
| sgstRate | number 3 | no (item level) | sgst rate percent | standard rates only per table 1 |
| cgstRate | number 3 | no (item level) | cgst rate percent | standard rates only per table 1 |
| igstRate | number 3 | no (item level) | igst rate percent | standard rates only per table 1 |
| cessRate | number 3 | no (item level) | cess rate percent | standard rates only per table 1 |

---

## master codes section

### supply type

| value | code |
|---|---|
| outward | o |
| inward | i |

### sub supply type

| value | code |
|---|---|
| supply | 1 |
| import | 2 |
| export | 3 |
| job work | 4 |
| for own use | 5 |
| job work returns | 6 |
| sales return | 7 |
| others | 8 |
| skd/ckd/lots | 9 |
| line sales | 10 |
| recipient not known | 11 |
| exhibition or fairs | 12 |

### doc type

| value | code |
|---|---|
| tax invoice | inv |
| bill of supply | bil |
| bill of entry | boe |
| delivery challan | chl |
| others | oth |

### trans mode

| value | code |
|---|---|
| road | 1 |
| rail | 2 |
| air | 3 |
| ship/road cum ship | 4 |

### vehicle type

| value | code |
|---|---|
| regular | r |
| over dimensional cargo | o |

### transaction type

| value | code |
|---|---|
| regular | 1 |
| bill to-ship to | 2 |
| bill from-dispatch from | 3 |
| combination of 2 and 3 | 4 |

### major state codes

| state | code |
|---|---|
| delhi | 7 |
| rajasthan | 8 |
| uttar pradesh | 9 |
| gujarat | 24 |
| maharashtra | 27 |
| karnataka | 29 |
| tamil nadu | 33 |
| west bengal | 19 |
| telangana | 36 |
| andhra pradesh | 37 |
| kerala | 32 |
| madhya pradesh | 23 |
| haryana | 6 |
| punjab | 3 |
| bihar | 10 |
| odisha | 21 |
| assam | 18 |
| other countries | 99 |
| other territory | 97 |

### common unit codes

| unit | code |
|---|---|
| kilograms | kgs |
| metric ton | mts |
| numbers | nos |
| litres | ltr |
| meters | mtr |
| square meters | sqm |
| others | oth |
| cartons | ctn |
| boxes | box |
| bags | bag |
| pieces | pcs |
| quintal | qtl |

---

## key validation rules

1. intra-state transaction where fromGstin and toGstin belong to the same state requires cgst and sgst. inter-state transaction requires igst. the correct tax fields must be populated and the incorrect ones must be zero.
2. if road transport mode, vehicleNo is required unless transporterId is provided with a valid gstin or transin. both fields cannot be absent simultaneously.
3. if rail or air transport mode, transDocNo and transDocDate are mandatory. transDocDate must be on or after docDate.
4. transDistance maximum is 4000 km. values exceeding 4000 are rejected. for imports and exports the actual distance travelled within the country must be passed.
5. docDate must be on or before the current date. future document dates are rejected.
6. total invoice value must equal sum of taxable amount plus all tax amounts plus other charges. a tolerance of 2 rupees is allowed for rounding.
7. hsnCode must be a valid 4-digit or 8-digit code per the gst hsn master. arbitrary codes are rejected.
8. urp (unregistered person) is a valid value in fromGstin and toGstin fields for transactions involving unregistered parties. enrolled transporters cannot appear as fromGstin or toGstin.
9. enrolled transporter with a transin can only appear as transporterId, never as fromGstin or toGstin.
10. if sub supply type is 8 (others), subSupplyDesc is mandatory.
11. for sez units, igst applies regardless of whether the transaction is intra-state.
12. for road cum ship mode, vehicleType must be odc. for rail and air, vehicleType must be r (regular).

---

## supply-document type compatibility table

derived from table 2 in the validations sheet. defines valid combinations of supply type, sub supply type, document type, and the expected from/to gstin patterns.

### outward supply combinations

| sub supply type | document type | from gstin | to gstin |
|---|---|---|---|
| supply (1) | tax invoice (inv) | self | other gstin or urp |
| supply (1) | bill of supply (bil) | self | other gstin or urp |
| export (3) | tax invoice (inv) | self | urp |
| export (3) | bill of supply (bil) | self | urp |
| job work (4) | delivery challan (chl) | self | other gstin or urp |
| skd/ckd (9) | tax invoice (inv) | self | other gstin or urp |
| skd/ckd (9) | bill of supply (bil) | self | other gstin or urp |
| skd/ckd (9) | delivery challan (chl) | self | other gstin or urp |
| recipient not known (11) | delivery challan (chl) | self | self |
| recipient not known (11) | others (oth) | self | self |
| for own use (5) | delivery challan (chl) | self | self |
| exhibition or fairs (12) | delivery challan (chl) | self | self |
| line sales (10) | delivery challan (chl) | self | self |
| others (8) | delivery challan (chl) | self | self or other |
| others (8) | others (oth) | self | self or other |

### inward supply combinations

| sub supply type | document type | from gstin | to gstin |
|---|---|---|---|
| supply (1) | tax invoice (inv) | other gstin or urp | self |
| supply (1) | bill of supply (bil) | other gstin or urp | self |
| import (2) | bill of entry (boe) | urp | self |
| skd/ckd (9) | bill of entry (boe) | urp | self |
| skd/ckd (9) | tax invoice (inv) | other gstin or urp | self |
| skd/ckd (9) | bill of supply (bil) | other gstin or urp | self |
| skd/ckd (9) | delivery challan (chl) | other gstin or urp | self |
| job work returns (6) | delivery challan (chl) | other gstin or urp | self |
| sales return (7) | delivery challan (chl) | other gstin or urp | self |
| exhibition or fairs (12) | delivery challan (chl) | self | self |
| for own use (5) | delivery challan (chl) | self | self |
| others (8) | delivery challan (chl) | self or other | self |
| others (8) | others (oth) | self or other | self |

---

## synthetic generator compliance section

the faker and sdv components must generate e-way bill records that pass all nic portal validations. the following rules govern synthetic generation.

### faker-generated fields

- gstin: 15-char pattern matching `[0-9]{2}[0-9A-Z]{13}` where first 2 digits are a valid state code
- vehicle numbers: pattern matching formats such as ka12ka1234, ka12k1234, ka123456, or ka123k1234
- doc numbers: alphanumeric strings up to 16 chars, allowing hyphen and slash
- dates: dd/mm/yyyy format, constrained to a configurable historical window, never future
- pincode: 6-digit integers in range 100000 to 999999
- state codes: sampled from the valid state code master list only

### sdv-handled fields

- amounts (totalValue, taxableAmount, totInvValue): correlated distributions reflecting realistic invoice sizes per business sector
- transDistance: sampled from realistic distance distributions capped at 4000, with intra-state distances weighted below 500 km
- quantity: distributions conditioned on qtyUnit and hsn code chapter

### enforced constraints

- intra-state transactions (fromStateCode equals toStateCode) receive cgst plus sgst, igst set to zero
- inter-state transactions receive igst, cgst and sgst set to zero
- hsnCode values sampled from a predefined list of real codes relevant to the business sector being simulated
- subSupplyType and docType combinations must match the compatibility table above precisely
- vehicle numbers are only generated for road transport records
- transDocNo and transDocDate are only populated for rail and air transport records

### fraud pattern injection

- paper traders: transDistance set to zero or near-zero (under 5 km) with high totInvValue, no realistic logistics latency
- shell companies: identical mainHsnCode and hsnCode values across all transactions regardless of stated business type, reflecting that the business is not actually trading the goods it claims
- circular traders: fromGstin and toGstin fields form a closed ring when analyzed across multiple bills, with invoiceDate-to-ewb-generation lag set to exactly zero seconds

---

## hsn code consistency fraud detection note

two features derived from the eway bill stream are specifically designed to detect hsn code manipulation.

`hsn_entropy_90d` measures the shannon entropy of the hsn code distribution across all eway bills in the 90-day window. low entropy indicates a business trading in a consistent product category. entropy near zero means all bills show the same hsn code, which is normal for a specialized trader. entropy above 2.0 bits suggests mixing of unrelated product categories.

`hsn_shift_count_90d` counts the number of times the leading 2-digit hsn chapter changes across consecutive bills sorted by timestamp. legitimate businesses occasionally expand product lines but do not oscillate between unrelated hsn chapters. a shift count above 5 in 90 days is a strong indicator of an entry-provider firm generating fake invoices across multiple sectors.

example of a fraudulent hsn pattern: a gstin that files bills under chapter 72 (iron and steel) in january, chapter 52 (cotton textiles) in february, and chapter 27 (mineral fuels) in march has zero plausible business rationale for this variance and should be flagged for manual review regardless of transaction volumes.

these features are computed in [`src/features/engine.py`](src/features/engine.py) from the `stream:eway_bills` redis stream and cached in the gstin-partitioned parquet feature store at `data/features/gstin={gstin}/features.parquet`.
