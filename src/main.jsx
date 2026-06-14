import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { LangProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { AuthProvider } from "./lib/auth";
import { ProjectProvider } from "./lib/project";
import { ToastProvider } from "./components/ui";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <LangProvider>
          <ToastProvider>
            <AuthProvider>
              <ProjectProvider>
                <App />
              </ProjectProvider>
            </AuthProvider>
          </ToastProvider>
        </LangProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
