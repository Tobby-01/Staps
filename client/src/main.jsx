import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AppBootGate } from "./components/AppBootGate.jsx";
import { AuthProvider } from "./state/AuthContext.jsx";
import { CartProvider } from "./state/CartContext.jsx";
import { FavoritesProvider } from "./state/FavoritesContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppBootGate>
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <App />
              <Analytics />
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </AppBootGate>
    </BrowserRouter>
  </React.StrictMode>,
);
