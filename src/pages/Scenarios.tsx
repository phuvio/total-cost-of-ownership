import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { scenarios } from "@/lib/scenarios";
import { TCOParams } from "@/lib/tco-calculations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ScenariosPageProps {
  onLoadScenario?: (
    model1Name: string,
    model1Params: TCOParams,
    model2Name: string,
    model2Params: TCOParams
  ) => void;
}

export function ScenariosPage({ onLoadScenario }: ScenariosPageProps) {
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
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{scenario.name}</h3>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p]:mb-2 mb-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {scenario.presentationText}
                  </ReactMarkdown>
                </div>

                <Button
                  onClick={() =>
                    onLoadScenario?.(
                      scenario.model1Name,
                      scenario.model1Params,
                      scenario.model2Name,
                      scenario.model2Params
                    )
                  }
                  className="w-min"
                >
                  Load Scenario
                </Button>
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
    </div>
  );
}
