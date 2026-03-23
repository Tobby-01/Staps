import { Outlet } from "react-router-dom";

import { Navbar } from "./Navbar.jsx";

export const AppShell = ({ search, setSearch }) => (
  <div className="min-h-screen bg-hero">
    <Navbar search={search} setSearch={setSearch} />
    <main className="mx-auto max-w-7xl px-3 pb-6 pt-4 sm:px-4 md:pb-8 md:pt-10">
      <Outlet context={{ search }} />
    </main>
  </div>
);
