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
      {/* Main category tabs */}
      <div className="relative w-full min-w-0">
        {/* Right fade gradient — indicates more content to scroll */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
        <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
          <div className="flex gap-2 pr-8 w-max">
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
      </div>

      {/* Sports subcategory pills — only visible when Sports is active */}
      {activeCategory === 'sports' && (
        <div className="relative w-full min-w-0">
          {/* Right fade gradient */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
          <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
            <div className="flex gap-2 pr-8 w-max">
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
        </div>
      )}
    </div>
  );
}
