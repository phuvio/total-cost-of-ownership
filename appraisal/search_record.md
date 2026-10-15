# Search record

The machine-readable form is `search_queries.csv` (24 rows).

## Round 1 — cost efficiency and model selection, 2026-02-22

Queries used:

1. `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)`
2. `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)`
3. `how to select cost-efficient large language model`
4. `"choosing cost-effective large language model"`
5. `"llm cost optimization"`

The round proceeded in three stages, in this order:

- **Academic databases** — Google Scholar, Semantic Scholar, Keenious (Tables A.1–A.3).
- **Preprint and working-paper repositories**, added because the initial searches returned
  few studies treating cost in monetary rather than hardware-utilisation terms — OpenGrey,
  CORE, SSRN, OpenReview (Tables A.4–A.7).
- **General web and industry sources**, added because deployment cost knowledge is largely
  published outside academic venues — Google, HuggingFace, AWS, NVIDIA (Tables A.8–A.11).

The academic phase yielded few directly relevant peer-reviewed results. The two most
relevant were FrugalGPT (Chen et al., 2023) and RouteLLM (Ong et al., 2024).

**18 engine-query combinations across 11 sources
(Tables A.1–A.11).** From the screened results, **63 sources were selected for AACODS
appraisal**.

## Round 2 — total cost of ownership, 2026-03-04

Triggered when *total cost of ownership* emerged as a recurring theme in the round-1
sources. One query, run across the same source types:

6. `(tco OR "total cost of ownership") AND (llm OR "large language model")`

**6 engine-query combinations across 6 sources
(Tables A.12–A.17).** From the screened results, **33 sources were selected for AACODS
appraisal**.

## Screening depth

Queries returning large result sets were screened to the **first 50 results sorted by
relevance**, on the basis that these were most likely to contain the most influential and
relevant material. Where a query returned fewer than 50 hits, **all results were
screened**. The depth applied to each query is recorded in the table below.

## Complete search log

| Table | Round | Source | Query | Hits | Date | Screening |
|---|---|---|---|---|---|---|
| A.1 | 1 | Google Scholar | `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)` | 9,330 | 2026-02-22 | first 50 results screened |
| A.1 | 1 | Google Scholar | `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)` | 6,610 | 2026-02-22 | first 50 results screened |
| A.2 | 1 | Keenious | `how to select cost-efficient large language model` | 10 | 2026-02-22 | all results screened |
| A.3 | 1 | Semantic Scholar | `how to select cost-efficient large language model` | 2,340 | 2026-02-22 | first 50 results screened |
| A.4 | 1 | OpenGrey | `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)` | 0 | 2026-02-22 | all results screened |
| A.4 | 1 | OpenGrey | `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)` | 0 | 2026-02-22 | all results screened |
| A.5 | 1 | Core | `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)` | 1,249 | 2026-02-22 | first 50 results screened |
| A.5 | 1 | Core | `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)` | 1,399 | 2026-02-22 | first 50 results screened |
| A.6 | 1 | SSRN | `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)` | 144 | 2026-02-22 | first 50 results screened |
| A.6 | 1 | SSRN | `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)` | 29 | 2026-02-22 | first 50 results screened |
| A.7 | 1 | OpenReview | `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)` | 0 | 2026-02-22 | all results screened |
| A.7 | 1 | OpenReview | `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)` | 0 | 2026-02-22 | all results screened |
| A.8 | 1 | Google | `("large language model" OR llm) AND ("cost optimization" OR "cost efficiency") AND (selection OR decision)` | 1,080,000 | 2026-02-22 | first 50 results screened |
| A.8 | 1 | Google | `("large language model" OR llm) AND ("cost trade-off" OR "cost reduction") AND (deployment OR evaluation)` | 236,000 | 2026-02-22 | first 50 results screened |
| A.9 | 1 | HuggingFace | `"choosing cost-effective large language model"` | 120 | 2026-02-22 | first 50 results screened |
| A.9 | 1 | HuggingFace | `"llm cost optimization"` | 17,100 | 2026-02-22 | first 50 results screened |
| A.10 | 1 | AWS | `"llm cost optimization"` | 5,380 | 2026-02-22 | first 50 results screened |
| A.11 | 1 | NVIDIA | `"llm cost optimization"` | 2,390 | 2026-02-22 | first 50 results screened |
| A.12 | 2 | Google | `(tco OR "total cost of ownership") AND (llm OR "large language model")` | 7,300,000 | 2026-03-04 | first 50 results screened |
| A.13 | 2 | ACM | `(tco OR "total cost of ownership") AND (llm OR "large language model")` | 141 | 2026-03-04 | first 50 results screened |
| A.14 | 2 | IEEE | `(tco OR "total cost of ownership") AND (llm OR "large language model")` | 7 | 2026-03-04 | all results screened |
| A.15 | 2 | HuggingFace | `(tco OR "total cost of ownership") AND (llm OR "large language model")` | 1 | 2026-03-04 | all results screened |
| A.16 | 2 | AWS | `(tco OR "total cost of ownership") AND (llm OR "large language model")` | 8 | 2026-03-04 | all results screened |
| A.17 | 2 | NVIDIA | `(tco OR "total cost of ownership") AND (llm OR "large language model")` | 748 | 2026-03-04 | first 50 results screened |

Total reported hits across all 24 engine-query combinations: **8,663,006**.
This is a count of what the engines reported, not of what was examined — screening was
capped as described above, and the same source may appear in several result sets.

## What this record does not contain

The record reports the hit count and screening depth per query, and the number of sources
carried forward to appraisal in each round (63 and 33). It does **not** report the
intermediate per-engine or per-query screening counts — how many of each query's screened
results were judged relevant before the appraisal stage. That funnel is therefore not
reconstructable, and no figures for it are given here.

Deduplication between overlapping result sets was likewise not recorded per query; the
96 appraised sources are distinct, and are listed individually in `sources.csv`.
