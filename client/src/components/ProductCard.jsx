import { MinusSmallIcon, PlusSmallIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

import { resolveAssetUrl } from "../lib/api.js";
import {
  formatNaira,
  getProductActivePrice,
  getProductBasePrice,
  getProductDeliveryFee,
} from "../lib/marketplace.js";
import { useAuth } from "../state/AuthContext.jsx";
import { useCart } from "../state/CartContext.jsx";
import { useFavorites } from "../state/FavoritesContext.jsx";
import { VerifiedVendorBadge } from "./VerifiedVendorBadge.jsx";

export const ProductCard = ({ product, featured = false }) => {
  const { user } = useAuth();
  const { addToCart, decrementItem, getItemQuantity } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const isVendorAccount = user?.role === "vendor";
  const previewImage = resolveAssetUrl(product.image || product.images?.[0]);
  const cartQuantity = getItemQuantity(product);
  const favorite = isFavorite(product);
  const basePrice = getProductBasePrice(product);
  const activePrice = getProductActivePrice(product);
  const deliveryFee = getProductDeliveryFee(product);
  const hasDiscount = Number.isFinite(basePrice) && Number.isFinite(activePrice) && activePrice < basePrice;
  const discountPercent =
    hasDiscount && basePrice > 0 ? Math.round(((basePrice - activePrice) / basePrice) * 100) : 0;
  const vendorName = product.vendor?.name || "Campus vendor";
  const categoryName = product.category || "Campus picks";
  const createdAtMs = product.createdAt ? new Date(product.createdAt).getTime() : Number.NaN;
  const isNewListing =
    Number.isFinite(createdAtMs) &&
    Date.now() >= createdAtMs &&
    Date.now() - createdAtMs <= 10 * 60 * 1000;

  const renderQuantityControl = ({ featuredMode = false, mobile = false } = {}) => (
    <div
      className={`grid items-center rounded-2xl ${
        mobile
          ? "grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-1.5 p-1"
          : "grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] gap-1.5 p-1.5"
      } ${
        featuredMode
          ? "bg-white text-[#5a49d6]"
          : mobile
            ? "border border-[#d9ddff] bg-[#eef0ff]"
            : "border border-staps-ink/10 bg-white text-staps-ink"
      }`}
    >
      <button
        type="button"
        onClick={() => decrementItem(product)}
        className={`inline-flex items-center justify-center rounded-[1rem] transition ${
          mobile ? "h-10 w-10" : "h-9 w-9"
        } ${
          featuredMode ? "bg-[#f1edff] text-[#5a49d6]" : "bg-white text-staps-ink shadow-sm"
        }`}
        aria-label={`Remove one ${product.name} from cart`}
      >
        <MinusSmallIcon className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p
          className={`font-bold uppercase ${
            mobile
              ? "text-[0.58rem] tracking-[0.16em]"
              : "whitespace-nowrap text-[0.56rem] leading-tight tracking-[0.14em]"
          } ${
            featuredMode ? "text-[#7c68ee]" : "text-staps-ink/45"
          }`}
        >
          In cart
        </p>
        <p className={mobile ? "text-[0.86rem] font-semibold leading-tight" : "text-sm font-semibold"}>
          {cartQuantity} item{cartQuantity === 1 ? "" : "s"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => addToCart(product)}
        className={`inline-flex items-center justify-center rounded-[1rem] transition ${
          mobile ? "h-10 w-10" : "h-9 w-9"
        } ${
          featuredMode
            ? "bg-[#5a49d6] text-white"
            : mobile
              ? "bg-[#6e54ef] text-white shadow-[0_10px_20px_rgba(110,84,239,0.22)]"
              : "bg-[#6e54ef] text-white shadow-[0_10px_20px_rgba(110,84,239,0.22)]"
        }`}
        aria-label={`Add one more ${product.name} to cart`}
      >
        <PlusSmallIcon className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <article
      className={`overflow-hidden rounded-[1.45rem] border border-white/70 bg-white shadow-soft transition duration-300 md:rounded-[2rem] md:hover:-translate-y-1 md:hover:shadow-[0_24px_48px_rgba(18,38,32,0.12)] ${
        featured
          ? "md:relative md:col-span-2 md:bg-gradient-to-br md:from-[#6e54ef] md:to-[#8b7bff] md:text-white xl:col-span-1"
          : ""
      }`}
    >
      <div
        className={`relative aspect-square ${featured ? "md:h-72 md:aspect-auto" : "md:h-56 md:aspect-auto"} ${
          featured ? "md:bg-transparent" : "bg-[#f6f8fc]"
        }`}
      >
        {!isVendorAccount ? (
          <button
            type="button"
            onClick={() => toggleFavorite(product)}
            className={`absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold backdrop-blur transition md:right-4 md:top-4 md:h-auto md:w-auto md:gap-2 md:px-3.5 md:py-2 ${
              featured
                ? "border-white/30 bg-white/90 text-[#6e54ef] md:bg-white/90"
                : favorite
                  ? "border-transparent bg-[#6e54ef] text-white shadow"
                  : "border-staps-ink/10 bg-white/92 text-staps-ink/70 shadow"
            }`}
            aria-label={favorite ? "Remove from saved items" : "Save item"}
          >
            {favorite ? <HeartSolidIcon className="h-4 w-4" /> : <HeartOutlineIcon className="h-4 w-4" />}
            <span className="hidden md:inline">{favorite ? "Saved" : "Save"}</span>
          </button>
        ) : null}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 md:left-4 md:top-4">
          {isNewListing ? (
            <span className="rounded-full bg-gradient-to-r from-[#122620] to-[#2f5a4f] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white shadow-sm md:px-3 md:py-1.5 md:text-[0.72rem]">
              New
            </span>
          ) : null}
          {discountPercent ? (
            <span className="rounded-xl bg-[#fff1df] px-2.5 py-1 text-[0.72rem] font-bold text-[#ed6a2f] shadow-sm md:px-3 md:py-1.5 md:text-xs">
              -{discountPercent}%
            </span>
          ) : product.isFlashSale && !featured ? (
            <span className="rounded-full bg-[#ffe04a] px-2.5 py-1 text-[0.72rem] font-bold text-staps-ink md:px-3 md:py-2 md:text-xs">
              Top item
            </span>
          ) : null}
        </div>
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
      </div>

      <div className="space-y-3 p-3 md:hidden">
        <div className="space-y-1.5">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-staps-ink/38">
            {categoryName}
          </p>
          <h3 className="line-clamp-2 min-h-[2.6rem] text-[0.98rem] font-semibold leading-5 text-staps-ink">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[0.78rem] text-staps-ink/58">
            <span className="truncate">{vendorName}</span>
            {product.vendor?.verified ? <VerifiedVendorBadge className="origin-left scale-[0.82]" /> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[1.15rem] font-extrabold leading-none text-staps-ink">
            NGN {formatNaira(activePrice)}
          </p>
          {hasDiscount ? (
            <p className="text-[0.78rem] text-staps-ink/38 line-through">NGN {formatNaira(basePrice)}</p>
          ) : (
            <div className="h-4" />
          )}
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-staps-ink/42">
            Delivery from NGN {formatNaira(deliveryFee)}
          </p>
        </div>

        {isVendorAccount ? (
          <Link
            to="/signup"
            className="inline-flex w-full items-center justify-center rounded-[1rem] bg-[#6e54ef] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a49d6]"
          >
            Shop now
          </Link>
        ) : (
          cartQuantity ? (
            renderQuantityControl({ mobile: true })
          ) : (
            <button
              type="button"
              onClick={() => addToCart(product)}
              className="w-full rounded-[1rem] bg-gradient-to-r from-[#6e54ef] to-[#9186ff] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(110,84,239,0.24)] transition hover:brightness-[1.03]"
            >
              Add to cart
            </button>
          )
        )}
      </div>

      <div className="hidden space-y-4 p-4 md:block md:p-5">
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
            <span>{categoryName}</span>
            <span>by</span>
            <span className="inline-flex items-center gap-2">
              <span>{vendorName}</span>
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
                NGN {formatNaira(activePrice)}
              </div>
              {hasDiscount ? (
                <p className={`text-sm line-through ${featured ? "text-white/65" : "text-staps-ink/45"}`}>
                  NGN {formatNaira(basePrice)}
                </p>
              ) : null}
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${featured ? "text-white/72" : "text-staps-ink/45"}`}>
                Delivery from NGN {formatNaira(deliveryFee)}
              </p>
            </div>
          </div>

          {isVendorAccount ? (
            <div className="space-y-2">
              <p className={`text-xs ${featured ? "text-white/75" : "text-staps-ink/55"}`}>
                Vendor accounts cannot shop. Create a separate shopper profile to buy products.
              </p>
              <Link
                to="/signup"
                className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                  featured
                    ? "bg-white text-[#5a49d6] hover:bg-white/90"
                    : "bg-[#6e54ef] text-white hover:bg-[#5a49d6] hover:shadow-md hover:shadow-[#6e54ef]/25"
                }`}
              >
                Shop now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              {cartQuantity ? (
                renderQuantityControl({ featuredMode: featured })
              ) : (
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
              )}
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
          )}
        </div>
      </div>
    </article>
  );
};
