import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import PublicFrontDoor from "./pages/PublicFrontDoor";
import { SessionProvider } from "./state/session";
import "./styles/tokens.css";

// Whole-business public entry point: keep the company front door independent
// from the authenticated Sleep app route tree. Existing deep links (/login,
// /home, /tonight, etc.) continue through App unchanged. This is intentionally
// pathname-only so query strings on `/` cannot bypass the public front door.
const isPublicFrontDoor = window.location.pathname === "/";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {isPublicFrontDoor ? (
        <PublicFrontDoor />
      ) : (
        <SessionProvider>
          <App />
        </SessionProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>
);
