import type { TCOParams } from "./tco-calculations";

export function formatAgentModelName(baseName: string, _modelType: TCOParams["modelType"]) {
  return baseName.trim();
}

export function resolveAgentModelNames(
  baseModel1Name: string,
  baseModel2Name: string,
  model1Type: TCOParams["modelType"],
  model2Type: TCOParams["modelType"],
) {
  return {
    model1Name: formatAgentModelName(baseModel1Name, model1Type),
    model2Name: formatAgentModelName(baseModel2Name, model2Type),
  };
}