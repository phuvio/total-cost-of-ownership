# Reference-model extraction — Pan et al. calculator

Extracted from the public calculator accompanying Pan et al., *A Cost-Benefit Analysis of
On-Premise Large Language Model Deployment*, IEEE BigData 2025,
doi:10.1109/BigData66926.2025.11400957.

- **Calculator:** `v0-ai-cost-calculator.vercel.app`
- **Accessed:** 3 September 2026
- **Provenance record:** `Pan results, accessed 3.9.2026.xlsx` (the original extraction,
  deposited unaltered)
- **Machine-readable form:** `reference_cases.csv` and `reference_series_long.csv`

These are figures produced by another group's instrument, reproduced here only so the
cross-validation can be verified. They are not our data.

## Files

**`reference_cases.csv`** — one row per case (24 rows).

| Column | Meaning |
| --- | --- |
| `case` | case identifier, 1–24 |
| `self_hosted_model` | open-weight model selected in the calculator |
| `gpu`, `n_gpu` | accelerator type and count selected |
| `gpu_power_w_calculator` | power the calculator displays for that accelerator |
| `api_model` | commercial tier compared against |
| `tokens_m_per_month` | monthly token volume the calculator reports, millions |
| `api_price_in_usd_per_mtok`, `api_price_out_usd_per_mtok` | prices the calculator applies |
| `break_even_month` | break-even the calculator reports; empty where none is reached |
| `horizon_months` | length of the series the calculator returns |

**`reference_series_long.csv`** — one row per (case, mode, month), 550 rows.

| Column | Meaning |
| --- | --- |
| `case` | 1–24 |
| `deployment_mode` | `self_hosted` or `api` |
| `month` | 1-based month index |
| `cumulative_usd` | cumulative cost as published — **integer**, see below |

## Fixed parameters

Not per-case, and not all exposed by the calculator:

| Parameter | Value | Source |
| --- | --- |
| Electricity tariff | \$0.15/kWh | displayed by the calculator |
| RTX 5090 unit price | \$2,000 | calculator |
| A100 unit price | \$12,000 | calculator (Table II of the publication reports \$15,000) |
| Monthly operating hours | 160 (8 h × 20 d) | publication text; **not exposed by the calculator** |
| Input:output token split | 1:2 | publication Eq. (5); **not exposed by the calculator** |

## Two things a reader needs to know

**The calculator publishes integer currency.** Every value in `cumulative_usd` is a whole
dollar amount as returned by the instrument. Relative errors computed against this column
therefore carry a rounding floor that falls as the cumulative grows — which is why the
residual agreement after parameter substitution is 0.004% rather than zero.

**Tokens per request are derived, not extracted.** The calculator exposes only a monthly
token volume. The per-request token counts used in the comparison follow from dividing that
volume by the assumed monthly request count and splitting input to output one to two, per
Eq. (5) of the publication. Any per-request token figure in our own tables is our mapping,
not a calculator output.

## Why the original CSV export is not the machine-readable copy

The `.csv` exported directly from the workbook is semicolon-delimited with comma decimal
separators (`126,7`, `1,25`) and space-grouped currency strings (`" $2 015 "`). A default
`pandas.read_csv` on it returns a 72 × 2 frame. The two CSVs above are generated from the
workbook with numeric types and ASCII separators; the workbook is kept as the provenance
record.
