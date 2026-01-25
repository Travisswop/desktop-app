'use client';

import { CATEGORIES, type CategoryId } from '@/constants/polymarket';

interface CategoryTabsProps {
  activeCategory: CategoryId;
  onCategoryChange: (categoryId: CategoryId) => void;
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === category.id
              ? 'bg-blue-600 text-white'
              : 'bg-white/5  hover:bg-white/10'
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
