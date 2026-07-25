'use client';

import {
  CATEGORIES,
  getSportSubcategoryById,
  getSportGroups,
  getGroupIdForSport,
  type CategoryId,
  type SportSubcategoryId,
  type SportSubcategory,
} from '@/constants/polymarket';

const ALL_SPORTS_GROUP_ID = 'all';

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
  /** Selected league id within the active sport (e.g. 'epl'), or null for
   *  "All" leagues. Only sports with a `leagues` list render this row. */
  activeLeagueId?: string | null;
  onLeagueChange?: (leagueId: string | null) => void;
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
  activeSportSub,
  onSportSubChange,
  hideMainTabs = false,
  hideSportSubTabs = false,
  activeLeagueId = null,
  onLeagueChange,
}: CategoryTabsProps) {
  const leagues = getSportSubcategoryById(activeSportSub)?.leagues;
  const sportGroups = getSportGroups();
  const activeGroupId =
    activeSportSub === 'all'
      ? ALL_SPORTS_GROUP_ID
      : (getGroupIdForSport(activeSportSub) ?? activeSportSub);
  const activeGroup = sportGroups.find((g) => g.id === activeGroupId);

  const handleGroupClick = (groupId: string, members: SportSubcategory[]) => {
    if (groupId === ALL_SPORTS_GROUP_ID) {
      onSportSubChange('all');
      return;
    }
    // Multi-member groups (Basketball, Football, Combat) default to their
    // first member on the group tab itself; the second row (below) lets the
    // user pick a different one within that group without another click.
    onSportSubChange(members[0].id);
  };

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

      {/* Sport-group pills — only visible when Sports is active. Each pill is
          an umbrella (Basketball, Football, Combat, ...) or a standalone
          sport with no siblings (Soccer, Tennis, Cricket, ...). */}
      {activeCategory === 'sports' && !hideSportSubTabs && (
        <div className="relative w-full min-w-0">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
          <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
            <div className="flex gap-2 pr-8 w-max">
              <button
                onClick={() => onSportSubChange('all')}
                className={`relative px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 flex items-center gap-1 overflow-hidden border active:scale-95 ${
                  activeSportSub === 'all'
                    ? 'text-white border-black/10'
                    : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:border-gray-400'
                }`}
                style={
                  activeSportSub === 'all'
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
                <span className="relative">🏆</span>
                <span className="relative">All</span>
              </button>
              {sportGroups.map((group) => {
                const isActive = activeGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => handleGroupClick(group.id, group.members)}
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
                    <span className="relative">{group.emoji}</span>
                    <span className="relative">{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sport pills within the active group — only when that group has more
          than one member (e.g. Basketball: NBA/WNBA/Summer League/NCAAB/NCAAW). */}
      {activeCategory === 'sports' &&
        !hideSportSubTabs &&
        activeGroup &&
        activeGroup.members.length > 1 && (
          <div className="relative w-full min-w-0">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
            <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
              <div className="flex gap-1.5 pr-8 w-max">
                {activeGroup.members.map((sub) => {
                  const isActive = activeSportSub === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => onSportSubChange(sub.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 border active:scale-95 ${
                        isActive
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:border-gray-400'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* League pills — only when the active sport has a leagues list */}
      {activeCategory === 'sports' &&
        !hideSportSubTabs &&
        leagues &&
        leagues.length > 0 &&
        onLeagueChange && (
          <div className="relative w-full min-w-0">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
            <div className="overflow-x-scroll scrollbar-x touch-pan-x pb-2">
              <div className="flex gap-1.5 pr-8 w-max">
                <button
                  onClick={() => onLeagueChange(null)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 border active:scale-95 ${
                    activeLeagueId === null
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {leagues.map((league) => {
                  const isActive = activeLeagueId === league.id;
                  return (
                    <button
                      key={league.id}
                      onClick={() => onLeagueChange(league.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 border active:scale-95 ${
                        isActive
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'text-gray-500 border-gray-200 hover:text-gray-800 hover:border-gray-400'
                      }`}
                    >
                      {league.label}
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
