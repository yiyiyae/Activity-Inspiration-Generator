// React 应用入口：挂载根组件并注入全局 ThemeProvider。
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { ThemeProvider } from "./context/ThemeContext";
import { setupSessionEndTracking } from "./services/analytics";

setupSessionEndTracking();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

