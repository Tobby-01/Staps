import { Link } from "react-router-dom";

import { VerifiedVendorBadge } from "../components/VerifiedVendorBadge.jsx";
import { useFavorites } from "../state/FavoritesContext.jsx";

export const FavoritesPage = () => {
  const { items } = useFavorites();

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">
          Favourites
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Saved campus picks</h1>
        <p className="mt-2 text-sm text-staps-ink/65">
          Products you save from the marketplace will stay here for quick return visits.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.length ? (
            items.map((product) => (
              <div key={product._id || product.id} className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-soft">
                <div className="h-52 bg-[#f6f8fc]">
                  {product.image || product.images?.[0] ? (
                    <img
                      src={product.image || product.images?.[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-staps-ink/55">
                      Product preview
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-5">
                  <p className="font-display text-xl font-bold text-staps-ink">{product.name}</p>
                  {product.vendor?.name ? (
                    <div className="flex items-center gap-2 text-sm text-staps-ink/65">
                      <span>{product.vendor.name}</span>
                      {product.vendor?.verified ? <VerifiedVendorBadge /> : null}
                    </div>
                  ) : null}
                  <p className="text-sm text-staps-ink/60">{product.category || "Campus picks"}</p>
                  <p className="text-lg font-extrabold text-[#5a49d6]">
                    NGN {Number(product.discountPrice || product.price || 0).toLocaleString()}
                  </p>
                  <Link to="/cart" className="inline-flex rounded-full bg-[#6e54ef] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5a49d6]">
                    View cart
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.75rem] bg-[#f8f9fd] p-6 text-staps-ink/65 md:col-span-2 xl:col-span-3">
              You have not saved any products yet. Tap the save button on a product card to build your shortlist.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
