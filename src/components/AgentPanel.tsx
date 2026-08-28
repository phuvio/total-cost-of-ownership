import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AgentGenerationRequest,
  AgentQuestionDefinition,
  AgentSuggestion,
  AgentTargetSlot,
  AgentWorkflowMode,
} from "@/lib/agentTypes";
import { generateAgentSuggestion } from "@/lib/agentService";

interface AgentPanelProps {
  model1Name: string;
  model2Name: string;
  onApplySuggestion: (suggestion: AgentSuggestion, targetSlot: AgentTargetSlot) => void;
}

const compareQuestions: AgentQuestionDefinition[] = [
  {
    key: "models",
    label: "Which models are you comparing?",
    prompt: "Tell me the two deployment strategies or model families you want to compare.",
    kind: "text",
    placeholder: "e.g. GPT-4.1 API vs self-hosted Llama 3.1 70B",
  },
  {
    key: "requestsPerDay",
    label: "What is your expected daily request volume?",
    prompt: "Enter your best estimate for requests per day.",
    kind: "number",
    placeholder: "10000",
  },
  {
    key: "useCase",
    label: "What is the use case?",
    prompt: "Select the closest workload shape.",
    kind: "select",
    options: [
      { label: "Chatbot", value: "chatbot" },
      { label: "RAG", value: "rag" },
      { label: "Batch processing", value: "batch" },
      { label: "Agent", value: "agent" },
    ],
  },
  {
    key: "latencyCritical",
    label: "Is latency critical?",
    prompt: "Choose whether the system needs interactive low-latency responses.",
    kind: "select",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Async is acceptable", value: "async" },
    ],
  },
  {
    key: "existingGpuInfra",
    label: "Do you already have GPU infrastructure?",
    prompt: "This helps separate cloud-hosted and self-hosted suggestions.",
    kind: "select",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
];

const configureQuestions: AgentQuestionDefinition[] = [
  {
    key: "application",
    label: "Describe your application in one sentence.",
    prompt: "Give a short description of what the app does.",
    kind: "text",
    placeholder: "e.g. customer support assistant for insurance documents",
  },
  {
    key: "users",
    label: "How many users do you expect?",
    prompt: "Enter the approximate number of users or seats.",
    kind: "number",
    placeholder: "500",
  },
  {
    key: "inputLength",
    label: "What is the typical length of user inputs?",
    prompt: "Estimate the average input length in tokens.",
    kind: "number",
    placeholder: "700",
  },
  {
    key: "retrieval",
    label: "Do you need retrieval (RAG) or tool use?",
    prompt: "Select the closest answer.",
    kind: "select",
    options: [
      { label: "Retrieval / RAG", value: "yes" },
      { label: "Tool use", value: "toolUse" },
      { label: "No", value: "no" },
    ],
  },
  {
    key: "latencyCritical",
    label: "Is latency critical?",
    prompt: "Choose whether responses must be interactive.",
    kind: "select",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Async is acceptable", value: "async" },
    ],
  },
];

