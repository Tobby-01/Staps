import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTrendingUpIcon,
  ArrowUpRightIcon,
  BellIcon,
  BoltIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Link, NavLink, useOutletContext } from "react-router-dom";

import { FeatureCard } from "../components/FeatureCard.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { VerifiedVendorBadge } from "../components/VerifiedVendorBadge.jsx";
import { apiRequest, apiUnavailableMessage } from "../lib/api.js";
import { categoryToSlug, marketplaceCategories } from "../lib/marketplace.js";

const marketplaceFeatures = [
  {
    icon: ShieldCheckIcon,
    title: "Secure payments, zero risk",
    description: "Your money is held safely until you confirm delivery.",
    tone: "emerald",
    highlight: true,
  },
  {
    icon: CheckBadgeIcon,
    title: "Shop from trusted sellers",
    description: "Only verified vendors can list and fulfill orders.",
    tone: "blue",
  },
  {
    icon: BoltIcon,
    title: "Catch deals before they’re gone",
    description: "Enjoy limited-time discounts updated every two weeks.",
    tone: "violet",
  },
  {
    icon: BellIcon,
    title: "Stay in the loop",
    description: "Get instant updates on orders, new products, and deals.",
    tone: "amber",
  },
];

export const HomePage = () => {
  const { search, searchRequestToken } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const lastSearchScrollTokenRef = useRef(0);
  const heroShopperImage = "/hero-shopper.png";

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        const response = await apiRequest(`/api/products${query}`);
        setProducts(response.products || []);
        setError("");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [search]);

  const vendorStores = useMemo(() => {
    const vendorMap = new Map();

    products.forEach((product) => {
      const vendorId = product.vendor?._id || product.vendor?.id;
      const vendorName = product.vendor?.name;

      if (!vendorId || !vendorName) {
        return;
      }

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          id: vendorId,
          name: vendorName,
          verified: Boolean(product.vendor?.verified),
          count: 0,
        });
      }

      vendorMap.get(vendorId).count += 1;
    });

    return Array.from(vendorMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedVendorIds.length) {
      return products;
    }

    return products.filter((product) =>
      selectedVendorIds.includes(product.vendor?._id || product.vendor?.id),
    );
  }, [products, selectedVendorIds]);

  const marketplacePulse = useMemo(() => {
    const vendorIds = new Set();
    const verifiedVendorIds = new Set();
    let dealsLive = 0;

    filteredProducts.forEach((product) => {
      const vendorId = product.vendor?._id || product.vendor?.id;

      if (vendorId) {
        vendorIds.add(vendorId);
      }

      if (vendorId && product.vendor?.verified) {
        verifiedVendorIds.add(vendorId);
      }

      if (
        product.isFlashSale ||
        (product.discountPrice && Number(product.discountPrice) < Number(product.price))
      ) {
        dealsLive += 1;
      }
    });

    return {
      listings: filteredProducts.length,
      stores: vendorIds.size,
      verifiedStores: verifiedVendorIds.size,
      dealsLive,
    };
  }, [filteredProducts]);

  const categoryHighlights = useMemo(() => {
    const counts = new Map();

    filteredProducts.forEach((product) => {
      const category = product.category || "Campus picks";
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        count,
        slug: categoryToSlug(name),
      }));
  }, [filteredProducts]);

  const featuredProduct = filteredProducts[0] || null;
  const gridProducts = featuredProduct
    ? filteredProducts.filter(
        (product) => (product._id || product.id) !== (featuredProduct._id || featuredProduct.id),
      )
    : filteredProducts;

  const toggleVendor = (vendorId) => {
    setSelectedVendorIds((current) =>
      current.includes(vendorId)
        ? current.filter((entry) => entry !== vendorId)
        : [...current, vendorId],
    );
  };

  useEffect(() => {
    if (!searchRequestToken || searchRequestToken <= lastSearchScrollTokenRef.current || loading) {
      return;
    }

    lastSearchScrollTokenRef.current = searchRequestToken;

    let timeoutId = 0;
    const frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        document.getElementById("home-results-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [error, loading, searchRequestToken]);

  return (
    <div className="space-y-4 pb-6 md:space-y-6 md:pb-10">
      <section className="surface-card overflow-hidden p-3.5 sm:p-4 md:p-6">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 md:gap-2.5">
          {marketplaceCategories.map((category) => (
            <NavLink
              key={category}
              to={`/categories/${categoryToSlug(category)}`}
              className="filter-pill shrink-0"
            >
              {category}
            </NavLink>
          ))}
        </div>

        <div className="mt-3 grid gap-4 md:mt-4 xl:grid-cols-[250px_minmax(0,1fr)] xl:items-start xl:gap-6">
          <div className="order-1 min-w-0 space-y-4 xl:order-2">
            <section className="relative overflow-hidden rounded-[1.55rem] bg-gradient-to-r from-[#f7f9ff] via-white to-[#eef4fb] p-4 sm:p-5 md:rounded-[2rem] md:p-7">
              <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(82,196,168,0.14),transparent_58%),radial-gradient(circle_at_bottom,rgba(109,84,239,0.1),transparent_54%)] xl:block" />
              <div className="relative min-w-0 space-y-3.5 md:space-y-5">
                <div className="grid gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center xl:gap-5">
                  <div className="max-w-full space-y-3.5 xl:max-w-[36rem] xl:space-y-5">
                    <span className="inline-flex rounded-full bg-[#efeafe] px-3 py-2 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-[#644df0] md:px-4 md:text-xs md:tracking-[0.28em]">
                      Campus marketplace
                    </span>
                    <h1 className="max-w-full font-display text-[1.92rem] font-extrabold leading-[0.98] sm:text-[2.45rem] md:max-w-lg md:text-[3.6rem] xl:text-[4.15rem]">
                      Shop campus favorites in one trusted marketplace.
                    </h1>
                    <p className="max-w-full text-[0.95rem] leading-6 text-staps-ink/65 md:max-w-lg md:text-[1rem]">
                      STAPS gives shoppers secure escrow checkout, cleaner discovery, and trusted
                      campus sellers in one polished flow.
                    </p>
                    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                      <a
                        href="#marketplace-grid"
                        className="cta-gradient-button w-full px-5 py-3 text-sm font-semibold shadow-[0_18px_28px_rgba(108,76,255,0.18)] sm:w-auto sm:px-7 sm:py-4 sm:text-base sm:shadow-[0_24px_40px_rgba(108,76,255,0.22)]"
                      >
                        Shop with STAPS
                      </a>
                      <Link
                        to="/vendor/apply"
                        className="w-full rounded-full border border-staps-ink/10 bg-[#f2f6ef] px-5 py-3 text-center text-sm font-semibold text-staps-ink sm:w-auto sm:px-7 sm:py-4 sm:text-base"
                      >
                        Become a vendor
                      </Link>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(180deg,rgba(239,248,255,0.92),rgba(255,255,255,0.56))] shadow-[0_16px_40px_rgba(18,38,32,0.08)] h-[260px] sm:h-[320px] md:h-[240px] xl:h-[280px] xl:rounded-[2rem] xl:shadow-[0_24px_60px_rgba(18,38,32,0.08)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(132,95,255,0.16),transparent_34%),radial-gradient(circle_at_80%_28%,rgba(82,196,168,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,198,92,0.14),transparent_28%)]" />
                    <img
                      src={heroShopperImage}
                      alt="Happy shopper using STAPS"
                      className="absolute inset-0 z-[1] h-full w-full object-contain object-bottom"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-4">
                  {marketplaceFeatures.map((feature) => (
                    <FeatureCard
                      key={feature.title}
                      {...feature}
                      className="max-w-none justify-self-stretch"
                    />
                  ))}
                </div>
              </div>
            </section>

            <div id="home-results-section" className="scroll-mt-28">
              {loading ? (
                <div className="surface-card p-4 md:p-6">Loading shopper marketplace...</div>
              ) : error ? (
                <div className="surface-card p-4 md:p-6">
                  <p className="text-red-600">{error}</p>
                  {error === apiUnavailableMessage && (
                    <p className="mt-2 text-sm text-staps-ink/65">
                      The frontend is running, but the backend API is not available yet.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  id="marketplace-grid"
                  className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3 xl:gap-5"
                >
                  {featuredProduct && <ProductCard product={featuredProduct} featured />}
                  {gridProducts.slice(0, 5).map((product) => (
                    <ProductCard key={product._id || product.id} product={product} />
                  ))}
                </div>
              )}

              {!loading && !error && !filteredProducts.length && (
                <div className="surface-card p-4 text-staps-ink/70 md:p-6">
                  No uploaded vendor products match this current home filter yet.
                </div>
              )}
            </div>
          </div>

          <aside className="order-2 space-y-3.5 xl:order-1 xl:space-y-4">
            <div className="relative overflow-hidden rounded-[1.6rem] border border-white/40 bg-[linear-gradient(145deg,#14213f_0%,#3f3f9d_48%,#79a4ff_100%)] p-5 text-white shadow-[0_28px_65px_rgba(39,48,99,0.32)] md:rounded-[1.9rem] md:p-6">
              <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-white/14 blur-3xl" />
              <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-[#7de5d0]/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="max-w-[14rem]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/84 backdrop-blur">
                    <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                    Market intel
                  </span>
                  <p className="mt-4 font-display text-[1.5rem] font-bold leading-none md:text-[2rem]">
                    Marketplace pulse
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/74">
                    A refined live snapshot of what is moving across STAPS right now.
                  </p>
                </div>
                <Link
                  to="/categories/deals"
                  className="inline-flex items-center gap-1 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-semibold text-white/92 backdrop-blur transition hover:bg-white/18"
                >
                  View deals
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="relative mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Listings", String(marketplacePulse.listings)],
                  ["Stores", String(marketplacePulse.stores)],
                  ["Verified", String(marketplacePulse.verifiedStores)],
                  ["Deals live", String(marketplacePulse.dealsLive)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.25rem] border border-white/16 bg-white/12 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl"
                  >
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-white/58">
                      {label}
                    </p>
                    <p className="mt-2 font-display text-[1.55rem] font-extrabold leading-none text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,243,255,0.95),rgba(237,246,255,0.98))] p-5 shadow-[0_24px_58px_rgba(18,38,32,0.08)] md:rounded-[1.9rem] md:p-6">
              <div className="absolute right-0 top-0 h-36 w-36 bg-[radial-gradient(circle,rgba(100,77,240,0.16),transparent_65%)]" />
              <div className="absolute bottom-0 left-0 h-32 w-32 bg-[radial-gradient(circle,rgba(82,196,168,0.16),transparent_64%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="max-w-[14rem]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#efeafe] px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#644df0]">
                    <SparklesIcon className="h-3.5 w-3.5" />
                    Curated now
                  </span>
                  <p className="mt-4 font-display text-[1.5rem] font-bold leading-none text-staps-ink md:text-[2rem]">
                    Popular right now
                  </p>
                  <p className="mt-2 text-sm leading-6 text-staps-ink/58">
                    Jump straight into the busiest categories and keep browsing momentum high.
                  </p>
                </div>
                <Link
                  to="/categories/all-categories"
                  className="inline-flex items-center gap-1 rounded-full border border-[#ded8ff] bg-white/80 px-4 py-2 text-xs font-semibold text-[#644df0] shadow-sm transition hover:bg-white"
                >
                  Browse all
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="relative mt-5 space-y-3">
                {categoryHighlights.length ? (
                  categoryHighlights.map((category, index) => (
                    <Link
                      key={category.slug}
                      to={`/categories/${category.slug}`}
                      className="group flex items-center gap-3 rounded-[1.28rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_14px_28px_rgba(100,77,240,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-[#6e54ef] to-[#9aa7ff] font-display text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(110,84,239,0.2)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-staps-ink">
                          {category.name}
                        </p>
                        <p className="text-xs text-staps-ink/50">{category.count} active listings</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#644df0]">
                        Explore
                        <ArrowUpRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[1.28rem] border border-white/70 bg-white/80 px-4 py-4 text-sm text-staps-ink/55 shadow-[0_14px_28px_rgba(100,77,240,0.08)] backdrop-blur">
                    Category highlights will show up here as soon as products are available.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#f8f9fd] p-4 md:rounded-[1.75rem] md:p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-[1.45rem] font-bold leading-none md:text-[2rem]">
                  Vendor stores
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedVendorIds([])}
                  className="text-sm font-semibold text-staps-ink/45"
                >
                  Reset
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {vendorStores.length ? (
                  vendorStores.map((vendor) => {
                    const active = selectedVendorIds.includes(vendor.id);

                    return (
                      <button
                        key={vendor.id}
                        type="button"
                        onClick={() => toggleVendor(vendor.id)}
                        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-staps-ink/75">{vendor.name}</span>
                            {vendor.verified ? <VerifiedVendorBadge /> : null}
                          </div>
                          <p className="text-xs text-staps-ink/45">{vendor.count} product(s)</p>
                        </div>
                        <span
                          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-sm ${
                            active
                              ? "border-transparent bg-[#6e54ef] text-white"
                              : "border-staps-ink/15 text-staps-ink/35"
                          }`}
                        >
                          {active ? "x" : "+"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-staps-ink/55">
                    Vendor stores will appear here after products are uploaded.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};
