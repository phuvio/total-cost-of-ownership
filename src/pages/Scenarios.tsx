import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { scenarios } from "@/lib/scenarios";
import { TCOParams } from "@/lib/tco-calculations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScenariosPageProps {
  onLoadScenario?: (
    model1Name: string,
    model1Params: TCOParams,
    model2Name: string,
    model2Params: TCOParams
  ) => void;
}

export function ScenariosPage({ onLoadScenario }: ScenariosPageProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="p-6 overflow-y-auto h-[calc(100vh-7.5rem)]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Scenarios</h2>
          <p className="text-sm text-muted-foreground">
            Explore pre-configured scenarios to compare different LLM deployment strategies.
          </p>
        </div>

        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <Card
              key={scenario.id}
              className="p-6 border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{scenario.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {scenario.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="font-medium">{scenario.model1Name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {scenario.model1Params.modelType === 'api' ? 'API Model' :
                         scenario.model1Params.modelType === 'cloud' ? 'Cloud-hosted' :
                         'Self-hosted'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {scenario.model1Params.requestsPerDay.toLocaleString()} req/day
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{scenario.model2Name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {scenario.model2Params.modelType === 'api' ? 'API Model' :
                         scenario.model2Params.modelType === 'cloud' ? 'Cloud-hosted' :
                         'Self-hosted'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {scenario.model2Params.requestsPerDay.toLocaleString()} req/day
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    <p className="line-clamp-2">
                      {scenario.presentationText.split('\n')[0]}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 whitespace-nowrap">
                  <Button
                    onClick={() =>
                      onLoadScenario?.(
                        scenario.model1Name,
                        scenario.model1Params,
                        scenario.model2Name,
                        scenario.model2Params
                      )
                    }
                  >
                    Load Scenario
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedScenarioId(scenario.id)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {scenarios.length === 0 && (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No scenarios available yet. Create a scenario to get started.
            </p>
          </div>
        )}
      </div>

      {selectedScenario && (
        <Dialog open={!!selectedScenarioId} onOpenChange={() => setSelectedScenarioId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedScenario.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-full pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedScenario.presentationText}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
