"""Render Figures 1-4 from the regenerated tables.

Run after run_all.py. Every value plotted, every threshold shaded and every number
appearing in a title or annotation is read from out/ or data/ -- nothing is hardcoded,
so the figures cannot drift out of step with the tables.

Depends only on numpy, pandas and matplotlib.

    python make_figures.py [--outdir figures]
"""
from __future__ import annotations

import argparse
import math
import pathlib

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# ── House style ──────────────────────────────────────────────────────────────
# Three font sizes mapped to role: title/axis-label, legend/annotation, ticks.
BASE, MID, SMALL = 9, 8, 7

# One meaning per colour, held across all four figures.
C_EST = "#1b3a6b"   # this model / primary data series
C_REF = "#b5651d"   # the reference model (Fig. 1 only)
C_API = "#7a8794"   # context: the API trajectory, annotation leaders, baselines
C_RTX = "#6c9bc6"   # RTX 5090, a lighter sample of the primary family
TAN = "#fbf3e6"     # the empty engineering-budget interval
WASH = "#f1eee9"    # the negative-budget region
META_GREY = "#7a8794"
TIER_ORDER = ["Claude-4 Opus", "Claude-4 Sonnet", "Gemini 2.5 Pro", "GPT-5"]
TIER_COL = {"Claude-4 Opus": "#10243f", "Claude-4 Sonnet": "#2d5f9a",
            "Gemini 2.5 Pro": C_RTX, "GPT-5": "#a9c6de"}


def apply_style() -> None:
    mpl.rcParams.update({
        "font.family": "sans-serif",
        "axes.spines.top": False, "axes.spines.right": False, "axes.grid": False,
        "axes.titlesize": BASE, "axes.labelsize": BASE, "legend.fontsize": MID,
        "xtick.labelsize": SMALL, "ytick.labelsize": SMALL,
        "axes.titlelocation": "left", "axes.titlepad": 6.0, "axes.linewidth": 0.6,
        "xtick.direction": "out", "ytick.direction": "out",
        "xtick.major.size": 3.0, "ytick.major.size": 3.0,
        "figure.dpi": 200, "savefig.bbox": "tight",
    })


# ── Inputs ───────────────────────────────────────────────────────────────────
def locate() -> tuple[pathlib.Path, pathlib.Path]:
    """Find the input and output directories relative to this file, not the cwd."""
    here = pathlib.Path(__file__).resolve().parent
    for cand in (here, here.parent, here.parent.parent):
        for data in (cand / "data", cand):
            if (data / "case_parameters.csv").is_file():
                repo = data.parent if data.name == "data" else data
                return data, repo / "out"
    raise SystemExit("case_parameters.csv not found next to the scripts or in ./data")


def load(data: pathlib.Path, out: pathlib.Path) -> dict[str, pd.DataFrame]:
    d = {
        "cases": pd.read_csv(data / "case_parameters.csv"),
        "ref": pd.read_csv(data / "reference_series_long.csv"),
        "est": pd.read_csv(out / "estimator_outputs.csv"),
        "err": pd.read_csv(out / "crossvalidation_errors.csv"),
        "ver": pd.read_csv(out / "crossvalidation_verified.csv"),
        "bud": pd.read_csv(out / "engineering_budget_table.csv"),
        "inv": pd.read_csv(out / "inverted_reference.csv"),
        "grid": pd.read_csv(out / "scenario_grid_results.csv"),
    }
    for k, v in d.items():
        if v.empty:
            raise SystemExit(f"{k} is empty -- run run_all.py first")
    return d


def empty_interval(budgets: pd.Series) -> tuple[float, float]:
    """The widest multiplicative gap between consecutive positive budgets."""
    v = np.sort(budgets[budgets > 0].to_numpy())
    i = int(np.argmax(v[1:] / v[:-1]))
    return float(v[i]), float(v[i + 1])


