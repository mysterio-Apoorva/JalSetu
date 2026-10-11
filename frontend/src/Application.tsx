import { lazy } from "react";
// The development simulator is excluded entirely from production output.
export const Application = lazy(() => import.meta.env.DEV && import.meta.env.VITE_DATA_MODE === "demo" ? import("./App") : import("./OperationsApp"));
