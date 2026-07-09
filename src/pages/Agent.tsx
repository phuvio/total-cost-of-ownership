import { AgentPanel } from "@/components/AgentPanel";
import { Card } from "@/components/ui/card";
import { AgentSuggestion, AgentTargetSlot } from "@/lib/agentTypes";

interface AgentPageProps {
  model1Name: string;
  model2Name: string;
  onApplySuggestion: (suggestion: AgentSuggestion, targetSlot: AgentTargetSlot) => void;
}

export function AgentPage({ model1Name, model2Name, onApplySuggestion }: AgentPageProps) {
  return (
    <div className="p-6 overflow-y-auto h-[calc(100vh-7.5rem)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">AI Setup Agent</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Use this guided assistant to compare deployment strategies or configure a single application use case.
            It asks follow-up questions, pulls in pricing and benchmark evidence, and returns a JSON preset you can
            apply directly to the calculator.
          </p>
        </div>

        <Card className="p-4 border bg-card/80">
          <p className="text-sm text-muted-foreground">
            Start by choosing whether you want to compare two strategies or configure one application. The agent
            will then suggest parameters for {model1Name} and {model2Name} or build a single-use preset for your
            current setup.
          </p>
        </Card>

        <AgentPanel
          model1Name={model1Name}
          model2Name={model2Name}
          onApplySuggestion={onApplySuggestion}
        />
      </div>
    </div>
  );
}
