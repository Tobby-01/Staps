import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Navbar } from "./Navbar.jsx";

export const AppShell = ({ search, setSearch, searchRequestToken, requestSearchResults }) => {
  const location = useLocation();

  useEffect(() => {
    const anchorId = location.hash.replace(/^#/, "");

    if (!anchorId) {
      return;
    }

    let timeoutId = 0;
    const frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-hero">
      <Navbar
        search={search}
        setSearch={setSearch}
        requestSearchResults={requestSearchResults}
      />
      <main className="mx-auto max-w-7xl px-3 pb-6 pt-4 sm:px-4 md:pb-8 md:pt-10">
        <Outlet context={{ search, searchRequestToken }} />
      </main>
    </div>
  );
};
