import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Filter out Cloudflare cookie warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Cookie') && args[0]?.includes?.('__cf_bm')) {
    return;
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
