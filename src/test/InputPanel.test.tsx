import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { InputPanel } from "@/components/InputPanel";
import { TCOParams, defaultParams } from "@/lib/tco-calculations";

function TestHarness({ currency = "EUR" }: { currency?: "EUR" | "USD" }) {
  const [params1, setParams1] = useState<TCOParams>({
    ...defaultParams,
    modelType: "api",
  });
  const [params2, setParams2] = useState<TCOParams>({
    ...defaultParams,
    modelType: "self-hosted",
  });
  const [activeModel, setActiveModel] = useState<1 | 2>(1);

  return (
    <InputPanel
      params1={params1}
      params2={params2}
      onParams1Change={setParams1}
      onParams2Change={setParams2}
      activeModel={activeModel}
      onModelChange={setActiveModel}
      days={defaultParams.days}
      onDaysChange={() => undefined}
      model1Name="API model"
      model2Name="Self-hosted model"
      onModel1NameChange={() => undefined}
      onModel2NameChange={() => undefined}
      onReset={() => undefined}
      currency={currency}
    />
  );
}

function getInputPriceInput() {
  return screen.getAllByRole("textbox")[1] as HTMLInputElement;
}

function getOutputPriceInput() {
  return screen.getAllByRole("textbox")[2] as HTMLInputElement;
}

describe("InputPanel model prices", () => {
  it("uses the selected currency in monetary input labels", () => {
    render(<TestHarness currency="USD" />);

    expect(screen.getByText("Input token price ($/1M tok)")).toBeInTheDocument();
    expect(screen.getByText("Output token price ($/1M tok)")).toBeInTheDocument();
  });

  it("keeps API and self-hosted prices independent by default", () => {
    render(<TestHarness />);

    fireEvent.change(getInputPriceInput(), { target: { value: "3" } });
    fireEvent.change(getOutputPriceInput(), { target: { value: "14" } });

    fireEvent.click(screen.getByRole("button", { name: "Self-hosted model" }));
    expect(getInputPriceInput()).toHaveValue("2.175");
    expect(getOutputPriceInput()).toHaveValue("13.05");

    fireEvent.change(getInputPriceInput(), { target: { value: "4" } });
    fireEvent.change(getOutputPriceInput(), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "API model" }));
    expect(getInputPriceInput()).toHaveValue("3");
    expect(getOutputPriceInput()).toHaveValue("14");
  });

  it("shows lock controls and mirrors a price only while locked", () => {
    render(<TestHarness />);

    const lockButton = screen.getByRole("button", {
      name: "Lock Input token price (€/1M tok)",
    });
    expect(lockButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(lockButton);
    expect(lockButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(getInputPriceInput(), { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "Self-hosted model" }));
    expect(getInputPriceInput()).toHaveValue("3");

    fireEvent.click(screen.getByRole("button", { name: "Unlock Input token price (€/1M tok)" }));
    fireEvent.change(getInputPriceInput(), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "API model" }));
    expect(getInputPriceInput()).toHaveValue("3");
  });
});
