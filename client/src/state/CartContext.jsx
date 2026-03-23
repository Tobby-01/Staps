import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const storageKey = "staps-cart";
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

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const addToCart = (product) => {
    setItems((current) => {
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
    });
  };

  const removeFromCart = (productId) => {
    setItems((current) =>
      current.filter((item) => !getItemKeys(item).includes(String(productId))),
    );
  };

  const updateQuantity = (productId, quantity) => {
    setItems((current) =>
      current.map((item) =>
        getItemKeys(item).includes(String(productId))
          ? { ...item, quantity: Math.max(1, quantity || 1) }
          : item,
      ),
    );
  };

  const clearCart = () => setItems([]);

  const value = {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
};
