"""Evaluate all 24 cases over their horizons and write the estimator's monthly series."""
import csv, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, SCENARIOS

def main(out="out/estimator_outputs.csv"):
    rows = []
    for c in load_cases():
        for m in range(1, c.horizon_months + 1):
            rows.append(dict(case=c.case, deployment_mode="self_hosted", month=m,
                             setup_usd=round(c.acquisition_usd, 2),
                             monthly_rate_usd=round(c.energy_usd_per_month, 6),
                             cumulative_usd=round(c.self_cumulative(m), 6)))
            rows.append(dict(case=c.case, deployment_mode="api", month=m,
                             setup_usd=0.0,
                             monthly_rate_usd=round(c.api_usd_per_month, 6),
                             cumulative_usd=round(c.api_cumulative(m), 6)))
    rows.sort(key=lambda r: (r["case"], r["deployment_mode"], r["month"]))
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    print(f"run_cases: {len(rows)} rows -> {out}")
    return rows

if __name__ == "__main__":
    main()
