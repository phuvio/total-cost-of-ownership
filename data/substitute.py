"""Replace the estimator's recurring rate with the rate fitted to the reference series.

This is the test that the disagreement is one parameter and not a structural difference:
if substituting the fitted rate collapses the error, the two models are the same model
with different numbers in one place.
"""
import csv, sys, pathlib, statistics
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, break_even
from invert_reference import main as invert

def main(out="out/crossvalidation_verified.csv"):
    _, fitted = invert(out="out/inverted_reference.csv", verbose=False)
    ref = {}
    with open("data/reference_series_long.csv", newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            ref.setdefault((int(r["case"]), r["deployment_mode"]), {})[int(r["month"])] = float(r["cumulative_usd"])

    rows, seen = [], set()
    for c in load_cases():
        series = ref[(c.case, "self_hosted")]
        months = sorted(series)
        def mape(rate):
            return statistics.fmean([abs((c.acquisition_usd + rate * m - series[m]) / series[m]) * 100
                                     for m in months])
        orig, subst = mape(c.energy_usd_per_month), mape(fitted[c.gpu] * c.n_gpu)
        be_ref = next((m for m in months if series[m] <= ref[(c.case, "api")][m]), None)
        be_orig, _ = break_even(c, months=c.horizon_months)
        be_subst, _ = break_even(c, months=c.horizon_months,
                                 energy_usd_per_month=fitted[c.gpu] * c.n_gpu)
        key = (c.self_hosted_model, c.gpu, c.n_gpu, c.horizon_months)
        api_series = ref[(c.case, "api")]
        api_mape = statistics.fmean([abs((c.api_cumulative(m) - api_series[m]) / api_series[m]) * 100
                                     for m in months])
        rows.append(dict(case=c.case, dedup=key not in seen,
                         self_mape_orig=round(orig, 5), self_mape_subst=round(subst, 5),
                         api_mape=round(api_mape, 4),
                         be_pan=be_ref, be_orig=be_orig, be_subst=be_subst))
        seen.add(key)
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    dd = [r for r in rows if r["dedup"]]
    agree = sum(r["be_pan"] == r["be_orig"] for r in rows)
    agree_s = sum(r["be_pan"] == r["be_subst"] for r in rows)
    print(f"substitute: MAPE {statistics.fmean([r['self_mape_orig'] for r in dd]):.4f}% -> "
          f"{statistics.fmean([r['self_mape_subst'] for r in dd]):.5f}% "
          f"(median {statistics.median([r['self_mape_subst'] for r in dd]):.5f}, "
          f"max {max(r['self_mape_subst'] for r in dd):.5f}); "
          f"break-even agreement {agree}/{len(rows)} -> {agree_s}/{len(rows)}")
    return rows

if __name__ == "__main__":
    main()
