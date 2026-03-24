export const DEFAULT_DELIVERY_FEE = 200;
export const MIN_DELIVERY_FEE = 200;
export const MAX_DELIVERY_FEE = 700;
export const marketplaceCategories = [
  "All Categories",
  "Deals",
  "Fashion",
  "Campus Tech",
  "Sport",
  "Food",
  "Books",
  "Accessories",
  "Health & Wellness",
  "Music",
  "Gaming",
  "Art",
];

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  maximumFractionDigits: 0,
});

const clampDeliveryFee = (value) =>
  Math.min(MAX_DELIVERY_FEE, Math.max(MIN_DELIVERY_FEE, Math.round(value)));

export const categoryToSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categorySlugMap = new Map(
  marketplaceCategories.map((category) => [categoryToSlug(category), category]),
);

export const slugToCategory = (slug = "") => categorySlugMap.get(categoryToSlug(slug)) || "";

export const formatNaira = (value) => {
  const amount = Number(value);
  return nairaFormatter.format(Number.isFinite(amount) ? amount : 0);
};

export const getProductBasePrice = (product) => {
  const price = Number(product?.price || 0);
  return Number.isFinite(price) ? price : 0;
};

export const getProductActivePrice = (product) => {
  const basePrice = getProductBasePrice(product);
  const flashSalePrice = Number(product?.discountPrice);
  const flashSaleEndTime = product?.flashSaleEndTime ? new Date(product.flashSaleEndTime) : null;
  const hasActiveFlashSale =
    product?.isFlashSale &&
    Number.isFinite(flashSalePrice) &&
    flashSalePrice > 0 &&
    flashSaleEndTime &&
    !Number.isNaN(flashSaleEndTime.getTime()) &&
    flashSaleEndTime > new Date();

  return hasActiveFlashSale ? flashSalePrice : basePrice;
};

export const getProductDeliveryFee = (product) => {
  const deliveryFee = Number(product?.deliveryFee);
  if (!Number.isFinite(deliveryFee)) {
    return DEFAULT_DELIVERY_FEE;
  }

  return clampDeliveryFee(deliveryFee);
};

export const getCartItemSubtotal = (item) => {
  const quantityValue = Number(item?.quantity);
  const quantity =
    Number.isFinite(quantityValue) && quantityValue > 0 ? Math.round(quantityValue) : 1;
  return getProductActivePrice(item) * quantity;
};

export const getCartItemTotal = (item) => getCartItemSubtotal(item) + getProductDeliveryFee(item);