# ── Figure 1: two trajectories for one case ──────────────────────────────────
def fig1(D, outdir, case=None):
    """Cumulative cost for the case whose break-even the two models disagree on."""
    ver = D["ver"]
    both = ver.be_pan.notna() & ver.be_orig.notna()
    disagree = ver[both & (ver.be_pan != ver.be_orig)]
    if case is None and disagree.empty:
        raise SystemExit("no case where the two models' break-even months differ")
    case = int(case or disagree.case.iloc[0])

    c = D["cases"].set_index("case").loc[case]
    inv = D["inv"].set_index("case").loc[case]
    H = int(c.horizon_months)
    setup = float(c.acquisition_usd)
    r_est = float(c.self_recurring_usd_per_month)
    r_ref = float(inv.reference_rate_usd_per_gpu_month) * int(c.n_gpu)
    api_m = float(c.api_usd_per_month)
    be_est = int(ver.set_index("case").loc[case, "be_orig"])
    be_ref = int(ver.set_index("case").loc[case, "be_pan"])
    gap = r_ref - r_est

    m = np.arange(0, H + 1)
    est, ref, api = (setup + r_est * m) / 1e3, (setup + r_ref * m) / 1e3, api_m * m / 1e3

    fig, ax = plt.subplots(figsize=(4.4, 3.3))
    ax.plot(m, api, color=C_API, lw=1.8)
    ax.plot(m, est, color=C_EST, lw=1.8)
    ax.plot(m, ref, color=C_REF, lw=1.8, ls=(0, (5, 2)))
    for mm, rate, col in [(be_est, r_est, C_EST), (be_ref, r_ref, C_REF)]:
        ax.plot(mm, (setup + rate * mm) / 1e3, "o", ms=5.5, color=col,
                mec="white", mew=0.9, zorder=5)

    top = max(api.max(), ref.max()) * 1.09
    ax.annotate(f"break-even\nmonth {be_est} vs {be_ref}",
                xy=(be_est + 0.5, (setup + r_ref * be_ref) / 1e3 + 0.4),
                xytext=(H * 0.39, top * 0.86), fontsize=SMALL, color="#333", ha="center",
                arrowprops=dict(arrowstyle="-", color=META_GREY, lw=0.7))
    xr = H + 0.4
    ax.text(xr, api[-1], "API", color=C_API, fontsize=MID, va="center")
    ax.text(xr, est[-1] + 0.9, "self-hosted\n(this model)", color=C_EST, fontsize=MID, va="bottom")
    ax.text(xr, ref[-1] - 0.9, "self-hosted\n(reference)", color=C_REF, fontsize=MID, va="top")

    ax.set_xlabel("Month")
    ax.set_ylabel("Cumulative cost (thousand USD)")
    ax.set_title(f"A \\${gap:,.0f}/month gap moves break-even by "
                 f"{'a month' if abs(be_ref - be_est) == 1 else f'{abs(be_ref - be_est)} months'}")
    ax.set_xlim(-0.6, H * 1.48)
    ax.set_ylim(-top * 0.072, top)
    ax.set_xticks([t for t in (0, 5, 10, 15, 20, 25) if t <= H])
    fig.savefig(outdir / "fig1_trajectories.png", dpi=300)
    return fig, dict(case=case, gap=gap, be_est=be_est, be_ref=be_ref)


