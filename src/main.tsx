import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { DialogProvider } from "./components/forms";
import { UIProvider } from "./components/ui";
import { setupPwa } from "./lib/pwa";
import { StoreProvider } from "./lib/store";

setupPwa();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <UIProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </UIProvider>
    </StoreProvider>
  </StrictMode>
);
