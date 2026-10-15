"""Compare the estimator's series against the reference calculator's published series.

MAPE is the mean over a case's horizon of |(estimated - reference) / reference| x 100,
matching scripts/pan-reference-comparison.ts. The reference values are integers as
published, which is why the residual has a floor.
"""
import csv, sys, pathlib, statistics
sys.path.insert(0, str(pathlib.Path(__file__).parent / "src"))
from tco_model import load_cases, DATA_DIR, OUT_DIR

def stratum(c):
    if c.gpu == "RTX 5090":                return "RTX 5090 (1 GPU)"
    return "A100 (1-2 GPUs)" if c.n_gpu <= 2 else "A100 (4-8 GPUs)"

def load_reference(path=DATA_DIR / "reference_series_long.csv"):
    ref = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            ref[(int(r["case"]), r["deployment_mode"], int(r["month"]))] = float(r["cumulative_usd"])
    return ref

def main(series_path=OUT_DIR / "estimator_outputs.csv", out=OUT_DIR / "crossvalidation_errors.csv",
         table_out=OUT_DIR / "table2_api_columns.csv"):
    ref = load_reference()
    est = {}
    with open(series_path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            est[(int(r["case"]), r["deployment_mode"], int(r["month"]))] = float(r["cumulative_usd"])

    dedup, seen = {}, set()
    rows = []
    for c in load_cases():
        rec = dict(case=c.case, gpu=c.gpu, N=c.n_gpu, H=c.horizon_months, stratum=stratum(c))
        key = (c.self_hosted_model, c.gpu, c.n_gpu, c.horizon_months)
        rec["dedup"] = key not in seen; seen.add(key)
        for mode, tag in (("self_hosted", "self"), ("api", "api")):
            e = [abs((est[(c.case, mode, m)] - ref[(c.case, mode, m)]) / ref[(c.case, mode, m)]) * 100
                 for m in range(1, c.horizon_months + 1)]
            rec[f"{tag}_mape"], rec[f"{tag}_min"], rec[f"{tag}_max"] = (
                statistics.fmean(e), min(e), max(e))
        rows.append(rec)

    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["case","gpu","N","H","dedup","self_mape","self_min",
                                           "self_max","api_mape","api_min","api_max","stratum"])
        w.writeheader()
        for r in rows: w.writerow({k: r[k] for k in w.fieldnames})

    strata = {}
    for r in rows: strata.setdefault(r["stratum"], []).append(r["api_mape"])
    allv = [r["api_mape"] for r in rows]
    with open(table_out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(["stratum","n","mean_mape","median_mape","max_case_mape"])
        for k in sorted(strata):
            v = strata[k]
            w.writerow([k, len(v), round(statistics.fmean(v),4), round(statistics.median(v),4), round(max(v),4)])
        w.writerow(["All cases", len(allv), round(statistics.fmean(allv),4),
                    round(statistics.median(allv),4), round(max(allv),4)])

    dd = [r for r in rows if r["dedup"]]
    print(f"crossvalidate: self MAPE {statistics.fmean([r['self_mape'] for r in dd]):.4f}% over "
          f"{len(dd)} de-duplicated cases (median {statistics.median([r['self_mape'] for r in dd]):.4f}, "
          f"max {max(r['self_mape'] for r in dd):.4f}); api MAPE {statistics.fmean(allv):.4f}% over {len(rows)}")
    return rows

if __name__ == "__main__":
    main()
