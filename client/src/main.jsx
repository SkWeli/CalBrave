import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AsgardeoProvider } from "@asgardeo/react";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

const appUrl = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const baseUrl = import.meta.env.VITE_ASGARDEO_BASE_URL;
const clientId = import.meta.env.VITE_ASGARDEO_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AsgardeoProvider
      baseUrl={baseUrl}
      clientId={clientId}
      afterSignInUrl={`${appUrl}/auth/callback`}
      afterSignOutUrl={`${appUrl}/login`}
      scopes={["openid", "profile", "email"]}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </AsgardeoProvider>
  </StrictMode>
);