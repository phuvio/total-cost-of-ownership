# Total Cost of Ownership Estimator

A framework and interactive calculator for estimating the Total Cost of Ownership (TCO) of Large Language Model (LLM) applications.

This project is developed as part of a master's thesis at University of Helsinki focusing on cost-aware selection and deployment of Large Language Models in production environments.

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
