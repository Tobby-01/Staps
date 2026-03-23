import { useEffect, useMemo, useState } from "react";
import {
  BellIcon,
  BoltIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
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
  const { search } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [deliveryOption, setDeliveryOption] = useState("Standard");

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

                  <div className="relative hidden overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(180deg,rgba(239,248,255,0.92),rgba(255,255,255,0.56))] shadow-[0_16px_40px_rgba(18,38,32,0.08)] md:block md:h-[220px] xl:h-[280px] xl:rounded-[2rem] xl:shadow-[0_24px_60px_rgba(18,38,32,0.08)]">
                    <div className="absolute inset-x-4 top-4 rounded-full bg-white/75 px-4 py-2 text-center text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-staps-ink/45 backdrop-blur md:inset-x-6 md:top-6 md:text-[0.68rem] md:tracking-[0.22em]">
                      Transparent shopper vector space
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(132,95,255,0.16),transparent_34%),radial-gradient(circle_at_80%_28%,rgba(82,196,168,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,198,92,0.14),transparent_28%)]" />
                    <div className="absolute bottom-0 left-1/2 h-[180px] w-[130px] -translate-x-1/2 rounded-t-[4rem] border border-dashed border-staps-ink/12 bg-white/20 sm:h-[220px] sm:w-[160px] sm:rounded-t-[5rem] xl:h-[240px] xl:w-[180px] xl:rounded-t-[6rem]" />
                    <div className="absolute bottom-16 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border border-dashed border-staps-ink/12 bg-white/30 sm:bottom-24 sm:h-24 sm:w-24" />
                    <div className="absolute bottom-4 left-4 rounded-2xl bg-white/70 px-3 py-2 text-[0.7rem] leading-5 text-staps-ink/55 shadow-sm backdrop-blur sm:bottom-10 sm:left-10 sm:px-4 sm:py-3 sm:text-xs">
                      Drop in a
                      <br />
                      backgroundless happy shopper
                      <br />
                      illustration here
                    </div>
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
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5"
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

          <aside className="order-2 space-y-3.5 xl:order-1 xl:space-y-4">
            <div className="rounded-[1.5rem] bg-[#f8f9fd] p-4 md:rounded-[1.75rem] md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-[1.45rem] font-bold leading-none md:text-[2rem]">
                    Price range
                  </p>
                  <p className="mt-2 text-sm text-staps-ink/55">
                    Average campus price is NGN 12,000
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-sm font-semibold text-staps-ink/45"
                >
                  Reset
                </button>
              </div>
              <div className="mt-4 rounded-[1.3rem] bg-white p-4 md:mt-6 md:rounded-[1.5rem]">
                <div className="h-24 rounded-[1.1rem] bg-gradient-to-t from-[#cfc6ff] to-[#f0ecff] md:h-28 md:rounded-[1.25rem]" />
                <div className="mt-4 flex items-center justify-between text-sm font-bold">
                  <span className="rounded-full bg-staps-ink px-3 py-2 text-white">NGN 2k</span>
                  <span className="rounded-full bg-staps-ink px-3 py-2 text-white">NGN 45k</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#f8f9fd] p-4 md:rounded-[1.75rem] md:p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-[1.45rem] font-bold leading-none md:text-[2rem]">
                  Shopper rating
                </p>
                <span className="text-sm text-staps-ink/45">4 stars &amp; up</span>
              </div>
              <p className="mt-3 text-xl text-[#ffcb45]">&#9733;&#9733;&#9733;&#9733;&#9734;</p>
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

            <div className="rounded-[1.5rem] bg-[#f8f9fd] p-4 md:rounded-[1.75rem] md:p-5">
              <p className="font-display text-[1.45rem] font-bold leading-none md:text-[2rem]">
                Delivery options
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {["Standard", "Pick up"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDeliveryOption(option)}
                    className={`w-full rounded-full px-4 py-3 font-semibold ${
                      deliveryOption === option
                        ? "bg-[#6e54ef] text-white"
                        : "bg-white text-staps-ink"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};
