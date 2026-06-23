import { TCOParams } from "@/lib/tco-calculations";
import { InputPanel } from "@/components/InputPanel";
import { CostPanel } from "@/components/CostPanel";
import { CrossoverChart } from "@/components/CrossoverChart";

interface CalculatorProps {
  params1: TCOParams;
  params2: TCOParams;
  activeModel: 1 | 2;
  model2Ever: boolean;
  model1Name: string;
  model2Name: string;
  days: number;
  onDaysChange: (days: number) => void;
  onModelChange: (model: 1 | 2) => void;
  onModel1NameChange: (name: string) => void;
  onModel2NameChange: (name: string) => void;
  onReset: () => void;
  setParams1: (params: TCOParams) => void;
  setParams2: (params: TCOParams) => void;
}

export function CalculatorPage({
  params1,
  params2,
  activeModel,
  model2Ever,
  model1Name,
  model2Name,
  days,
  onDaysChange,
  onModelChange,
  onModel1NameChange,
  onModel2NameChange,
  onReset,
  setParams1,
  setParams2,
}: CalculatorProps) {
  const p1 = { ...params1, days };
  const p2 = { ...params2, days };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_2fr_3fr] h-[calc(100vh-7.5rem)]">
      <div className="border-r bg-card overflow-y-auto">
        <InputPanel
          params1={params1}
          params2={params2}
          onParams1Change={setParams1}
          onParams2Change={setParams2}
          activeModel={activeModel}
          onModelChange={onModelChange}
          days={days}
          onDaysChange={onDaysChange}
          model1Name={model1Name}
          model2Name={model2Name}
          onModel1NameChange={onModel1NameChange}
          onModel2NameChange={onModel2NameChange}
          onReset={onReset}
        />
      </div>
      <div className="border-r overflow-auto">
        <CostPanel
          params1={p1}
          params2={p2}
          activeModel={activeModel}
          model2Ever={model2Ever}
          model1Name={model1Name}
          model2Name={model2Name}
        />
      </div>
      <div className="overflow-hidden">
        <CrossoverChart
          params1={p1}
          params2={p2}
          activeModel={activeModel}
          model2Ever={model2Ever}
          model1Name={model1Name}
          model2Name={model2Name}
        />
      </div>
    </div>
  );
}
