import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { RoleRoute } from "./components/RoleRoute.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { CategoryPage } from "./pages/CategoryPage.jsx";
import { ShopperDashboard } from "./pages/BuyerDashboard.jsx";
import { CartPage } from "./pages/CartPage.jsx";
import { FavoritesPage } from "./pages/FavoritesPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { PaymentCallbackPage } from "./pages/PaymentCallbackPage.jsx";
import { ProfileChatPage } from "./pages/ProfileChatPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { VendorDashboard } from "./pages/VendorDashboard.jsx";
import { VendorOnboardingPage } from "./pages/VendorOnboardingPage.jsx";

const App = () => {
  const [search, setSearch] = useState("");
  const [searchRequestToken, setSearchRequestToken] = useState(0);

  const requestSearchResults = () => {
    setSearchRequestToken((current) => current + 1);
  };

  return (
    <Routes>
      <Route
        element={
          <AppShell
            search={search}
            setSearch={setSearch}
            searchRequestToken={searchRequestToken}
            requestSearchResults={requestSearchResults}
          />
        }
      >
        <Route index element={<HomePage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="payment/callback" element={<PaymentCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="vendor/apply" element={<VendorOnboardingPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="profiles/:id" element={<ProfileChatPage />} />

          <Route element={<RoleRoute allow={["user"]} />}>
            <Route path="dashboard" element={<ShopperDashboard />} />
          </Route>

          <Route element={<RoleRoute allow={["vendor"]} />}>
            <Route path="vendor" element={<VendorDashboard />} />
          </Route>

          <Route element={<RoleRoute allow={["admin"]} />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
