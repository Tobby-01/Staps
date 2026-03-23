import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../state/AuthContext.jsx";
import { useCart } from "../state/CartContext.jsx";
import { useFavorites } from "../state/FavoritesContext.jsx";

export const Navbar = ({ search, setSearch }) => {
  const { user, logout } = useAuth();
  const { count, clearCart } = useCart();
  const { count: favoriteCount, clearFavorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const dashboardPath =
    user?.role === "admin" ? "/admin" : user?.role === "vendor" ? "/vendor" : "/dashboard";
  const isVendorAccount = user?.role === "vendor";

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isMarketplaceRoute =
    location.pathname === "/" || location.pathname.startsWith("/categories/");

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    closeMobileMenu();

    if (!isMarketplaceRoute) {
      navigate("/");
    }
  };

  const clearSearch = () => {
    setSearch("");
    closeMobileMenu();

    if (!isMarketplaceRoute) {
      navigate("/");
    }
  };

  useEffect(() => {
    if (isVendorAccount) {
      clearCart();
      clearFavorites();
    }
  }, [isVendorAccount]);

  return (
    <header className="sticky top-0 z-40 px-2.5 pt-2.5 sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.7rem] border border-white/55 bg-white/90 px-4 py-3 shadow-soft backdrop-blur md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-5 md:rounded-[2rem] md:px-5 md:py-4">
        <div className="flex items-center justify-between gap-3 md:justify-start md:gap-4">
          <Link
            to="/"
            className="font-display text-[1.95rem] font-extrabold tracking-tight text-staps-ink sm:text-2xl"
            onClick={closeMobileMenu}
          >
            STAPS
          </Link>
          <span className="hidden rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#5a49d6] md:inline-flex">
            Campus marketplace
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-staps-ink/10 bg-[#f5f7fb] text-staps-ink shadow-sm md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 md:mt-0 md:flex md:gap-3"
        >
          <div className="flex min-w-0 w-full items-center gap-2.5 rounded-full bg-[#f5f7fb] px-3.5 py-2.5 md:gap-3 md:px-5 md:py-3">
            <MagnifyingGlassIcon className="h-[1.05rem] w-[1.05rem] shrink-0 text-staps-ink/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, food, books..."
              className="min-w-0 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-staps-ink/35 md:text-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={clearSearch}
                className="shrink-0 text-xs font-semibold text-staps-ink/45 transition hover:text-staps-ink"
              >
                Clear
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6e54ef] text-sm font-semibold text-white transition hover:bg-[#5a49d6] md:w-auto md:px-4"
          >
            <MagnifyingGlassIcon className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">Search</span>
          </button>
          <Link
            to="/"
            aria-label="Go home"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f7f0] text-staps-ink transition hover:bg-white md:inline-flex"
            title="Home"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
            </svg>
          </Link>
        </form>

        <nav className="hidden flex-wrap items-center gap-3 text-sm font-semibold md:flex md:justify-end">
          {user && user.role === "user" && (
            <NavLink to="/dashboard" className="text-staps-ink/80 transition hover:text-staps-ink">
              Orders
            </NavLink>
          )}
          {!isVendorAccount ? (
            <>
              <NavLink to="/favorites" className="text-staps-ink/80 transition hover:text-staps-ink">
                Favourites {favoriteCount ? `(${favoriteCount})` : ""}
              </NavLink>
              <NavLink to="/cart" className="rounded-full border border-staps-ink/10 bg-[#f3f7f0] px-5 py-3">
                Cart ({count})
              </NavLink>
            </>
          ) : (
            <NavLink to="/signup" className="rounded-full bg-[#6e54ef] px-5 py-3 text-white transition hover:bg-[#5a49d6]">
              Shop now
            </NavLink>
          )}

          {user ? (
            <>
              <NavLink
                to={
                  user.role === "admin"
                    ? "/admin"
                    : user.role === "vendor"
                      ? "/vendor"
                      : "/dashboard"
                }
                className="rounded-full border border-staps-ink/10 bg-[#f3f7f0] px-5 py-3"
              >
                Profile
              </NavLink>
              {user.role === "admin" && (
                <NavLink to="/admin" className="rounded-full border border-staps-ink/10 bg-[#f3f7f0] px-5 py-3">
                  Admin
                </NavLink>
              )}
              <button onClick={handleLogout} className="cta-gradient-button-soft" type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="rounded-full border border-staps-ink/10 bg-[#f3f7f0] px-5 py-3">
                Login
              </NavLink>
              <NavLink to="/signup" className="rounded-full bg-[#6e54ef] px-6 py-3 text-white transition hover:bg-[#5a49d6]">
                Shop with STAPS
              </NavLink>
            </>
          )}
        </nav>

        {mobileMenuOpen && (
          <div className="mt-4 space-y-3 border-t border-staps-ink/8 pt-4 md:hidden">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                aria-label="Go home"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f7f0] text-staps-ink"
                onClick={closeMobileMenu}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
                </svg>
              </Link>
              <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#5a49d6]">
                Campus marketplace
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm font-semibold">
              {user && user.role === "user" && (
                <NavLink
                  to="/dashboard"
                  className="rounded-2xl border border-staps-ink/10 bg-[#f3f7f0] px-4 py-3 text-staps-ink/85"
                  onClick={closeMobileMenu}
                >
                  Orders
                </NavLink>
              )}
              {!isVendorAccount ? (
                <>
                  <NavLink
                    to="/favorites"
                    className="rounded-2xl border border-staps-ink/10 bg-[#f3f7f0] px-4 py-3 text-staps-ink/85"
                    onClick={closeMobileMenu}
                  >
                    Favourites {favoriteCount ? `(${favoriteCount})` : ""}
                  </NavLink>
                  <NavLink
                    to="/cart"
                    className="rounded-2xl border border-staps-ink/10 bg-[#f3f7f0] px-4 py-3"
                    onClick={closeMobileMenu}
                  >
                    Cart ({count})
                  </NavLink>
                </>
              ) : (
                <NavLink
                  to="/signup"
                  className="rounded-2xl bg-[#6e54ef] px-4 py-3 text-center text-white transition hover:bg-[#5a49d6]"
                  onClick={closeMobileMenu}
                >
                  Shop now
                </NavLink>
              )}

              {user ? (
                <>
                  <NavLink
                    to={dashboardPath}
                    className="rounded-2xl border border-staps-ink/10 bg-[#f3f7f0] px-4 py-3"
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </NavLink>
                  {user.role === "admin" && (
                    <NavLink
                      to="/admin"
                      className="rounded-2xl border border-staps-ink/10 bg-[#f3f7f0] px-4 py-3"
                      onClick={closeMobileMenu}
                    >
                      Admin
                    </NavLink>
                  )}
                  <button onClick={handleLogout} className="cta-gradient-button-soft w-full" type="button">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="rounded-2xl border border-staps-ink/10 bg-[#f3f7f0] px-4 py-3 text-center"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="rounded-2xl bg-[#6e54ef] px-4 py-3 text-center text-white transition hover:bg-[#5a49d6]"
                    onClick={closeMobileMenu}
                  >
                    Shop with STAPS
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
