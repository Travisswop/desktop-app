'use client';

import {
  CATEGORIES,
  SPORT_SUBCATEGORIES,
  type CategoryId,
  type SportSubcategoryId,
} from '@/constants/polymarket';

interface CategoryTabsProps {
  activeCategory: CategoryId;
  onCategoryChange: (categoryId: CategoryId) => void;
  activeSportSub: SportSubcategoryId;
  onSportSubChange: (subId: SportSubcategoryId) => void;
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
  activeSportSub,
  onSportSubChange,
}: CategoryTabsProps) {
  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Main category tabs — bounded outer div scrolls, inner expands freely */}
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-1 w-max">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                activeCategory === category.id
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sports subcategory pills — only visible when Sports is active */}
      {activeCategory === 'sports' && (
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1 w-max">
            {SPORT_SUBCATEGORIES.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onSportSubChange(sub.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1 ${
                  activeSportSub === sub.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span>{sub.emoji}</span>
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
