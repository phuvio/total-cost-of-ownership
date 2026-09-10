import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TCOParams, defaultParams } from "@/lib/tco-calculations";
import { CalculatorPage } from "./Calculator";
import { ScenariosPage } from "./Scenarios";
import { AgentPage } from "./Agent";
import { AgentSuggestion, AgentTargetSlot } from "@/lib/agentTypes";
import { Currency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const [days, setDays] = useState(defaultParams.days);
  const [params1, setParams1] = useState<TCOParams>(defaultParams);
  const [params2, setParams2] = useState<TCOParams>(defaultParams);
  const [activeModel, setActiveModel] = useState<1 | 2>(1);
  const [model2Ever, setModel2Ever] = useState(true);
  const [model1Name, setModel1Name] = useState("Model 1");
  const [model2Name, setModel2Name] = useState("Model 2");
  const [largeFont, setLargeFont] = useState(false);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [activeTab, setActiveTab] = useState<"calculator" | "scenarios" | "agent">("calculator");

  useEffect(() => {
    document.documentElement.classList.toggle("large-font", largeFont);
  }, [largeFont]);

  const handleModelChange = (m: 1 | 2) => {
    if (m === 2) setModel2Ever(true);
    setActiveModel(m);
  };

  const handleLoadScenario = (
    model1Name: string,
    model1Params: TCOParams,
    model2Name: string,
    model2Params: TCOParams
  ) => {
    setParams1({ ...defaultParams, ...model1Params });
    setParams2({ ...defaultParams, ...model2Params });
    setModel1Name(model1Name);
    setModel2Name(model2Name);
    setActiveModel(1);
    setModel2Ever(true);
    setDays(model1Params.days);
    setActiveTab("calculator");
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

  const applyAgentSuggestion = (suggestion: AgentSuggestion, targetSlot: AgentTargetSlot) => {
    const nextModel1 = { ...defaultParams, ...suggestion.model1Params };
    const nextModel2 = { ...defaultParams, ...suggestion.model2Params };

    if (targetSlot === "both") {
      setParams1(nextModel1);
      setParams2(nextModel2);
      setModel1Name(suggestion.model1Name);
      setModel2Name(suggestion.model2Name);
      setModel2Ever(true);
      setDays(nextModel1.days);
      setActiveModel(1);
      setActiveTab("calculator");
      return;
    }

    if (targetSlot === "model1") {
      setParams1(nextModel1);
      setModel1Name(suggestion.model1Name);
      setModel2Ever(true);
      setDays(nextModel1.days);
      setActiveModel(1);
      setActiveTab("calculator");
      return;
    }

    setParams2(nextModel2);
    setModel2Name(suggestion.model2Name);
    setModel2Ever(true);
    setDays(nextModel2.days);
    setActiveModel(2);
    setActiveTab("calculator");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <h1 className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          LLM Total Cost of Ownership Estimator
        </h1>
        <button
          type="button"
          onClick={() => setLargeFont((prev) => !prev)}
          className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-muted/80"
          aria-pressed={largeFont}
        >
          {largeFont ? "Large text on" : "Large text off"}
        </button>
        <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
          <SelectTrigger className="h-8 w-[116px] text-xs" aria-label="Currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">Euro (EUR)</SelectItem>
            <SelectItem value="USD">Dollar (USD)</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "calculator" | "scenarios" | "agent") }>
        <div className="border-b bg-card px-6 py-4">
          <TabsList className="gap-2">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="agent">AI Agent</TabsTrigger>
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
              currency={currency}
            />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenariosPage onLoadScenario={handleLoadScenario} />
          </TabsContent>

          <TabsContent value="agent">
            <AgentPage
              model1Name={model1Name}
              model2Name={model2Name}
              onApplySuggestion={applyAgentSuggestion}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Index;
