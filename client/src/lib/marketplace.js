export const marketplaceCategories = [
  "All Categories",
  "Deals",
  "Campus Tech",
  "Fashion",
  "Health & Wellness",
  "Art",
  "Sport",
  "Music",
  "Gaming",
  "Food",
  "Books",
  "Accessories",
];

export const categoryToSlug = (category) =>
  category.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-");

export const slugToCategory = (slug) => {
  const normalized = slug.toLowerCase();
  return (
    marketplaceCategories.find((category) => categoryToSlug(category) === normalized) || null
  );
};
