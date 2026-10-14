"""Regenerate every table in the paper from data/case_parameters.csv in one pass."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import run_cases, crossvalidate, invert_reference, substitute, budget, scenario_grid, electricity_grid

pathlib.Path("out").mkdir(exist_ok=True)
for step in (run_cases, crossvalidate, invert_reference, substitute, budget,
             scenario_grid, electricity_grid):
    step.main()
