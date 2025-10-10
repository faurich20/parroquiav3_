// src/index.js
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";

const root = createRoot(document.getElementById("root"));

document.title = "Sistema Parroquial - CHASKIS"

root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
