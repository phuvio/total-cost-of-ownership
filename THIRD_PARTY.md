# Third-party material in this deposit

Code in this repository is licensed Apache-2.0 and data CC-BY-4.0, **with the exception of
the material listed below, which is not the authors' to license.** This file records what
that material is, where it came from, and on what basis it is included.

## 1. Values extracted from the reference model's calculator

**Files:** `data/reference_cases.csv`, `data/reference_series_long.csv`, and the source
workbook if deposited as provenance. The `gpu_power_w_calculator`,
`api_price_*_usd_per_mtok`, `tokens_m_per_month` and `break_even_month` columns of
`data/case_parameters.csv` and `data/api_prices.csv` carry the same values.

**Source:** the cost calculator accompanying

> G. Pan, V. Chodnekar, A. Roy and H. Wang, "A Cost-Benefit Analysis of On-Premise Large
> Language Model Deployment: Breaking Even with Commercial LLM Services," *Proc. 2025 IEEE
> International Conference on Big Data (BigData)*, 2025, pp. 2234–2239.
> doi:10.1109/BigData66926.2025.11400957

at `v0-ai-cost-calculator.vercel.app`, **accessed 2026-09-03**. The extraction procedure is
documented in `data/reference_extraction_README.md`.

**What it is.** 550 monthly cumulative cost figures produced by entering 24 parameter
combinations into that calculator and recording its output, plus the break-even month it
reports for each. They are included so that the cross-validation in Section V can be
checked rather than taken on trust; the entire argument of that section is a comparison
against these numbers, and without them nothing in it is verifiable.

**What is and is not licensed here.** The CC-BY-4.0 grant on this deposit's data covers the
authors' own contribution — the file structure, the case construction, the derived and
computed columns, and the estimator's own outputs. **It does not and cannot extend to the
extracted reference values themselves.** Anyone reusing those should attribute them to the
work above and, for anything beyond verification of this paper's claims, go to the
calculator rather than to this copy.

**Why we consider inclusion appropriate.** Three reasons, in order of weight:

1. The values are the subject of scholarly criticism and verification. Reproducing exactly
   what is needed to check a published claim is the ordinary basis on which replication
   material is deposited, and the quotation right for criticism and review is the relevant
   one here.
2. They are individual numeric facts, not expressive content, and the quantity is small —
   550 figures across 24 configurations.
3. They are *computed* on request rather than collected: the calculator generates each
   figure from the parameters entered. The EU database right protects investment in
   obtaining, verifying and presenting the contents of a database, and the case law
   distinguishes that from investment in *creating* the data. Generated output is a weak
   fit for that right.

**This is reasoning, not legal advice, and the authors are not lawyers.** The first point
is the load-bearing one and does not depend on the other two. If certainty is wanted before
a public deposit, the university's open-science or legal services are the right place to
confirm it; Zenodo asks the depositor to affirm the right to deposit under the chosen
licence, and that affirmation should be made knowingly.

## 2. Bibliographic metadata for the grey-literature corpus

**File:** `appraisal/sources.csv`.

Contains the identifier, title, citation string, URL and publication or access date of 96
third-party sources, together with the authors' own appraisal scores and classification.
**No abstracts, excerpts or quotations from those sources are reproduced** — the longest
text field is a 280-character reference string. Bibliographic metadata of this kind is
routinely redistributed, and the appraisal scores are the authors' own.

## 3. Published factual parameters

Accelerator nameplate power ratings (575 W, 400 W) and the API price tiers are published
figures from hardware and service vendors, reported in the reference work's Tables I and II
and in the calculator. They appear in `data/case_parameters.csv`,
`data/table3_parameters.csv` and `data/api_prices.csv` as factual parameters with their
source named in the README.

## 4. No vendored third-party code

The estimator and the analysis scripts are the authors' own. Nothing in this repository
vendors, forks or adapts third-party source code. `src/lib/tco-calculations.ts` cites
published work in comments — Dettmers et al. (2022), Frantar et al. (2022), Chen et al.
(2023), Ong et al. (2024), Kwon et al. (2023), Leviathan et al. (2023), MLCommons MLPerf —
as the provenance of modelling choices and default values, not as incorporated code.

Runtime dependencies are declared in `requirements.txt`; each is separately licensed by its
own project and none is redistributed here.

## 5. How the two licences divide by directory

The split is by directory, with no per-extension caveat, so anyone copying a directory
wholesale gets one licence and one set of obligations:

| Directory | Contents | Licence |
|---|---|---|
| `src/`, `api/`, `public/`, `scripts/` | source code, including the Python analysis scripts | Apache-2.0 |
| `data/`, `out/`, `figures/` | inputs, regenerated tables, figures | CC-BY-4.0, subject to §1 above |

For that to hold, nothing that is data may sit under a code directory and nothing that is
code may sit under a data one. In particular the TypeScript export scripts must write their
CSV output to `out/` rather than beside themselves in `scripts/`.