function trimDisplay(value: string, max = 120) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function AgentPanel({ model1Name, model2Name, onApplySuggestion }: AgentPanelProps) {
  const [mode, setMode] = useState<AgentWorkflowMode | null>(null);
  const [targetSlot, setTargetSlot] = useState<AgentTargetSlot>("both");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentValue, setCurrentValue] = useState("");
  const [suggestion, setSuggestion] = useState<AgentSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = useMemo(() => {
    if (!mode) return [];
    return mode === "compare" ? compareQuestions : configureQuestions;
  }, [mode]);

  const currentQuestion = questions[stepIndex] ?? null;
  const isFirstStep = stepIndex === 0;
  const isLastStep = currentQuestion ? stepIndex === questions.length - 1 : false;

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    setCurrentValue(answers[currentQuestion.key] ?? "");
  }, [answers, currentQuestion, stepIndex]);

  const resetFlow = () => {
    setStepIndex(0);
    setAnswers({});
    setCurrentValue("");
    setSuggestion(null);
    setError(null);
    setIsGenerating(false);
  };

  const selectMode = (nextMode: AgentWorkflowMode) => {
    setMode(nextMode);
    setTargetSlot(nextMode === "compare" ? "both" : "model1");
    resetFlow();
  };

  const handleGenerate = async (nextAnswers: Record<string, string>) => {
    if (!mode) return;

    setIsGenerating(true);
    setError(null);
    setSuggestion(null);

    const request: AgentGenerationRequest = {
      mode,
      targetSlot,
      currentModel1Name: model1Name,
      currentModel2Name: model2Name,
      answers: Object.entries(nextAnswers).map(([key, value]) => ({ key, value, label: key })),
    };

    try {
      const result = await generateAgentSuggestion(request);
      setSuggestion(result);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Agent generation failed.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    const nextValue = currentQuestion.kind === "select" ? currentValue : currentValue.trim();
    if (!nextValue) {
      setError("Please answer the current question before continuing.");
      return;
    }

    const nextAnswers = {
      ...answers,
      [currentQuestion.key]: nextValue,
    };

    setError(null);
    setAnswers(nextAnswers);
    setCurrentValue("");

    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    void handleGenerate(nextAnswers);
  };

  const handleBack = () => {
    if (!currentQuestion) return;
    if (isFirstStep) {
      setMode(null);
      resetFlow();
      return;
    }

    setError(null);
    setStepIndex((current) => current - 1);
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.kind === "select") {
      return (
        <Select value={currentValue} onValueChange={setCurrentValue}>
          <SelectTrigger className="param-input">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {currentQuestion.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (currentQuestion.kind === "number") {
      return (
        <Input
          type="number"
          className="param-input"
          value={currentValue}
          placeholder={currentQuestion.placeholder}
          onChange={(event) => setCurrentValue(event.target.value)}
        />
      );
    }

    return (
      <Textarea
        className="min-h-24 param-input"
        value={currentValue}
        placeholder={currentQuestion.placeholder}
        onChange={(event) => setCurrentValue(event.target.value)}
      />
    );
  };

  const applySuggestion = (slot: AgentTargetSlot) => {
    if (!suggestion) return;
    onApplySuggestion(suggestion, slot);
  };

  return (
    <Card className="m-4 p-4 space-y-4 border-dashed bg-card/80 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary" style={{ fontFamily: "var(--font-display)" }}>
            AI Setup Agent
          </h2>
          <p className="text-xs text-muted-foreground">
            Answer a few questions and the agent will suggest TCO parameters, then return a JSON preset you can apply.
          </p>
        </div>
      </div>

      {!mode && (
        <div className="space-y-3">
          <Label className="param-label">What do you want to do?</Label>
          <div className="grid grid-cols-1 gap-2">
            <Button type="button" variant="secondary" onClick={() => selectMode("compare")}>
              Compare two deployment strategies
            </Button>
            <Button type="button" variant="secondary" onClick={() => selectMode("configure")}>
              Configure one application use case
            </Button>
          </div>
        </div>
      )}

      {mode && !suggestion && currentQuestion && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{mode === "compare" ? "Comparison flow" : "Configuration flow"}</span>
              <button type="button" className="underline underline-offset-4" onClick={() => selectMode(mode)}>
                Restart
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{currentQuestion.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currentQuestion.prompt}</p>
          </div>

          {mode === "configure" && (
            <div className="space-y-2">
              <Label className="param-label">Apply result to</Label>
              <Select value={targetSlot} onValueChange={(value) => setTargetSlot(value as AgentTargetSlot)}>
                <SelectTrigger className="param-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="model1">Model 1</SelectItem>
                  <SelectItem value="model2">Model 2</SelectItem>
                  <SelectItem value="both">Both models</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="param-label">Answer</Label>
            {renderQuestionInput()}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleBack} disabled={isGenerating}>
              Back
            </Button>
            <Button type="button" onClick={handleNext} disabled={isGenerating} className="gap-2">
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLastStep ? "Generate suggestion" : "Next"}
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Step {stepIndex + 1} of {questions.length}
          </div>
        </div>
      )}

      {mode && suggestion && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">Suggested parameters</p>
            <p className="text-xs text-muted-foreground">
              {suggestion.fallbackUsed
                ? "Generated with local fallback values while waiting for a backend proxy."
                : "Generated from the agent response."}
            </p>
          </div>

          <div className="grid gap-2 text-xs">
            <div className="rounded-md border p-3">
              <div className="font-semibold text-foreground">{suggestion.model1Name}</div>
              <div className="mt-1 text-muted-foreground">{trimDisplay(suggestion.reasoning.model1, 180)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-semibold text-foreground">{suggestion.model2Name}</div>
              <div className="mt-1 text-muted-foreground">{trimDisplay(suggestion.reasoning.model2, 180)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="param-label">JSON preview</Label>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-[11px] leading-5 text-foreground">
{JSON.stringify(suggestion, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button type="button" onClick={() => applySuggestion(targetSlot)}>
              Apply suggested setup
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => applySuggestion("model1")}>
                Apply to Model 1
              </Button>
              <Button type="button" variant="outline" onClick={() => applySuggestion("model2")}>
                Apply to Model 2
              </Button>
            </div>
            <Button type="button" variant="secondary" onClick={() => applySuggestion("both")}>
              Apply to both models
            </Button>
          </div>

          {suggestion.sources && suggestion.sources.length > 0 && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Sources</p>
              <ul className="space-y-1">
                {suggestion.sources.map((source) => (
                  <li key={`${source.title}-${source.source}`}>
                    <span className="font-medium text-foreground">{source.source}</span>: {source.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button type="button" variant="ghost" className="w-full" onClick={resetFlow}>
            Start over
          </Button>
        </div>
      )}

      {mode && isGenerating && !suggestion && (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching pricing and benchmark data...
        </div>
      )}
    </Card>
  );
}
