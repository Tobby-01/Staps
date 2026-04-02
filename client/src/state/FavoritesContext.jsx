import { createContext, useContext, useEffect, useState } from "react";

const FavoritesContext = createContext(null);

const clientStateVersion = (import.meta.env.VITE_CLIENT_STATE_VERSION || "2026-test2").trim();
const storageKey = `staps-favorites-${clientStateVersion || "2026-test2"}`;
const legacyStorageKeys = ["staps-favorites"];
const getItemKeys = (item) => [item?._id, item?.id, item?.favoriteKey].filter(Boolean).map(String);
const matchesItem = (left, right) => {
  const leftKeys = getItemKeys(left);
  const rightKeys = getItemKeys(right);

  if (!leftKeys.length || !rightKeys.length) {
    return false;
  }

  return leftKeys.some((key) => rightKeys.includes(key));
};

export const FavoritesProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    legacyStorageKeys.forEach((legacyKey) => {
      if (legacyKey !== storageKey) {
        localStorage.removeItem(legacyKey);
      }
    });

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const toggleFavorite = (product) => {
    setItems((current) => {
      const favoriteKey = getItemKeys(product)[0] || null;
      const exists = current.some((item) => matchesItem(item, product));

      if (exists) {
        return current.filter((item) => !matchesItem(item, product));
      }

      return [...current, { ...product, favoriteKey }];
    });
  };

  const isFavorite = (product) => items.some((item) => matchesItem(item, product));
  const clearFavorites = () => setItems([]);

  return (
    <FavoritesContext.Provider
      value={{
        items,
        count: items.length,
        toggleFavorite,
        isFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }

  return context;
};
