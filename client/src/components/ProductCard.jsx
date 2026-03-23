import { Link } from "react-router-dom";

import { useCart } from "../state/CartContext.jsx";
import { useFavorites } from "../state/FavoritesContext.jsx";
import { VerifiedVendorBadge } from "./VerifiedVendorBadge.jsx";

export const ProductCard = ({ product, featured = false }) => {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const previewImage = product.image || product.images?.[0];
  const favorite = isFavorite(product);
  const currentPrice =
    product.isFlashSale && product.discountPrice && new Date(product.flashSaleEndTime) > new Date()
      ? product.discountPrice
      : product.price;

  return (
    <article
      className={`overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-soft ${
        featured ? "relative bg-gradient-to-br from-[#6e54ef] to-[#8b7bff] text-white" : ""
      }`}
    >
      <div className={`relative ${featured ? "h-64 md:h-72" : "h-52 md:h-56"} ${featured ? "" : "bg-[#f6f8fc]"}`}>
        <button
          type="button"
          onClick={() => toggleFavorite(product)}
          className={`absolute right-4 top-4 z-10 rounded-full px-3 py-2 text-xs font-semibold ${
            featured
              ? "bg-white/90 text-[#6e54ef]"
              : favorite
                ? "bg-[#6e54ef] text-white shadow"
                : "bg-white text-staps-ink/70 shadow"
          }`}
        >
          {favorite ? "Saved" : "Save"}
        </button>
        {previewImage ? (
          <img src={previewImage} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div
            className={`flex h-full items-center justify-center text-sm font-semibold ${
              featured ? "text-white/85" : "text-staps-ink/60"
            }`}
          >
            Product preview
          </div>
        )}
        {product.isFlashSale && !featured && (
          <span className="absolute bottom-4 left-4 rounded-full bg-[#ffe04a] px-3 py-2 text-xs font-bold text-staps-ink">
            Top item
          </span>
        )}
      </div>
      <div className="space-y-4 p-4 md:p-5">
        <div className="space-y-2">
          <h3
            className={`font-display text-2xl font-bold leading-tight ${
              featured ? "max-w-[14rem] text-[1.7rem] text-white md:text-2xl" : "line-clamp-2 text-base text-staps-ink md:text-lg"
            }`}
          >
            {product.name}
          </h3>
          <p className={`text-sm ${featured ? "max-w-[14rem] text-white/80" : "text-staps-ink/70"}`}>
            {product.description}
          </p>
          <div
            className={`flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              featured ? "text-white/70" : "text-staps-ink/45"
            }`}
          >
            <span>{product.category || "Campus picks"}</span>
            <span>by</span>
            <span className="inline-flex items-center gap-2">
              <span>{product.vendor?.name || "Campus vendor"}</span>
              {product.vendor?.verified ? (
                <VerifiedVendorBadge className={featured ? "border-white/30 bg-white/12 text-white" : ""} />
              ) : null}
            </span>
          </div>
        </div>

        <div
          className={`space-y-4 rounded-[1.5rem] border p-4 ${
            featured ? "border-white/18 bg-white/10" : "border-staps-ink/8 bg-[#f8fafc]"
          }`}
        >
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <p
                className={`text-[0.7rem] font-bold uppercase tracking-[0.22em] ${
                  featured ? "text-white/65" : "text-staps-ink/40"
                }`}
              >
                Price
              </p>
              <div
                className={`text-[1.55rem] font-extrabold leading-none ${
                  featured ? "text-white" : "text-staps-ink"
                }`}
              >
                NGN {currentPrice.toLocaleString()}
              </div>
              {currentPrice !== product.price && (
                <p className={`text-sm line-through ${featured ? "text-white/65" : "text-staps-ink/45"}`}>
                  NGN {Number(product.price).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => addToCart(product)}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                featured
                  ? "bg-white text-[#5a49d6] hover:bg-white/90"
                  : "border border-staps-ink/10 bg-white text-staps-ink hover:shadow-md"
              }`}
            >
              Add to cart
            </button>
            <Link
              to="/cart"
              className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                featured
                  ? "border border-white/35 bg-transparent text-white hover:bg-white/10"
                  : "bg-[#6e54ef] text-white hover:bg-[#5a49d6] hover:shadow-md hover:shadow-[#6e54ef]/25"
              }`}
            >
              Checkout now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};
