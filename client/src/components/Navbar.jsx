import {
  Bars3Icon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";
import { useCart } from "../state/CartContext.jsx";
import { useFavorites } from "../state/FavoritesContext.jsx";

export const Navbar = ({ search, setSearch, requestSearchResults }) => {
  const { user, logout } = useAuth();
  const { count, clearCart } = useCart();
  const { count: favoriteCount, clearFavorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
    requestSearchResults?.();

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

  const desktopGlassLink = "glass-action-pill text-staps-ink/80 hover:text-staps-ink";
  const desktopGlassCta = "glass-action-pill glass-action-pill-accent";
  const mobileGlassLink = "glass-mobile-link text-staps-ink/85";
  const mobileGlassCta = "glass-mobile-link glass-mobile-link-accent";
  const utilityCountLabel = (value) => (value > 99 ? "99+" : value);
  const showActivityIcons = Boolean(user && user.role !== "admin");
  const messagesPath = `${dashboardPath}#messages`;
  const notificationsPath = `${dashboardPath}#notifications`;

  const mobileShortcutItems = [
    ...(user && user.role === "user"
      ? [{ to: "/dashboard", label: "Orders", icon: ClipboardDocumentListIcon }]
      : []),
    ...(!isVendorAccount
      ? [
          { to: "/favorites", label: "Favourites", icon: HeartIcon },
          { to: "/cart", label: `Cart (${count})`, icon: ShoppingCartIcon },
        ]
      : []),
    ...(user ? [{ to: dashboardPath, label: "Profile", icon: UserCircleIcon }] : []),
  ];

  useEffect(() => {
    if (isVendorAccount) {
      clearCart();
      clearFavorites();
    }
  }, [clearCart, clearFavorites, isVendorAccount]);

  useEffect(() => {
    if (!showActivityIcons) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    let active = true;

    const loadActivity = async () => {
      try {
        const [notificationsResponse, conversationsResponse] = await Promise.all([
          apiRequest("/api/notifications"),
          apiRequest("/api/chat/conversations"),
        ]);

        if (!active) {
          return;
        }

        setUnreadNotifications(
          (notificationsResponse.notifications || []).filter((notification) => !notification.read).length,
        );
        setUnreadMessages(
          (conversationsResponse.conversations || []).reduce(
            (total, conversation) => total + Number(conversation.unreadCount || 0),
            0,
          ),
        );
      } catch {
        if (active) {
          setUnreadMessages(0);
          setUnreadNotifications(0);
        }
      }
    };

    loadActivity().catch(() => {});

    const intervalId = window.setInterval(() => {
      loadActivity().catch(() => {});
    }, 10000);
    const handleFocus = () => loadActivity().catch(() => {});
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadActivity().catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showActivityIcons]);

  return (
    <header className="sticky top-0 z-40 px-2.5 pt-2.5 sm:px-4 sm:pt-4">
      <div className="glass-navbar mobile-navbar-shell mx-auto max-w-7xl rounded-[1.7rem] px-4 py-3 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-5 md:rounded-[2rem] md:px-5 md:py-4">
        <div className="mobile-navbar-top flex items-center justify-between gap-3 md:justify-start md:gap-4">
          <Link
            to="/"
            className="mobile-navbar-brand font-display text-[1.95rem] font-extrabold tracking-tight text-staps-ink sm:text-2xl"
            onClick={closeMobileMenu}
          >
            STAPS
          </Link>
          <span className="glass-chip hidden text-xs font-semibold text-[#5144c7] md:inline-flex">
            Campus marketplace
          </span>
          <div className="glass-mobile-toolbar flex items-center gap-2 md:hidden">
            {showActivityIcons ? (
              <>
                <Link
                  to={messagesPath}
                  className="glass-icon-button glass-mobile-toolbar-button relative inline-flex h-11 w-11 items-center justify-center text-staps-ink"
                  aria-label="Open messages"
                  title="Messages"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  {unreadMessages ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#ff4d5f] px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-white">
                      {utilityCountLabel(unreadMessages)}
                    </span>
                  ) : null}
                </Link>
                <Link
                  to={notificationsPath}
                  className="glass-icon-button glass-mobile-toolbar-button relative inline-flex h-11 w-11 items-center justify-center text-staps-ink"
                  aria-label="Open notifications"
                  title="Notifications"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadNotifications ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#ff4d5f] px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-white">
                      {utilityCountLabel(unreadNotifications)}
                    </span>
                  ) : null}
                </Link>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="glass-icon-button glass-mobile-toolbar-button inline-flex h-11 w-11 items-center justify-center"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mobile-navbar-search mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 md:mt-0 md:flex md:gap-3"
        >
          <div className="glass-search-shell glass-mobile-search-shell flex min-w-0 w-full items-center gap-2.5 px-3.5 py-2.5 md:gap-3 md:px-5 md:py-3">
            <MagnifyingGlassIcon className="h-[1.05rem] w-[1.05rem] shrink-0 text-staps-ink/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products, food, books..."
              className="glass-search-input min-w-0 w-full bg-transparent text-[0.95rem] outline-none md:text-sm"
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
            className="glass-action-pill glass-action-pill-accent glass-mobile-search-trigger inline-flex h-11 w-11 shrink-0 items-center justify-center text-sm font-semibold text-staps-ink md:w-auto md:px-4"
          >
            <MagnifyingGlassIcon className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">Search</span>
          </button>
          <Link
            to="/"
            aria-label="Go home"
            className="glass-icon-button hidden h-11 w-11 shrink-0 items-center justify-center text-staps-ink md:inline-flex"
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
          {showActivityIcons ? (
            <>
              <Link
                to={messagesPath}
                className="glass-icon-button relative inline-flex h-11 w-11 items-center justify-center text-staps-ink"
                aria-label="Open messages"
                title="Messages"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                {unreadMessages ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#ff4d5f] px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-white">
                    {utilityCountLabel(unreadMessages)}
                  </span>
                ) : null}
              </Link>
              <Link
                to={notificationsPath}
                className="glass-icon-button relative inline-flex h-11 w-11 items-center justify-center text-staps-ink"
                aria-label="Open notifications"
                title="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {unreadNotifications ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#ff4d5f] px-1.5 py-0.5 text-[0.62rem] font-bold leading-none text-white">
                    {utilityCountLabel(unreadNotifications)}
                  </span>
                ) : null}
              </Link>
            </>
          ) : null}
          {user && user.role === "user" && (
            <NavLink to="/dashboard" className={desktopGlassLink}>
              Orders
            </NavLink>
          )}
          {!isVendorAccount ? (
            <>
              <NavLink to="/favorites" className={desktopGlassLink}>
                Favourites {favoriteCount ? `(${favoriteCount})` : ""}
              </NavLink>
              <NavLink to="/cart" className={desktopGlassLink}>
                Cart ({count})
              </NavLink>
            </>
          ) : (
            <NavLink to="/signup" className={desktopGlassCta}>
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
                className={desktopGlassLink}
              >
                Profile
              </NavLink>
              {user.role === "admin" && (
                <NavLink to="/admin" className={desktopGlassLink}>
                  Admin
                </NavLink>
              )}
              <button onClick={handleLogout} className={desktopGlassLink} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={desktopGlassLink}>
                Login
              </NavLink>
              <NavLink to="/signup" className={desktopGlassCta}>
                Shop with STAPS
              </NavLink>
            </>
          )}
        </nav>

        {mobileMenuOpen && (
          <div className="glass-mobile-sheet mt-4 space-y-3 pt-4 md:hidden">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                aria-label="Go home"
                className="glass-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center text-staps-ink"
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
              <span className="glass-chip text-xs font-semibold text-[#5144c7]">
                Campus marketplace
              </span>
            </div>

            {mobileShortcutItems.length ? (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm font-semibold">
                {mobileShortcutItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="glass-mobile-link inline-flex min-w-[8.75rem] items-center gap-2 whitespace-nowrap px-4 py-3 text-staps-ink/85"
                    onClick={closeMobileMenu}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            ) : null}

            {showActivityIcons ? (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm font-semibold">
                <NavLink
                  to={messagesPath}
                  className="glass-mobile-link inline-flex min-w-[8.75rem] items-center justify-between gap-3 whitespace-nowrap px-4 py-3 text-staps-ink/85"
                  onClick={closeMobileMenu}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0" />
                    <span>Messages</span>
                  </span>
                  {unreadMessages ? (
                    <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-[#ff4d5f] px-1.5 py-0.5 text-[0.68rem] font-bold leading-none text-white">
                      {utilityCountLabel(unreadMessages)}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink
                  to={notificationsPath}
                  className="glass-mobile-link inline-flex min-w-[8.75rem] items-center justify-between gap-3 whitespace-nowrap px-4 py-3 text-staps-ink/85"
                  onClick={closeMobileMenu}
                >
                  <span className="inline-flex items-center gap-2">
                    <BellIcon className="h-5 w-5 shrink-0" />
                    <span>Alerts</span>
                  </span>
                  {unreadNotifications ? (
                    <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-[#ff4d5f] px-1.5 py-0.5 text-[0.68rem] font-bold leading-none text-white">
                      {utilityCountLabel(unreadNotifications)}
                    </span>
                  ) : null}
                </NavLink>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 text-sm font-semibold">
              {!user ? (
                <>
                  <NavLink
                    to="/login"
                    className={mobileGlassLink}
                    onClick={closeMobileMenu}
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className={mobileGlassCta}
                    onClick={closeMobileMenu}
                  >
                    Shop with STAPS
                  </NavLink>
                </>
              ) : user.role === "admin" ? (
                <NavLink
                  to="/admin"
                  className={mobileGlassLink}
                  onClick={closeMobileMenu}
                >
                  Admin
                </NavLink>
              ) : null}

              {user ? (
                <button onClick={handleLogout} className={`${mobileGlassLink} w-full`} type="button">
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
