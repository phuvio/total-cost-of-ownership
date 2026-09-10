# Total Cost of Ownership Estimator

A framework and interactive calculator for estimating the Total Cost of Ownership (TCO) of Large Language Model (LLM) applications.

This project is developed as part of a master's thesis at University of Helsinki focusing on cost-aware selection and deployment of Large Language Models in production environments.

The interactive Total Cost of Ownership Estimator can be accessed here:
[https://phuvio.github.io/total-cost-of-ownership/](https://phuvio.github.io/total-cost-of-ownership/).

## Purpose

Deploying LLM-based applications involves significantly more than API token pricing. Real-world costs may include:

- Inference costs
- Training and fine-tuning costs
- GPU and infrastructure costs
- Retrieval and vector database costs
- Guardrails and moderation systems
- Engineering and implementation effort
- Optimization techniques such as caching, routing, batching, and quantization

The goal of this project is to provide a practical framework for:

- Comparing different LLM deployment strategies
- Estimating training vs. inference cost trade-offs
- Identifying crossover points where inference costs dominate
- Evaluating the impact of optimization techniques on total cost

## Features

- Interactive TCO calculator
- Training vs. inference crossover visualization
- Cost breakdown analysis
- Multiple deployment modes:
  - API-based models
  - Cloud-hosted models
  - Self-hosted models
- Optimization modeling:
  - Caching
  - Model routing
  - Quantization
  - Prompt compression
  - Batching
  - Speculative decoding
- Adjustable assumptions and scenario analysis

## Research Context

The framework is informed by:

- Scientific literature on LLM inference and deployment
- AACODS-evaluated grey literature
- Industry documentation and technical reports

The project explores how architectural and optimization decisions affect the total lifecycle cost of LLM systems.

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Recharts
- Vite

## Monthly TCO from the Terminal

The monthly TCO function evaluates cumulative TCO every 30 days from day 30 through day 720. Provide a JSON file containing any model fields to override; omitted fields use the calculator defaults:

```powershell
npm run tco:monthly -- --file model.json
```

Example `model.json`:

```json
{
  "modelType": "api",
  "inputTokenPrice": 2.175,
  "outputTokenPrice": 13.05,
  "requestsPerDay": 10000
}
```

The command prints JSON with 24 cumulative `tco` results, one for each 30-day period through 720 days. Model JSON can also be piped through standard input.

## Agent Endpoint

The AI setup agent uses the `/api/agent` endpoint in development and production.

- In development, Vite serves the endpoint through local middleware.
- In production, deploy the app to Vercel or another serverless host that serves `api/agent.ts`.
- Set `ANTHROPIC_API_KEY` in the serverless environment to enable Claude-backed responses.
- If the key is absent, the handler falls back to deterministic local suggestions.

## Status

Prototype / research project under active development.

The current implementation is intended for experimentation, visualization, and research purposes rather than production-grade financial estimation.

## Thesis Topic

Cost-Aware Selection and Deployment of Large Language Models

Focus areas include:

- Total Cost of Ownership (TCO)
- Inference optimization
- Cost-performance trade-offs
- Production deployment considerations
- LLM system architecture

## License

MIT License

## Contributions

This repository is currently part of an academic research project, but feedback and ideas are welcome.
