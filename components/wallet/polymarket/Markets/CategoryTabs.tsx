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
  /** Hide the top-level category row but keep sport sub-tabs (used in
   *  the predictions panel's category drill-down view). */
  hideMainTabs?: boolean;
  /** Also hide the sports sub-tab row — used by the A2 drill-down view
   *  in PredictionsPanel which renders its own A2-styled league tabs. */
  hideSportSubTabs?: boolean;
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
  activeSportSub,
  onSportSubChange,
  hideMainTabs = false,
  hideSportSubTabs = false,
}: CategoryTabsProps) {
  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Main category tabs */}
      {!hideMainTabs && (
      <div className="relative w-full min-w-0">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
        <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
          <div className="flex gap-2 pr-8 w-max">
            {CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  className={`relative px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 overflow-hidden border active:scale-95 ${
                    isActive
                      ? 'text-white border-black/10'
                      : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:border-gray-400'
                  }`}
                  style={
                    isActive
                      ? {
                          background:
                            'linear-gradient(160deg, rgba(40,40,40,0.92) 0%, rgba(10,10,10,0.88) 100%)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.22)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.6)',
                          backdropFilter: 'blur(6px)',
                          WebkitBackdropFilter: 'blur(6px)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,1)',
                        }
                  }
                >
                  {isActive && (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                  )}
                  <span className="relative">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Sports subcategory pills — only visible when Sports is active */}
      {activeCategory === 'sports' && !hideSportSubTabs && (
        <div className="relative w-full min-w-0">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
          <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
            <div className="flex gap-2 pr-8 w-max">
              {SPORT_SUBCATEGORIES.map((sub) => {
                const isActive = activeSportSub === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onSportSubChange(sub.id)}
                    className={`relative px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 flex items-center gap-1 overflow-hidden border active:scale-95 ${
                      isActive
                        ? 'text-white border-black/10'
                        : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:border-gray-400'
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              'linear-gradient(160deg, rgba(40,40,40,0.92) 0%, rgba(10,10,10,0.88) 100%)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            boxShadow:
                              'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.22)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.6)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,1)',
                          }
                    }
                  >
                    {isActive && (
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                    )}
                    <span className="relative">{sub.emoji}</span>
                    <span className="relative">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
