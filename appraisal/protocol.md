# Grey-literature appraisal protocol

## Review design

The review followed the multivocal literature review approach of Garousi, Felderer and
Mäntylä, combining an academic search informed by Kitchenham's guidelines with a
structured grey-literature review. Because it was conducted by a single researcher and the
academic search was capped at the 50 most relevant results per query, the thesis describes
it as **a structured rather than a fully systematic review**.

The grey-literature phase was added because the cost information this study needed —
throughput measurements, provider pricing structures, deployment cost case studies — is
predominantly published outside peer-reviewed venues. Vendor documentation, benchmark
repositories and technical reports were treated as appropriate evidence for building a
practical cost-estimation framework.

## Appraisal instrument: AACODS

Each source selected for appraisal was scored against the six AACODS criteria (Tyndall,
2010), with the operational reading used here:

| Criterion | What was assessed |
|---|---|
| **A**uthority | the author's credentials and institutional affiliation |
| **A**ccuracy | the verifiability of the claims made |
| **C**overage | the scope and completeness of the source |
| **O**bjectivity | the presence or absence of commercial or promotional bias |
| **D**ate | the currency of the information relative to a fast-moving field |
| **S**ignificance | appropriateness, impact and relevance to the research |

### Scoring

Each criterion scored **0 (weak), 1 (medium) or 2 (strong)**. The six scores are summed to
an AACODS total in the range 0–12.

### Classification thresholds

| Total | Classification |
|---|---|
| ≥ 9 | **core** — used as primary evidence for the cost categories |
| 7–8 | **supporting** material |
| ≤ 6 | **excluded** |

## Two appraisal rounds

The corpus was assembled in two rounds. The second was triggered during the first:
*total cost of ownership* emerged as a recurring theme in the sources being read, so a
supplementary search was run on that term across the same source types.

| Round | Search date | Sources appraised | Core | Supporting | Excluded |
|---|---|---|---|---|---|
| 1 | 2026-02-22 | 63 | 26 | 16 | 21 |
| 2 | 2026-03-04 | 33 | 15 | 7 | 11 |
| **Total** | | **96** | **41** | **23** | **32** |

The 32 excluded sources are retained in `sources.csv` with their scores, so the exclusion
decisions are checkable rather than merely asserted.

## Thematic classification

Alongside the quality scores, each appraised source was flagged against the five cost
themes the framework's categories are drawn from: **Pricing, Infrastructure, Deployment,
Optimization, Operations**. A source may carry several flags or none.

The thesis admits a cost category only where it is **attested by more than one independent
source**. `category_attestation.csv` reports the attesting source count per category and
so substantiates that rule; all five categories clear it.

## Limitations

**Single-rater appraisal.** All 96 sources were appraised by the author alone. No second
rater re-scored any part of the corpus, so **inter-rater agreement cannot be reported**.
The Objectivity criterion is the most exposed, since judging commercial bias in
vendor-authored material involves more interpretation than the other five. Scores close to
the inclusion threshold should be read as indicative rather than exact, and the
core/supporting partition as one defensible classification of the corpus rather than the
only one.

**Capped academic search.** Queries returning large result sets were screened only to the
first 50 results by relevance. Recall is therefore bounded by the ranking of each engine.

## Files in this part of the deposit

| File | Contents |
|---|---|
| `protocol.md` | this document |
| `sources.csv` | all 96 appraised sources: citation, URL, dates, six scores, total, classification, theme flags |
| `category_attestation.csv` | attesting source count and ids per cost category |
| `search_record.md` | search engines, queries, hit counts, dates and screening depth |
| `search_queries.csv` | the same search record in machine-readable form |
