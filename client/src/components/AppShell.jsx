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
      <footer className="mx-auto max-w-7xl px-3 pb-6 sm:px-4 md:pb-8">
        <div className="rounded-[1.35rem] border border-white/60 bg-white/70 px-4 py-3 text-center text-sm text-staps-ink/65 backdrop-blur">
          Complaints:{" "}
          <a
            href="mailto:stapdevs@gmail.com"
            className="font-semibold text-[#5a49d6] transition hover:text-[#4735cf]"
          >
            Stapdevs@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
};
