import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { AuthProvider } from "./auth/AuthProvider";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider
        router={router}
        fallbackElement={(
          <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-sm font-semibold text-ink-muted" role="status">
            화면을 준비하고 있습니다.
          </div>
        )}
      />
    </AuthProvider>
  </React.StrictMode>,
);
