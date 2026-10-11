import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { Application } from "./Application";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<p className="p-6" role="status">Loading JAL-SETU…</p>}><Application /></Suspense>
  </StrictMode>,
);