# ── Figure 2: monthly divergence, de-duplicated cases ────────────────────────
def fig2(D, outdir):
    """Monthly relative error on the self-deployed side, before substitution."""
    err = D["err"].set_index("case")
    dedup = err.index[err.dedup].tolist()
    ref = D["ref"].query("deployment_mode == 'self_hosted'").set_index(["case", "month"]).cumulative_usd
    est = D["est"].query("deployment_mode == 'self_hosted'").set_index(["case", "month"]).cumulative_usd
    re_pct = ((est - ref).abs() / ref * 100).rename("re")

    subst = float(D["ver"].query("dedup").self_mape_subst.mean())
    fig, ax = plt.subplots(figsize=(4.6, 3.3))
    for case in dedup:
        s = re_pct.loc[case]
        ax.plot(s.index, s.to_numpy(), "-o", ms=2.6, lw=1.0, alpha=0.75, zorder=2,
                color=C_EST if err.loc[case, "gpu"] == "A100" else C_RTX)
    ax.axhline(subst, color=META_GREY, lw=1.4, ls=(0, (4, 2)), zorder=3)

    grp = err.loc[dedup].groupby("gpu")
    hi = max(dedup, key=lambda c: re_pct.loc[c].max())
    ymax = re_pct.loc[hi].max()
    xmax = int(max(re_pct.loc[c].index.max() for c in dedup))
    n_a100 = int(grp.size().get("A100", 0)); n_rtx = int(grp.size().get("RTX 5090", 0))
    lo, up = grp.N.min().get("A100"), grp.N.max().get("A100")
    ax.text(xmax + 0.4, ymax, f"A100\n{n_a100} cases, {lo:.0f}\u2013{up:.0f} GPUs",
            color=C_EST, fontsize=MID, va="center")
    rtx_last = max((c for c in dedup if err.loc[c, "gpu"] == "RTX 5090"),
                   key=lambda c: re_pct.loc[c].max())
    ax.text(re_pct.loc[rtx_last].index.max() + 0.6, re_pct.loc[rtx_last].max() + 0.08,
            f"RTX 5090\n{n_rtx} cases", color=C_RTX, fontsize=MID, va="bottom")
    ax.text(xmax * 0.70, subst + 0.09,
            f"{subst:.3f}% after supplying the reference\nmodel's recurring cost",
            color="#555", fontsize=SMALL, ha="center", va="bottom")

    ax.set_xlabel("Month")
    ax.set_ylabel("Relative error vs reference model (%)")
    ax.set_title(f"{_word(len(dedup)).capitalize()} cases collapse onto two curves")
    ax.set_xlim(0, xmax * 1.46)
    ax.set_ylim(-ymax * 0.086, ymax * 1.17)
    ax.set_xticks([t for t in (0, 5, 10, 15, 20, 25) if t <= xmax])
    fig.savefig(outdir / "fig2_divergence.png", dpi=300)
    return fig, dict(n=len(dedup), ymax=ymax, subst=subst)


# ── Figure 3: the engineering budget per case ────────────────────────────────
def fig3(D, outdir):
    """B per case, ordered, coloured by API tier, with the empty interval shaded."""
    bt = D["bud"]
    gap_lo, gap_hi = empty_interval(bt.B)
    upper = bt[bt.B >= gap_hi]
    tier = upper.api.unique()
    if len(tier) != 1:
        raise SystemExit(f"upper group spans {len(tier)} tiers; retitle Fig. 3 by hand")
    tier = tier[0]
    lo_k = math.floor(gap_hi / 1e3)
    hi_k = math.ceil(gap_lo / 1e3)
    assert (bt.loc[bt.api == tier, "B"] >= lo_k * 1e3).all(), "title overstates the tier floor"
    assert (bt.loc[bt.api != tier, "B"] < hi_k * 1e3).all(), "title overstates the other ceiling"

    d = bt.sort_values("B").reset_index(drop=True)
    xmax = d.B.max() / 1e3 * 1.09
    xmin = -abs(d.B.min()) / 1e3 * 2.3

    fig, ax = plt.subplots(figsize=(3.4, 3.7))
    ax.axvspan(xmin, 0, color=WASH, zorder=0)
    ax.axvspan(gap_lo / 1e3, gap_hi / 1e3, color=TAN, zorder=0)
    ax.axvline(0, color="#9a9a9a", lw=0.7, zorder=1)
    for i, row in d.iterrows():
        ax.plot([0, row.B / 1e3], [i, i], color="#c9ccd1", lw=0.8, zorder=2)
        ax.plot(row.B / 1e3, i, "o", ms=4.2, color=TIER_COL[row.api],
                mec="white", mew=0.6, zorder=3)

    n_neg = int((d.B < 0).sum())
    ax.set_yticks(range(len(d)))
    ax.set_yticklabels([int(c) for c in d.case])
    ax.set_ylim(-1.2, len(d) + 1.8)
    ax.set_xlim(xmin, xmax)
    ax.set_xlabel("Engineering budget $B$ over 24 months (thousand USD)")
    ax.set_ylabel("Case")
    ax.set_title(f"Every {tier} case clears \\${lo_k}k;\nno other case clears \\${hi_k}k", loc="left")
    ax.text((gap_lo + gap_hi) / 2e3, len(d) + 0.1,
            f"empty, {gap_hi / gap_lo:.1f}$\\times$", fontsize=6, color="#9a7b43", ha="center")
    ax.annotate(f"{_word(n_neg)} never repay", xy=(xmin * 0.26, n_neg / 2),
                xytext=(xmax * 0.27, n_neg / 2 + 0.4), fontsize=6, color="#3c4a57",
                va="center", arrowprops=dict(arrowstyle="-", color=META_GREY, lw=0.6))
    handles = [mpl.lines.Line2D([], [], marker="o", ls="", ms=4.2, mec="white", mew=0.6,
                                color=TIER_COL[t], label=t)
               for t in TIER_ORDER if t in set(d.api)]
    ax.legend(handles=handles, loc="upper right", bbox_to_anchor=(1.0, 0.60), frameon=False,
              fontsize=6, handletextpad=0.3, borderpad=0.2, labelspacing=0.3)
    fig.savefig(outdir / "fig3_budget_distribution.png", dpi=300)
    return fig, dict(gap_lo=gap_lo, gap_hi=gap_hi, tier=tier, n_neg=n_neg)


