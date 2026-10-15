"""The engineering-effort boundary.

B = H * dc0 - dS0 is the incremental engineering spend over the horizon H that
self-hosting can absorb and still repay. H* = B / w converts it to hours at an
illustrative labour rate w; B itself carries no labour rate. The critical API bill is
the rearrangement B >= 0  <=>  c_api > c_self + dS/H.
"""
import csv, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, break_even, MONTHS, DATA_DIR, OUT_DIR

LABOUR_RATE_USD_PER_HOUR = 100.0   # illustrative conversion only

def main(out=OUT_DIR / "engineering_budget_table.csv", bill_out=OUT_DIR / "critical_api_bill.csv"):
    rows, bills = [], {}
    for c in load_cases():
        dc = c.api_usd_per_month - c.energy_usd_per_month
        dS = c.acquisition_usd
        B = MONTHS * dc - dS
        be, dstar = break_even(c, months=c.horizon_months)
        rows.append(dict(case=c.case, api=c.api_model, gpu=f"{c.n_gpu}x{c.gpu}",
                         tokens_M=c.tokens_m_per_month,
                         api_monthly=round(c.api_usd_per_month, 4),
                         self_monthly=round(c.energy_usd_per_month, 4),
                         dC=round(dS, 2), dc=round(dc, 4),
                         dstar=round(dstar, 4) if dstar else None, be=be,
                         B=round(B, 2),
                         H_star_hours_at_100usd=round(B / LABOUR_RATE_USD_PER_HOUR, 2)))
        bills[f"{c.n_gpu}x{c.gpu}"] = dict(
            gpu=c.gpu, n_gpu=c.n_gpu, hardware_price_usd=round(dS, 2),
            self_recurring_usd_month=round(c.energy_usd_per_month, 4),
            horizon_months=MONTHS,
            critical_api_bill_usd_month=round(c.energy_usd_per_month + dS / MONTHS, 2))
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    order = sorted(bills, key=lambda s: (s.split("x")[1], int(s.split("x")[0])))
    with open(bill_out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(bills[order[0]])); w.writeheader()
        for k in order: w.writerow(bills[k])
    sign_ok = sum((r["B"] >= 0) ==
                  (r["api_monthly"] > bills[r["gpu"]]["critical_api_bill_usd_month"]) for r in rows)
    pos = [r["B"] for r in rows if r["B"] > 0]
    print(f"budget: {sum(r['B'] < 0 for r in rows)} negative, {len(pos)} positive; "
          f"min ${min(r['B'] for r in rows):,.2f}, max ${max(pos):,.2f}; "
          f"critical-bill rule reproduces sign(B) in {sign_ok}/{len(rows)}")
    return rows

if __name__ == "__main__":
    main()
