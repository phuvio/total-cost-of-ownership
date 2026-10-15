# Replication material

Code, parameters and result tables for *"Self-Hosting or API? Undisclosed Parameters and
the Engineering-Effort Boundary in LLM Deployment Architecture."*

Anonymised for double-anonymous review.

This deposit exists so that every number in the paper can be checked. It is not the
estimator's application repository: the interactive calculator, its web front end, its
optimisation features and its deployment instructions are out of scope here. The
cost model included is the one the paper's cross-validation exercises, with every
optimisation and architecture term set to zero, which is the parameterisation Section IV
describes and Section III.E bounds.

## Reproduce everything

```
python scripts/run_all.py        # regenerates every table in out/
python scripts/make_figures.py   # regenerates Figures 1-4 in figures/
```

Both read `data/case_parameters.csv` and nothing else, and both resolve their input and
output directories from their own location rather than the working directory, so the
invocation directory does not matter. Run them as `python scripts/run_all.py` from the
repository root, or from inside `scripts/`; either way the tables land in `out/` and the
figures in `figures/`. **Python 3.10 or later** (the only
version-sensitive construct is a PEP 604 union in `scripts/tco_model.py`); developed on 3.11
and 3.12. `run_all.py` and the eight step scripts use **only the standard library** — if
you want to check the numbers rather than redraw the figures, you need nothing installed.
`make_figures.py` needs numpy, pandas and matplotlib; see `requirements.txt`.

## Claim-to-file map

Each numeric claim in the paper against the file that holds it and the script that
produces it.

| Claim | Value | File | Script |
|---|---|---|---|
| API monthly rates agree (§I, §V.A, abstract) | within 0.0046%, mean 0.0011% | `out/inverted_reference.csv` | `invert_reference.py` |
| API trajectory MAPE (Table II) | 0.0037% mean, 0.0021% median, 0.0130% worst | `out/crossvalidation_errors.csv`, `out/table2_api_columns.csv` | `crossvalidate.py` |
| Self-deployed MAPE, 18 de-duplicated cases (Table II) | 0.8776% mean, 0.9010% median, 1.8485% worst | `out/crossvalidation_errors.csv` | `crossvalidate.py` |
| Recurring rate per accelerator, fitted vs ours (§V.A, Table III) | \$15.34 vs \$13.80; \$29.60 vs \$9.60 | `data/table3_parameters.csv`, `out/inverted_reference.csv` | `invert_reference.py` |
| Parameter error (§I, §V.A, Table III) | 10.0% and 67.6% | `data/table3_parameters.csv` | `invert_reference.py` |
| Implied draws and reconciling hours (§V.D, Table III) | 640 W / 1,230 W; 178 h / 493 h | `data/table3_parameters.csv` | `invert_reference.py` |
| Acquisition share of cumulative (§V.B) | 94.2%-99.4% at horizon; 99.3%-99.9% in month 1 | `data/derived_shares.csv` | — (derived in place) |
| MAPE after substituting the fitted rates (§I, §V.D) | 0.00392% mean, 0.00106% median, 0.01229% worst | `out/crossvalidation_verified.csv` | `substitute.py` |
| Break-even agreement (§V.D) | 23 of 24 → 24 of 24; the exception is case 24 | `out/crossvalidation_verified.csv` | `substitute.py` |
| Engineering budget per case (§VI.C, Fig. 3) | 9 negative, 15 positive; −\$30,304 to \$571,265 | `out/engineering_budget_table.csv` | `budget.py` |
| The empty interval (§VI.C, Figs. 3-4) | \$19,555 to \$146,698, a factor of 7.5 | `out/engineering_budget_table.csv` | `budget.py` |
| *H*\* at \$100/hour (§VI.C) | 82-196 h; 1,467-5,713 h | `out/engineering_budget_table.csv` | `budget.py` |
| Critical API bill (§VI.C) | \$97.13 (1×RTX 5090) to \$4,076.80 (8×A100) | `out/critical_api_bill.csv` | `budget.py` |
| Scenario grid (§VI.D, Fig. 4) | 15 / 7 / 7 / 7 at \$0 / \$30,000 / \$88,000 / \$132,000 | `out/scenario_grid_results.csv` | `scenario_grid.py` |
| Mean break-even over the seven common survivors (§VI.D) | 3.14 / 4.14 / 6.86 / 12.14 | `out/scenario_grid_results.csv` | `scenario_grid.py` |
| Electricity sensitivity (§VI.E) | 960 combinations; break-even differs from baseline in 161 | `out/electricity_grid.csv` | `electricity_grid.py` |
| Recurring cost as a share of the API bill (§VII) | 0.145%-3.209%, median 1.5% | `data/derived_shares.csv` | — (derived in place) |
| Grey-literature appraisal (§II) | 96 appraised, 41 core, 23 supporting, 32 excluded | `appraisal/sources.csv` | — (transcribed) |

## The six disclosure items of Section VII, answered for this model

Section VII argues that a deployment cost analysis should disclose six things. The same
list applied to this deposit:

1. **Recurring cost of operated hardware.** 575 W (RTX 5090) and 400 W (A100),
   **manufacturer nameplate, board level**, at 160 operating hours per month and
   \$0.15/kWh. These are the vendor nameplates this study adopted, *not* values read off
   the reference calculator, which displays 500 W for the same card. Per case in
   `data/case_parameters.csv`.