# ── Figure 4: what a scenario grid conceals ──────────────────────────────────
def fig4(D, outdir):
    """Cases still repaying against incremental spend, with the tested levels marked."""
    bt = D["bud"]
    gap_lo, gap_hi = empty_interval(bt.B)
    levels = [(r.scenario, r.incremental_usd / 1e3, int(r.n_break_even))
              for _, r in D["grid"].iterrows() if r.incremental_usd > 0]
    names = {"B": "low", "C": "moderate", "D": "high"}
    survivors = {n for _, _, n in levels}
    if len(survivors) != 1:
        raise SystemExit(f"levels return {sorted(survivors)} cases; retitle Fig. 4 by hand")
    n_same = survivors.pop()

    xtop = max(l for _, l, _ in levels) * 1.52
    xs = np.linspace(0, xtop, 4001)
    ys = np.array([(bt.B >= max(x * 1e3, 1e-9)).sum() for x in xs])
    n0 = int((bt.B > 0).sum())

    fig, ax = plt.subplots(figsize=(3.4, 2.5))
    ax.axvspan(gap_lo / 1e3, gap_hi / 1e3, color=TAN, zorder=0)
    ax.step(xs, ys, where="post", color=C_EST, lw=1.6, zorder=3)
    for sc, lv, _ in levels:
        ax.axvline(lv, color="#9a9a9a", lw=0.7, ls=(0, (2, 2)), zorder=2)
        ax.text(lv, n0 * 1.11, names.get(sc, sc), fontsize=6, color="#6b6b6b", ha="center")
    ax.annotate("transition occurs here,\nbelow the lowest level tested",
                xy=(gap_lo / 1e3 * 0.72, n_same + 4), xytext=(xtop * 0.26, n0 * 0.84),
                fontsize=6, color="#3c4a57",
                arrowprops=dict(arrowstyle="-", color=META_GREY, lw=0.6))
    ax.text((gap_lo + gap_hi) / 2e3, n_same * 0.74,
            f"no case changes verdict\nacross a {gap_hi / gap_lo:.1f}$\\times$ range",
            fontsize=6, color="#9a7b43", ha="center")
    ax.set_xlim(-xtop * 0.03, xtop * 1.01)
    ax.set_ylim(0, n0 * 1.21)
    ax.set_yticks(sorted({0, n_same, n0}))
    ax.set_xlabel("Incremental engineering spend over 24 months (thousand USD)")
    ax.set_ylabel("Cases that still repay")
    ax.set_title(f"All {_word(len(levels))} tested effort levels\n"
                 f"return the same {_word(n_same)} cases", loc="left")
    fig.savefig(outdir / "fig4_scenario_grid.png", dpi=300)
    return fig, dict(n_same=n_same, n0=n0, levels=levels)


_WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
          8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen",
          14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen",
          19: "nineteen", 20: "twenty"}


def _word(n: int) -> str:
    return _WORDS.get(n, str(n))


def main() -> None:
    ap = argparse.ArgumentParser()
    data_dir, out_dir = locate()
    ap.add_argument("--outdir", default=str(out_dir.parent / "figures"))
    a = ap.parse_args()
    outdir = pathlib.Path(a.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    apply_style()
    D = load(data_dir, out_dir)
    for fn in (fig1, fig2, fig3, fig4):
        _, info = fn(D, outdir)
        print(f"{fn.__name__}: {info}")
    print(f"wrote 4 figures to {outdir}/")


if __name__ == "__main__":
    main()
