import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

Chart.register(...registerables, annotationPlugin);

createRoot(document.getElementById("root")!).render(<App />);
