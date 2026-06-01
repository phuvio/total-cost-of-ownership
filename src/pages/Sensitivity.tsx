import { SensitivityPanel } from "@/components/SensitivityPanel";
import type { TCOParams } from "@/lib/tco-calculations";

interface SensitivityPageProps {
  params1: TCOParams;
  params2: TCOParams;
  model1Name: string;
  model2Name: string;
  model2Ever: boolean;
}

export function SensitivityPage({
  params1,
  params2,
  model1Name,
  model2Name,
  model2Ever,
}: SensitivityPageProps) {
  return (
    <div className="p-6 overflow-y-auto h-[calc(100vh-7.5rem)]">
      <div className="rounded-2xl border bg-card p-6">
        <SensitivityPanel
          params1={params1}
          params2={params2}
          model1Name={model1Name}
          model2Name={model2Name}
          model2Ever={model2Ever}
        />
      </div>
    </div>
  );
}
