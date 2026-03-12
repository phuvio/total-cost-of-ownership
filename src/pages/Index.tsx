import { useState } from "react";
import { TCOParams, defaultParams } from "@/lib/tco-calculations";
import { InputPanel } from "@/components/InputPanel";
import { CostPanel } from "@/components/CostPanel";
import { CrossoverChart } from "@/components/CrossoverChart";

const Index = () => {
  const [params, setParams] = useState<TCOParams>(defaultParams);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <h1 className="text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          LLM Total Cost of Ownership
        </h1>
        <span className="text-xs text-muted-foreground ml-2">Calculator</span>
      </header>

      {/* Three panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_2fr_3fr] h-[calc(100vh-3.25rem)]">
        {/* Left: Inputs */}
        <div className="border-r bg-card overflow-hidden">
          <InputPanel params={params} onChange={setParams} />
        </div>

        {/* Center: Crossover chart */}
        <div className="border-r overflow-hidden">
          <CrossoverChart params={params} />
        </div>

        {/* Right: Cost calculations */}
        <div className="overflow-auto">
          <CostPanel params={params} />
        </div>
      </div>
    </div>
  );
};

export default Index;
