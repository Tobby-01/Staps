import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getCartItemSubtotal,
  getProductDeliveryFee,
} from "../lib/marketplace.js";

const CartContext = createContext(null);

const clientStateVersion = (import.meta.env.VITE_CLIENT_STATE_VERSION || "2026-test2").trim();
const storageKey = `staps-cart-${clientStateVersion || "2026-test2"}`;
const legacyStorageKeys = ["staps-cart"];
const getItemKeys = (item) => [item?._id, item?.id, item?.cartKey].filter(Boolean).map(String);
const getPrimaryKey = (item) => getItemKeys(item)[0] || null;
const matchesItem = (left, right) => {
  const leftKeys = getItemKeys(left);
  const rightKeys = getItemKeys(right);

  if (!leftKeys.length || !rightKeys.length) {
    return false;
  }

  return leftKeys.some((key) => rightKeys.includes(key));
};

const addItemToList = (current, product) => {
  const productKey = getPrimaryKey(product);
  const existing = current.find((item) => matchesItem(item, product));

  if (existing) {
    return current.map((item) =>
      matchesItem(item, existing)
        ? { ...item, quantity: item.quantity + 1 }
        : item,
    );
  }

  return [...current, { ...product, cartKey: productKey, quantity: 1 }];
};

const removeItemFromList = (current, productId) =>
  current.filter((item) => !getItemKeys(item).includes(String(productId)));

const updateItemQuantityInList = (current, productId, quantity) => {
  const nextQuantity = Math.max(1, Number(quantity) || 1);

  return current.map((item) =>
    getItemKeys(item).includes(String(productId))
      ? { ...item, quantity: nextQuantity }
      : item,
  );
};

const decrementItemInList = (current, product) => {
  const existing = current.find((item) => matchesItem(item, product));
  if (!existing) {
    return current;
  }

  if (existing.quantity <= 1) {
    return current.filter((item) => !matchesItem(item, existing));
  }

  return current.map((item) =>
    matchesItem(item, existing)
      ? { ...item, quantity: item.quantity - 1 }
      : item,
  );
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [cartNotice, setCartNotice] = useState(null);
  const itemsRef = useRef([]);
  const subtotal = items.reduce((sum, item) => sum + getCartItemSubtotal(item), 0);
  const deliveryTotal = items.reduce((sum, item) => sum + getProductDeliveryFee(item), 0);
  const grandTotal = subtotal + deliveryTotal;

  useEffect(() => {
    legacyStorageKeys.forEach((legacyKey) => {
      if (legacyKey !== storageKey) {
        localStorage.removeItem(legacyKey);
      }
    });

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsedItems = JSON.parse(saved);
      itemsRef.current = parsedItems;
      setItems(parsedItems);
    }
  }, []);

  useEffect(() => {
    itemsRef.current = items;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!cartNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCartNotice(null);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [cartNotice]);

  const addToCart = (product) => {
    const nextItems = addItemToList(itemsRef.current, product);
    const nextItem = nextItems.find((item) => matchesItem(item, product));

    itemsRef.current = nextItems;
    setItems(nextItems);
    setCartNotice({
      name: product?.name || "Product",
      quantity: nextItem?.quantity || 1,
    });
  };

  const removeFromCart = (productId) => {
    const nextItems = removeItemFromList(itemsRef.current, productId);
    itemsRef.current = nextItems;
    setItems(nextItems);
  };

  const updateQuantity = (productId, quantity) => {
    const nextItems = updateItemQuantityInList(itemsRef.current, productId, quantity);
    itemsRef.current = nextItems;
    setItems(nextItems);
  };

  const decrementItem = (product) => {
    const nextItems = decrementItemInList(itemsRef.current, product);
    itemsRef.current = nextItems;
    setItems(nextItems);
  };

  const getItemQuantity = (product) =>
    items.find((item) => matchesItem(item, product))?.quantity || 0;

  const clearCart = () => {
    itemsRef.current = [];
    setItems([]);
  };

  const value = {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    deliveryTotal,
    grandTotal,
    addToCart,
    decrementItem,
    removeFromCart,
    updateQuantity,
    getItemQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {cartNotice ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex justify-center sm:justify-end">
          <div
            aria-live="polite"
            className="pointer-events-auto w-full max-w-sm rounded-[1.6rem] border border-white/70 bg-white/95 p-4 shadow-[0_24px_60px_rgba(18,38,32,0.16)] backdrop-blur"
          >
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#6e54ef]">
              Added to cart
            </p>
            <p className="mt-2 text-sm font-semibold text-staps-ink">{cartNotice.name}</p>
            <p className="mt-1 text-sm text-staps-ink/60">
              You now have {cartNotice.quantity} in your cart.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Link
                to="/cart"
                className="inline-flex items-center justify-center rounded-full bg-[#6e54ef] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a49d6]"
              >
                View cart
              </Link>
              <button
                type="button"
                onClick={() => setCartNotice(null)}
                className="text-sm font-semibold text-staps-ink/55 transition hover:text-staps-ink"
              >
                Keep shopping
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
};
