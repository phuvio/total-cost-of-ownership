import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TCOParams, defaultParams } from "@/lib/tco-calculations";
import { CalculatorPage } from "./Calculator";
import { SensitivityPage } from "./Sensitivity";
import { ScenariosPage } from "./Scenarios";

const Index = () => {
  const [days, setDays] = useState(defaultParams.days);
  const [params1, setParams1] = useState<TCOParams>(defaultParams);
  const [params2, setParams2] = useState<TCOParams>(defaultParams);
  const [activeModel, setActiveModel] = useState<1 | 2>(1);
  const [model2Ever, setModel2Ever] = useState(true);
  const [model1Name, setModel1Name] = useState("Model 1");
  const [model2Name, setModel2Name] = useState("Model 2");
  const [activeTab, setActiveTab] = useState<"calculator" | "sensitivity" | "scenarios">("calculator");

  const handleModelChange = (m: 1 | 2) => {
    if (m === 2) setModel2Ever(true);
    setActiveModel(m);
  };

  const handleReset = () => {
    setParams1({ ...defaultParams });
    setParams2({ ...defaultParams });
    setDays(defaultParams.days);
    setActiveModel(1);
    setModel2Ever(true);
    setModel1Name("Model 1");
    setModel2Name("Model 2");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <h1 className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          LLM Total Cost of Ownership Estimator
        </h1>
      </header>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "calculator" | "sensitivity" | "scenarios") }>
        <div className="border-b bg-card px-6 py-4">
          <TabsList className="gap-2">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>
        </div>

        <div className="h-[calc(100vh-7.5rem)]">
          <TabsContent value="calculator">
            <CalculatorPage
              params1={params1}
              params2={params2}
              activeModel={activeModel}
              model2Ever={model2Ever}
              model1Name={model1Name}
              model2Name={model2Name}
              days={days}
              onDaysChange={setDays}
              onModelChange={handleModelChange}
              onModel1NameChange={setModel1Name}
              onModel2NameChange={setModel2Name}
              onReset={handleReset}
              setParams1={setParams1}
              setParams2={setParams2}
            />
          </TabsContent>

          <TabsContent value="sensitivity">
            <SensitivityPage
              params1={{ ...params1, days }}
              params2={{ ...params2, days }}
              model1Name={model1Name}
              model2Name={model2Name}
              model2Ever={model2Ever}
            />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenariosPage />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Index;
