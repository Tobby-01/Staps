import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useOutletContext, useParams } from "react-router-dom";

import { ProductCard } from "../components/ProductCard.jsx";
import { VerifiedVendorBadge } from "../components/VerifiedVendorBadge.jsx";
import { apiRequest, apiUnavailableMessage } from "../lib/api.js";
import { categoryToSlug, marketplaceCategories, slugToCategory } from "../lib/marketplace.js";

export const CategoryPage = () => {
  const { slug } = useParams();
  const { search } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const categoryName = slugToCategory(slug || "");

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

  const dealProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.isFlashSale ||
          (product.discountPrice && Number(product.discountPrice) < Number(product.price)),
      ),
    [products],
  );

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
    const categoryFiltered =
      categoryName === "All Categories"
        ? products
        : categoryName === "Deals"
          ? dealProducts
          : products.filter((product) => product.category === categoryName);

    if (!selectedVendorIds.length) {
      return categoryFiltered;
    }

    return categoryFiltered.filter((product) =>
      selectedVendorIds.includes(product.vendor?._id || product.vendor?.id),
    );
  }, [categoryName, dealProducts, products, selectedVendorIds]);

  const toggleVendor = (vendorId) => {
    setSelectedVendorIds((current) =>
      current.includes(vendorId)
        ? current.filter((entry) => entry !== vendorId)
        : [...current, vendorId],
    );
  };

  if (!categoryName) {
    return (
      <div className="surface-card p-6 text-staps-ink/70">
        Unknown category. Go back to the{" "}
        <Link to="/" className="font-semibold text-staps-orange">
          marketplace home
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 md:space-y-6 md:pb-10">
      <section className="surface-card overflow-hidden p-3.5 sm:p-4 md:p-6">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 md:gap-2.5">
          {marketplaceCategories.map((category) => (
            <NavLink
              key={category}
              to={`/categories/${categoryToSlug(category)}`}
              className={({ isActive }) =>
                `filter-pill shrink-0 ${isActive ? "filter-pill-active" : ""}`
              }
            >
              {category}
            </NavLink>
          ))}
        </div>

        <div className="mt-3 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] bg-[#f8f9fd] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-[2rem] font-bold">{categoryName}</p>
                  <p className="text-sm text-staps-ink/55">
                    {categoryName === "All Categories"
                      ? "Every uploaded vendor product in one place."
                      : categoryName === "Deals"
                        ? "Flash-sale and discounted products across the marketplace."
                        : `Uploaded products from vendors in ${categoryName}.`}
                  </p>
                </div>
                <Link to="/" className="text-sm font-semibold text-staps-ink/45">
                  Home
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-[#f8f9fd] p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-[2rem] font-bold">Vendor stores</p>
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

          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-2 rounded-[1.55rem] bg-gradient-to-r from-[#f7f9ff] via-white to-[#eef4fb] p-4 md:rounded-[2rem] md:p-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#644df0]">
                  Category page
                </p>
                <h1 className="mt-2 font-display text-[1.92rem] font-extrabold leading-[0.98] md:text-4xl">
                  {categoryName}
                </h1>
                <p className="mt-2 text-[0.95rem] text-staps-ink/60 md:text-sm">
                  Browse products in this category with the same marketplace styling as the home page.
                </p>
              </div>
              <p className="text-sm font-semibold text-staps-ink/55">
                {filteredProducts.length} matching product(s)
              </p>
            </div>

            {loading ? (
              <div className="surface-card p-6">Loading category products...</div>
            ) : error ? (
              <div className="surface-card p-6">
                <p className="text-red-600">{error}</p>
                {error === apiUnavailableMessage && (
                  <p className="mt-2 text-sm text-staps-ink/65">
                    The frontend is running, but the backend API is not available yet.
                  </p>
                )}
              </div>
            ) : filteredProducts.length ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product._id || product.id}
                    product={product}
                    featured={index === 0 && categoryName !== "All Categories"}
                  />
                ))}
              </div>
            ) : (
              <div className="surface-card p-6 text-staps-ink/70">
                No products are available in {categoryName} yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
