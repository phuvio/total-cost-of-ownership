import { readFile, writeFile } from "node:fs/promises";
import { calculateTCO, defaultParams, TCOParams } from "../src/lib/tco-calculations.ts";

function printUsage(): never {
  console.error("Usage: npm run tco:monthly -- --output path/to/results.csv");
  console.error("   or: npm run tco:monthly -- --file path/to/model.json --output path/to/results.csv");
  process.exit(1);
}

async function readModelInput(): Promise<{ input: Partial<TCOParams>; outputPath: string }> {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--file");
  const outputIndex = args.indexOf("--output");
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : "scripts/tco-monthly.csv";

  if (!outputPath) printUsage();

  if (fileIndex >= 0) {
    const inputPath = args[fileIndex + 1];
    if (!inputPath) printUsage();
    return {
      input: JSON.parse(await readFile(inputPath, "utf8")) as Partial<TCOParams>,
      outputPath,
    };
  }

  const jsonArgs = args.filter((arg, index) => index !== outputIndex && index !== outputIndex + 1);
  if (jsonArgs.length > 0) {
    return { input: JSON.parse(jsonArgs.join(" ")) as Partial<TCOParams>, outputPath };
  }

  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    return { input: JSON.parse(Buffer.concat(chunks).toString("utf8")) as Partial<TCOParams>, outputPath };
  }

  printUsage();
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatCurrency(value: number): string {
  return value.toFixed(2);
}

const { input: modelInput, outputPath } = await readModelInput();
const params: TCOParams = {
  ...defaultParams,
  ...modelInput,
  days: 24 * 30.44,
};

const rows = Array.from({ length: 24 }, (_, index) => {
  const month = index + 1;
  const result = calculateTCO({ ...params, days: month * 30.44 });
  const setupCost = result.costBreakdown.trainingAndSetup + result.oneTimeEngineeringCost;

  return {
    month,
    cumulativeHardwareSetupCost: formatCurrency(setupCost),
    cumulativeInferenceCost: formatCurrency(result.totalInferenceCost),
    cumulativeEngineeringOperationalCost: formatCurrency(result.recurringEngineeringCost),
    cumulativeEnergyCost: formatCurrency(result.energyCost),
    cumulativeTCO: formatCurrency(result.tco),
  };
});

const columns = Object.keys(rows[0]);
const csv = [
  columns.join(","),
  ...rows.map((row) => columns.map((column) => escapeCsv(row[column as keyof typeof row])).join(",")),
].join("\n");

await writeFile(outputPath, `${csv}\n`, "utf8");
const monthlyElectricityCost = calculateTCO({ ...params, days: 30.44 }).monthlyElectricityCost;
console.log(`Wrote ${rows.length} rows to ${outputPath}`);
console.log(`Monthly electricity cost: $${monthlyElectricityCost.toFixed(2)}`);
console.log(`Final TCO at month 24: $${rows[rows.length - 1].cumulativeTCO}`);