2. **Hardware acquisition cost.** \$2,000 per RTX 5090 and \$12,000 per A100, as the
   reference calculator applies them, **capitalised at acquisition and not amortised**.
   The reference publication's Table II prices the A100 at \$15,000.
3. **Workload.** Monthly token volume per case, taken directly from the reference
   calculator, with tokens per request derived from it at full precision as the volume
   over 6,000 × 30.44 monthly requests, split one third input and two thirds output.
   `data/case_parameters.csv` carries the volume as used, as the reference states it, and
   as recovered from its outputs. **One cap belongs here too:** the cost model clips
   tokens per request at `contextLength` (4096) and `responseLength`. `responseLength` is
   set to 2500, above the largest case in the set (Kimi-K2 at 1850.27 output tokens per
   request), so the cap does not bind. At the library default of 512 it would, truncating
   the three largest models.
4. **API prices.** `data/api_prices.csv` — all five tiers the reference calculator offers,
   input and output, accessed 2026-09-03, with the one point where the calculator and the
   publication's Table I disagree flagged, and the excluded fifth tier carrying its reason.
5. **Engineering effort.** **Zero in the cross-validation** — one-off and recurring hours
   and the hourly rate are all set to zero, so Section V compares the two models on
   infrastructure alone. In Section VI effort is incremental and deliberately unassigned:
   the budget *B* is reported in currency and carries no labour rate; the \$100/hour figure
   is an illustrative conversion only.
6. **Numeric precision of published outputs.** The reference calculator publishes integer
   currency. Percentage errors here are computed from **unrounded** estimator values, and
   the series in `out/estimator_outputs.csv` carry six decimals. This is why the residual
   agreement is 0.0037% rather than zero, and why five of the 24 cases reproduce the
   reference API series exactly.

## Three conventions you need in order to reproduce the numbers

None is inferable from the data, and each changes a published figure if guessed
differently.

1. **De-duplication.** The 18 de-duplicated cases drop any case whose self-deployed series
   is identical to an earlier case's on *(self-deployed model, accelerator type,
   accelerator count, horizon)*. That removes exactly the six Gemini 2.5 Pro cases — 3, 9,
   13, 16, 19 and 22 — each repeating the self-deployed side of a GPT-5 case at the same
   horizon. De-duplicating on hardware and token volume instead yields 9 cases and an
   0.8920% MAPE rather than 0.8776%. The flag is the `dedup` column.
2. **Horizon.** The cross-validation uses each case's own horizon, taken from the reference
   calculator's published break-even, which is why horizons range from 6 to 22 months. The
   **effort scenarios of Section VI.D use the full 24 months**, since those horizons exist
   only to match the reference series. Running the scenarios on the per-case horizons gives
   counts of 15 / 7 / 6 / 3 instead of 15 / 7 / 7 / 7.
3. **Rounding basis.** Percentage errors come from unrounded estimator values, as above.
   Rounding the estimator side to the cent before comparing moves two of Table II's medians
   by 0.0001 — the same effect Section V.B attributes to the reference calculator's integer
   outputs, reproduced accidentally on our own side.

## Layout

```
scripts/tco_model.py      the cost model (Python); see the note below
scripts/run_all.py        regenerates every table in out/
scripts/run_cases.py      evaluates all 24 cases, both modes, over their horizons
scripts/crossvalidate.py  MAPE against the reference series, per case and per stratum
scripts/invert_reference.py  recovers the reference model's token volumes and recurring rate
scripts/substitute.py     re-runs the self-deployed side with the fitted rates
scripts/budget.py         B, H*, and the critical API bill
scripts/scenario_grid.py  the four effort scenarios
scripts/electricity_grid.py  the tariff x profile x scenario x case grid
scripts/make_figures.py   Figures 1-4, with no plotted value or title number hardcoded
src/lib/tco-calculations.ts  the cost model as implemented and used to produce the results
data/                     inputs and published parameter tables
out/                      everything the scripts regenerate
figures/                  Figures 1-4
appraisal/                the grey-literature appraisal behind Section II
```

The scripts resolve `data/` and `out/` from their own location, so `python scripts/run_all.py`
from the repository root and `python run_all.py` from inside `scripts/` both work and both
write to `out/` at the root.

**On the two cost models.** `src/lib/tco-calculations.ts` is the implementation: the results
in the paper were produced by it. `scripts/tco_model.py` is a **port** of it, restricted to the
parameter regime the study uses, written so that the pipeline runs without a Node
toolchain. It reproduces the TypeScript to within 1.5 × 10⁻⁵ percentage points on every
per-case MAPE. Where the two disagree, the TypeScript is authoritative.

## Provenance and licence

The reference model's published figures in `data/reference_cases.csv` and
`data/reference_series_long.csv` are **not ours** — they were extracted from another
group's published calculator on 2026-09-03 and are included so the cross-validation can be
checked. `data/reference_extraction_README.md` documents the extraction;
`THIRD_PARTY.md` sets out what is and is not licensed here and on what basis it is
included. **Read `THIRD_PARTY.md` before reusing anything under `data/`.**

Code is licensed Apache-2.0 (`LICENSE`); the authors' own data and research outputs are
licensed CC-BY-4.0 (`LICENSE-DATA`), subject to the carve-out in `THIRD_PARTY.md`.
