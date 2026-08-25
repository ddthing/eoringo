import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { AuthProvider } from "./auth/AuthProvider";
import "./styles/globals.css";

// Public pages are pre-rendered into a temporary shell for crawlers and
// first paint. The client router owns the live UI once JavaScript starts.
document.getElementById("prerendered-content")?.remove();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
