"""Break-even under the four engineering-effort scenarios A-D.

Scenario hours are those of scripts/pan-engineering-sensitivity.ts. Their incremental
cost at $100/hour over 24 months is $0, $30,000, $88,000 and $132,000. The mean
break-even month is reported over the cases that survive EVERY level, so the four means
are comparable; reporting it over each level's own survivors would not be.
"""
import csv, sys, pathlib, statistics
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, break_even, SCENARIOS, MONTHS, DATA_DIR, OUT_DIR

def main(out=OUT_DIR / "scenario_grid_results.csv"):
    cases = load_cases()
    # The effort scenarios run over the full 24-month horizon, not each case's own
    # cross-validation horizon: those horizons come from the reference calculator and
    # exist only to match its published series.
    be = {k: {c.case: break_even(c, SCENARIOS[k], months=MONTHS)[0] for c in cases}
          for k in SCENARIOS}
    survivors = {k: sorted(c for c, m in be[k].items() if m is not None) for k in SCENARIOS}
    always = sorted(set.intersection(*(set(v) for v in survivors.values())))
    rows = []
    for k in sorted(SCENARIOS):
        s = survivors[k]
        rows.append(dict(scenario=k,
                         incremental_usd=round(SCENARIOS[k].incremental_usd, 2),
                         n_break_even=len(s),
                         mean_be_month_own_survivors=round(statistics.fmean([be[k][c] for c in s]), 4) if s else None,
                         mean_be_month_common_survivors=round(statistics.fmean([be[k][c] for c in always]), 4),
                         survivor_cases=" ".join(map(str, s))))
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    print(f"scenario_grid: counts {[r['n_break_even'] for r in rows]} at "
          f"{[r['incremental_usd'] for r in rows]}; common survivors {always}; "
          f"mean break-even {[r['mean_be_month_common_survivors'] for r in rows]}")
    return rows

if __name__ == "__main__":
    main()
