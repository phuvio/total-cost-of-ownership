"""Sensitivity of break-even to the electricity tariff, operating profile and effort.

Grid: 5 tariffs x 2 operating profiles x 4 effort scenarios x 24 cases = 960 rows.
The 730-hour profile is continuous operation (24 h x 30.44 d); 160 h is the
business-hours profile the cross-validation uses.
"""
import csv, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, break_even, SCENARIOS, DAYS_PER_MONTH, DATA_DIR, OUT_DIR

TARIFFS = [0.05, 0.10, 0.15, 0.25, 0.40]
PROFILES = {"business_160h": 160.0, "continuous_730h": round(24 * DAYS_PER_MONTH, 2)}
BASELINE = (0.15, 160.0, "A")

def main(out=OUT_DIR / "electricity_grid.csv"):
    rows = []
    for c in load_cases():
        base = None
        for pname, hours in PROFILES.items():
            for tariff in TARIFFS:
                rate = c.n_gpu * c.gpu_power_w / 1000.0 * hours * tariff
                for sc in sorted(SCENARIOS):
                    first, _ = break_even(c, SCENARIOS[sc], months=c.horizon_months,
                                          energy_usd_per_month=rate)
                    if (tariff, hours, sc) == BASELINE: base = first
                    rows.append(dict(case=c.case, gpu=c.gpu, n_gpu=c.n_gpu,
                                     operating_hours=hours, profile=pname,
                                     electricity_usd_per_kwh=tariff, scenario=sc,
                                     self_monthly_usd=round(rate, 4),
                                     first_break_even_month=first))
        for r in rows[-len(TARIFFS) * len(PROFILES) * len(SCENARIOS):]:
            r["baseline_first_break_even_month"] = base
            r["shift_months"] = (None if (r["first_break_even_month"] is None or base is None)
                                 else r["first_break_even_month"] - base)
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    changed = sum(1 for r in rows if r["shift_months"] not in (None, 0))
    print(f"electricity_grid: {len(rows)} rows; break-even differs from baseline in {changed}")
    return rows

if __name__ == "__main__":
    main()
