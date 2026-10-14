"""Cost model for the self-hosting / API comparison.

Ported from the Total Cost of Ownership estimator (src/lib/tco-calculations.ts). The 
port  is restricted to the parameter regime those scripts use: gpuPrice = 0, hardware 
capitalised at acquisition, electricity on the self-hosted side only, token prices 
on the API side only.

Conventions taken from the TypeScript, not re-invented here:
  * a month is DAYS_PER_MONTH = 30.44 days, and month m is evaluated at m * 30.44 days,
    so every recurring term scales linearly in m;
  * the API bill splits the monthly token volume one third input, two thirds output,
    with no rounding of the per-request figures;
  * the integer break-even month is the first month in which the self-hosted cumulative
    is less than or equal to the API cumulative;
  * the continuous break-even day is linear interpolation of the cumulative difference
    between the two bracketing months.
"""
from dataclasses import dataclass, field

DAYS_PER_MONTH = 30.44
REQUESTS_PER_DAY = 6000
REQUESTS_PER_MONTH = REQUESTS_PER_DAY * DAYS_PER_MONTH   # 182,640
MONTHS = 24
INPUT_SHARE, OUTPUT_SHARE = 1 / 3, 2 / 3


@dataclass(frozen=True)
class Effort:
    """Engineering hours by deployment mode. Scenario A is all zeros."""
    self_setup_h: float = 0.0
    self_ops_h: float = 0.0
    api_setup_h: float = 0.0
    api_ops_h: float = 0.0
    cost_per_hour: float = 0.0

    @property
    def incremental_usd(self) -> float:
        """Incremental cost of self-hosting over the API at MONTHS, in currency."""
        return self.cost_per_hour * (
            (self.self_setup_h - self.api_setup_h)
            + MONTHS * (self.self_ops_h - self.api_ops_h)
        )


SCENARIOS = {
    "A": Effort(0, 0, 0, 0, 100.0),
    "B": Effort(80, 15, 20, 5, 100.0),
    "C": Effort(200, 40, 40, 10, 100.0),
    "D": Effort(300, 60, 60, 15, 100.0),
}


@dataclass(frozen=True)
class Case:
    case: int
    self_hosted_model: str
    gpu: str
    n_gpu: int
    gpu_unit_price_usd: float
    gpu_power_w: float
    operating_hours_per_month: float
    electricity_usd_per_kwh: float
    api_model: str
    api_price_in_usd_per_mtok: float
    api_price_out_usd_per_mtok: float
    tokens_m_per_month: float
    horizon_months: int = MONTHS

    # ---- component costs -------------------------------------------------
    @property
    def acquisition_usd(self) -> float:
        return self.n_gpu * self.gpu_unit_price_usd

    @property
    def energy_usd_per_month(self) -> float:
        return (self.n_gpu * self.gpu_power_w / 1000.0
                * self.operating_hours_per_month * self.electricity_usd_per_kwh)

    @property
    def api_usd_per_month(self) -> float:
        tok = self.tokens_m_per_month * 1e6
        return (tok * INPUT_SHARE * self.api_price_in_usd_per_mtok
                + tok * OUTPUT_SHARE * self.api_price_out_usd_per_mtok) / 1e6

    @property
    def implied_tokens_per_request(self) -> float:
        return self.tokens_m_per_month * 1e6 / REQUESTS_PER_MONTH

    # ---- cumulative trajectories ----------------------------------------
    def self_cumulative(self, month: int, effort: Effort = SCENARIOS["A"],
                        energy_usd_per_month: float | None = None) -> float:
        rate = self.energy_usd_per_month if energy_usd_per_month is None else energy_usd_per_month
        return (self.acquisition_usd + rate * month
                + effort.cost_per_hour * (effort.self_setup_h + effort.self_ops_h * month))

    def api_cumulative(self, month: int, effort: Effort = SCENARIOS["A"]) -> float:
        return (self.api_usd_per_month * month
                + effort.cost_per_hour * (effort.api_setup_h + effort.api_ops_h * month))


def break_even(case: Case, effort: Effort = SCENARIOS["A"], months: int = MONTHS,
               energy_usd_per_month: float | None = None):
    """Return (first_month, continuous_month) using the TypeScript conventions.

    first_month is the first integer month with self <= api, or None inside `months`.
    continuous_month interpolates the crossing linearly and may exceed `months`.
    """
    diff = [case.self_cumulative(m, effort, energy_usd_per_month) - case.api_cumulative(m, effort)
            for m in range(1, months + 1)]
    first = next((m for m, d in zip(range(1, months + 1), diff) if d <= 0), None)

    cont = None
    for i in range(len(diff)):
        if diff[i] == 0:
            cont = float(i + 1)
            break
        if i == 0 or diff[i - 1] * diff[i] > 0:
            continue
        cont = (i) + (-diff[i - 1]) / (diff[i] - diff[i - 1])   # months, 1-based
        break
    if cont is None:   # closed form: the curves are affine, so solve directly
        dc = (case.api_usd_per_month + effort.cost_per_hour * effort.api_ops_h) - (
            (case.energy_usd_per_month if energy_usd_per_month is None else energy_usd_per_month)
            + effort.cost_per_hour * effort.self_ops_h)
        ds = case.acquisition_usd + effort.cost_per_hour * (effort.self_setup_h - effort.api_setup_h)
        cont = ds / dc if dc > 0 else None
    return first, cont


def load_cases(path: str = "data/case_parameters.csv") -> list[Case]:
    import csv
    out = []
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            out.append(Case(
                case=int(r["case"]),
                self_hosted_model=r["self_hosted_model"],
                gpu=r["gpu"], n_gpu=int(r["n_gpu"]),
                gpu_unit_price_usd=float(r["gpu_unit_price_usd"]),
                gpu_power_w=float(r["gpu_power_w_nameplate"]),
                operating_hours_per_month=float(r["operating_hours_per_month"]),
                electricity_usd_per_kwh=float(r["electricity_usd_per_kwh"]),
                api_model=r["api_model"],
                api_price_in_usd_per_mtok=float(r["api_price_in_usd_per_mtok"]),
                api_price_out_usd_per_mtok=float(r["api_price_out_usd_per_mtok"]),
                tokens_m_per_month=float(r["tokens_m_per_month_used"]),
                horizon_months=int(r["horizon_months"]),
            ))
    return out
