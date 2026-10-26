"""Sensitivity of break-even to the electricity tariff, operating profile, hardware
ownership and effort.

Grid: 5 tariffs x 2 operating profiles x 2 hardware states x 4 effort scenarios x 24
cases = 1920 rows. The 730-hour profile is continuous operation (24 h x 30.44 d); 160 h
is the business-hours profile the cross-validation uses. Break-even is evaluated over the
full 24 months rather than each case's own horizon, following the effort-scenario
convention: an effort level can push break-even past a horizon that was derived without
any effort at all. The "owned" hardware state sets
the self-deployed acquisition cost to zero, modelling a deployment on hardware the team
already has; "acquired" is the purchase case the cross-validation uses.

Break-even is reported two ways, following the TypeScript conventions: the first integer
month at which self-hosting is no longer behind, and the linearly interpolated crossing,
which is what a fractional shift is measured on.
"""
import csv, sys, pathlib
from dataclasses import replace
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, break_even, SCENARIOS, DAYS_PER_MONTH, MONTHS, DATA_DIR, OUT_DIR

TARIFFS = [0.05, 0.10, 0.15, 0.25, 0.40]
PROFILES = {"business_160h": 160.0, "continuous_730h": round(24 * DAYS_PER_MONTH, 2)}
HARDWARE = ["acquired", "owned"]
BASELINE = (0.15, 160.0, "A")


def main(out=OUT_DIR / "electricity_grid.csv"):
    rows = []
    for c in load_cases():
        for hw in HARDWARE:
            case = c if hw == "acquired" else replace(c, gpu_unit_price_usd=0.0)
            block = []
            for pname, hours in PROFILES.items():
                for tariff in TARIFFS:
                    rate = case.n_gpu * case.gpu_power_w / 1000.0 * hours * tariff
                    for sc in sorted(SCENARIOS):
                        first, cont = break_even(case, SCENARIOS[sc], months=MONTHS,
                                                 energy_usd_per_month=rate)
                        block.append(dict(case=case.case, gpu=case.gpu, n_gpu=case.n_gpu,
                                          hardware=hw, operating_hours=hours, profile=pname,
                                          electricity_usd_per_kwh=tariff, scenario=sc,
                                          self_monthly_usd=round(rate, 4),
                                          first_break_even_month=first,
                                          break_even_month=None if first is None or cont is None
                                                           else round(cont, 6)))
            # Two reference points per (profile, scenario) block. The baseline is the
            # $0.15 run, following the TypeScript. The tariff span is measured from the
            # cheapest tariff to the dearest, which is what the sensitivity claim reports:
            # it answers "how far can the tariff move break-even", not "how far from the
            # value we happened to assume".
            base = {(r["profile"], r["scenario"]): r for r in block
                    if r["electricity_usd_per_kwh"] == 0.15}
            lo = {(r["profile"], r["scenario"]): r for r in block
                  if r["electricity_usd_per_kwh"] == min(TARIFFS)}
            hi = {(r["profile"], r["scenario"]): r for r in block
                  if r["electricity_usd_per_kwh"] == max(TARIFFS)}
            for r in block:
                b = base[(r["profile"], r["scenario"])]
                bf, bc = b["first_break_even_month"], b["break_even_month"]
                r["baseline_first_break_even_month"] = bf
                r["baseline_break_even_month"] = bc
                r["shift_months"] = (None if (r["first_break_even_month"] is None or bf is None)
                                     else r["first_break_even_month"] - bf)
                r["shift_months_continuous"] = (
                    None if (r["break_even_month"] is None or bc is None)
                    else round(r["break_even_month"] - bc, 6))
                r["shift_pct_continuous"] = (
                    None if (r["shift_months_continuous"] is None or not bc)
                    else round(100.0 * r["shift_months_continuous"] / bc, 4))
                k = (r["profile"], r["scenario"])
                blo, bhi = lo[k]["break_even_month"], hi[k]["break_even_month"]
                r["tariff_span_months"] = (None if (blo is None or bhi is None)
                                           else round(bhi - blo, 6))
                r["tariff_span_pct"] = (None if (blo is None or bhi is None or not blo)
                                        else round(100.0 * (bhi - blo) / blo, 4))
                r["lost_at_max_tariff"] = (lo[k]["first_break_even_month"] is not None
                                           and hi[k]["first_break_even_month"] is None)
            rows.extend(block)
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    changed = sum(1 for r in rows if r["shift_months"] not in (None, 0))
    print(f"electricity_grid: {len(rows)} rows; break-even differs from baseline in {changed}")
    return rows


if __name__ == "__main__":
    main()
