"""Recover the reference model's hidden parameters from its published outputs.

Two inversions, both on the reference series alone:
  1. the monthly token volume, from the API cumulative at each horizon divided by the
     blended price of the tier the case is priced against;
  2. the recurring cost per accelerator per month, by least squares on the self-hosted
     series with the acquisition cost held at its agreed value.
The second is what localises the disagreement to one undisclosed parameter.
"""
import csv, sys, pathlib, statistics
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, INPUT_SHARE, OUTPUT_SHARE

def main(out="out/inverted_reference.csv", verbose=True):
    ref = {}
    with open("data/reference_series_long.csv", newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            ref.setdefault((int(r["case"]), r["deployment_mode"]), {})[int(r["month"])] = float(r["cumulative_usd"])

    rows, by_gpu = [], {}
    for c in load_cases():
        api = ref[(c.case, "api")]; m_max = max(api)
        blend = (INPUT_SHARE * c.api_price_in_usd_per_mtok + OUTPUT_SHARE * c.api_price_out_usd_per_mtok)
        tok_m = api[m_max] / m_max / blend
        self_ = ref[(c.case, "self_hosted")]
        months = sorted(self_)
        y = [self_[m] - c.acquisition_usd for m in months]
        rate_per_gpu = sum(v * m for v, m in zip(y, months)) / sum(m * m for m in months) / c.n_gpu
        by_gpu.setdefault(c.gpu, []).append(rate_per_gpu)
        rows.append(dict(case=c.case, gpu=c.gpu, n_gpu=c.n_gpu, api_model=c.api_model,
                         tokens_m_recovered=round(tok_m, 4),
                         tokens_m_used=c.tokens_m_per_month,
                         tokens_err_pct=round((c.tokens_m_per_month / tok_m - 1) * 100, 4),
                         reference_rate_usd_per_gpu_month=round(rate_per_gpu, 4),
                         estimator_rate_usd_per_gpu_month=round(c.energy_usd_per_month / c.n_gpu, 4)))
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    for g, v in (sorted(by_gpu.items()) if verbose else []):
        print(f"invert_reference: {g:9s} reference rate ${statistics.fmean(v):.3f}/GPU-month "
              f"(range {min(v):.3f}-{max(v):.3f}, n={len(v)})")
    return rows, {g: statistics.fmean(v) for g, v in by_gpu.items()}

if __name__ == "__main__":
    main()
