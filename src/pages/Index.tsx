import { useState } from "react";
import { TCOParams, defaultParams } from "@/lib/tco-calculations";
import { InputPanel } from "@/components/InputPanel";
import { CostPanel } from "@/components/CostPanel";
import { CrossoverChart } from "@/components/CrossoverChart";

const Index = () => {
  const [days, setDays] = useState(defaultParams.days);
  const [params1, setParams1] = useState<TCOParams>(defaultParams);
  const [params2, setParams2] = useState<TCOParams>(defaultParams);
  const [activeModel, setActiveModel] = useState<1 | 2>(1);
  const [model2Ever, setModel2Ever] = useState(false);
  const [model1Name, setModel1Name] = useState("Model 1");
  const [model2Name, setModel2Name] = useState("Model 2");

  const handleModelChange = (m: 1 | 2) => {
    if (m === 2) setModel2Ever(true);
    setActiveModel(m);
  };

  const handleReset = () => {
    setParams1({ ...defaultParams });
    setParams2({ ...defaultParams });
    setDays(defaultParams.days);
    setActiveModel(1);
    setModel2Ever(false);
    setModel1Name("Model 1");
    setModel2Name("Model 2");
  };

  // Merge shared days into params
  const p1 = { ...params1, days };
  const p2 = { ...params2, days };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <h1 className="text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          LLM Total Cost of Ownership
        </h1>
        <span className="text-xs text-muted-foreground ml-2">Calculator</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_2fr_3fr] h-[calc(100vh-3.25rem)]">
        <div className="border-r bg-card overflow-hidden">
          <InputPanel
            params={activeModel === 1 ? params1 : params2}
            onChange={activeModel === 1 ? setParams1 : setParams2}
            activeModel={activeModel}
            onModelChange={handleModelChange}
            days={days}
            onDaysChange={setDays}
            model1Name={model1Name}
            model2Name={model2Name}
            onModel1NameChange={setModel1Name}
            onModel2NameChange={setModel2Name}
            onReset={handleReset}
          />
        </div>
        <div className="border-r overflow-auto">
          <CostPanel params1={p1} params2={p2} activeModel={activeModel} model2Ever={model2Ever} model1Name={model1Name} model2Name={model2Name} />
        </div>
        <div className="overflow-hidden">
          <CrossoverChart params1={p1} params2={p2} activeModel={activeModel} model2Ever={model2Ever} model1Name={model1Name} model2Name={model2Name} />
        </div>
      </div>
    </div>
  );
};

export default Index;
