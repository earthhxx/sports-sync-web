'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { calendarService } from '@/services/calendar.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import { Calendar as CalendarIcon, MapPin, Filter, ShieldCheck, Trophy, Zap, Activity, Flame, Award, HelpCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const endOfYearStr = () => {
  const year = new Date().getFullYear();
  return `${year}-12-31`;
};

// Sport Category Groups for Top Row Hierarchy (Event ใหญ่)
const SPORT_GROUPS = [
  {
    id: 'football_rugby',
    name: 'Football & Rugby',
    icon: Trophy,
    sports: ['football (premier league)', 'fifa world cup 2026', 'nrl', 'afl', 'nfl'],
    color: 'bg-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.3)]',
    hoverBorder: 'hover:border-emerald-500/50',
    tabGlow: 'glow-teal',
  },
  {
    id: 'motorsport',
    name: 'Motorsport',
    icon: Zap,
    sports: ['motogp', 'formula 1'],
    color: 'bg-red-600 shadow-[0_4px_20px_rgba(239,68,68,0.3)]',
    hoverBorder: 'hover:border-red-500/50',
    tabGlow: 'glow-red',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: Activity,
    sports: ['nba'],
    color: 'bg-orange-600 shadow-[0_4px_20px_rgba(249,115,22,0.3)]',
    hoverBorder: 'hover:border-orange-500/50',
    tabGlow: 'glow-orange',
  },
  {
    id: 'combat',
    name: 'Combat Sports',
    icon: Flame,
    sports: ['ufc', 'one championship / mma general', 'one championship'],
    color: 'bg-indigo-600 shadow-[0_4px_20px_rgba(79,70,229,0.3)]',
    hoverBorder: 'hover:border-indigo-500/50',
    tabGlow: 'glow-purple',
  },
  {
    id: 'others',
    name: 'Other Sports',
    icon: Award,
    sports: ['pga tour', 'cricket (international)', 'nhl', 'mlb'],
    color: 'bg-blue-600 shadow-[0_4px_20px_rgba(37,99,235,0.3)]',
    hoverBorder: 'hover:border-blue-500/50',
    tabGlow: 'glow-blue',
  },
];

// Helper to determine proximity state & styling based on event start/end times
const getEventProximity = (startTimeStr: string, endTimeStr: string) => {
  const now = new Date();
  const start = new Date(startTimeStr);
  const end = new Date(endTimeStr);

  // Check if same calendar day (Today)
  const isSameDay = start.toDateString() === now.toDateString();

  if (end < now) {
    return {
      status: 'Past Event / unavailable',
      cardStyle: 'border-slate-850 bg-slate-950/45 text-slate-400 opacity-65 hover:opacity-85 hover:border-slate-800',
      badgeStyle: 'bg-slate-900/60 text-slate-500 border-slate-850',
      statusColor: 'text-slate-500 font-medium',
      dotColor: 'bg-slate-650',
    };
  } else if ((start <= now && end >= now) || isSameDay) {
    return {
      status: isSameDay ? 'Next Event / Today' : 'Current Event',
      cardStyle: 'border-emerald-500/40 bg-emerald-950/15 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.06)] hover:border-emerald-500/70',
      badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      statusColor: 'text-emerald-400 font-semibold',
      dotColor: 'bg-emerald-500 animate-pulse',
    };
  } else {
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 14) {
      // Starts within 2 weeks (but not today) -> Show Green (Soon)
      return {
        status: 'Next Event / Soon (< 2 wk)',
        cardStyle: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-100/90 hover:border-emerald-500/60',
        badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        statusColor: 'text-emerald-400 font-semibold',
        dotColor: 'bg-emerald-500',
      };
    } else if (diffDays <= 30) {
      return {
        status: 'Next Event / 2 wk - 1 Month',
        cardStyle: 'border-amber-500/40 bg-amber-950/15 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.06)] hover:border-amber-500/70',
        badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        statusColor: 'text-amber-400 font-semibold',
        dotColor: 'bg-amber-500',
      };
    } else {
      return {
        status: '2+ month Event',
        cardStyle: 'border-slate-700/60 bg-slate-900/50 text-slate-100 hover:border-slate-500/50',
        badgeStyle: 'bg-slate-850 text-slate-300 border-slate-700',
        statusColor: 'text-slate-300 font-medium',
        dotColor: 'bg-slate-400',
      };
    }
  }
};

// Dynamic Sport Logo component using official brand domains with Clearbit Logo API (Stable CDN, no hotlink block)
// Automatically falls back to premium styled Lucide icons if the image fails to load.
const SportLogo: React.FC<{ sportName: string }> = ({ sportName }) => {
  const name = sportName.toLowerCase();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [sportName]);
  
  const logoUrl = useMemo(() => {
    if (name.includes('ufc')) return '/sport-logo/ufc.png';
    if (name.includes('pga')) return '/sport-logo/PGA.png';
    if (name.includes('one championship')) return '/sport-logo/ONE_Championship_company_logo.png';
    if (name.includes('nrl')) return '/sport-logo/NRL.png';
    if (name.includes('nba')) return '/sport-logo/NBA.png';
    if (name.includes('motogp')) return '/sport-logo/motogp.png';
    if (name.includes('premier') || name.includes('football (premier league)')) return '/sport-logo/Premier.png';
    if (name.includes('cricket')) return '/sport-logo/Cricket.png';
    if (name.includes('afl')) return '/sport-logo/afl.png';
    if (name.includes('nfl')) return '/sport-logo/NFL.png';
    if (name.includes('nhl')) return '/sport-logo/nhl.png';
    if (name.includes('mlb')) return '/sport-logo/Major_League_Baseball.svg.png';
    if (name.includes('fifa') || name.includes('world cup')) return '/sport-logo/fifa.jpg';
    if (name.includes('formula 1') || name.includes('f1')) return '/sport-logo/formula-1.png';
    return null;
  }, [name]);

  const designFallback = useMemo(() => {
    if (name.includes('ufc') || name.includes('one championship') || name.includes('combat')) {
      return { Icon: Flame, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    }
    if (name.includes('motogp') || name.includes('formula 1') || name.includes('f1') || name.includes('motorsport')) {
      return { Icon: Zap, color: 'text-red-500 bg-red-500/10 border-red-500/20' };
    }
    if (name.includes('nba') || name.includes('basketball')) {
      return { Icon: Activity, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    }
    if (name.includes('premier') || name.includes('football') || name.includes('soccer') || name.includes('fifa') || name.includes('world cup')) {
      return { Icon: Trophy, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (name.includes('nrl') || name.includes('afl') || name.includes('nfl') || name.includes('rugby')) {
      return { Icon: Trophy, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' };
    }
    return { Icon: Award, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
  }, [name]);

  if (!logoUrl || hasError) {
    const FallbackIcon = designFallback.Icon;
    return (
      <div className={`w-full h-full p-3 flex items-center justify-center border rounded-xl ${designFallback.color}`}>
        <FallbackIcon className="w-8 h-8 stroke-[1.8]" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full p-2 flex items-center justify-center bg-white rounded-xl border border-slate-700/50 shadow-inner">
      <img
        src={logoUrl}
        alt={`${sportName} logo`}
        className="max-w-full max-h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  // Active Sport Group: 'football_rugby' | 'motorsport' | 'basketball' | 'combat' | 'others'
  const [activeTab, setActiveTab] = useState<string>('football_rugby');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(endOfYearStr());
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportsAvailability, setSportsAvailability] = useState<{ sportName: string; count: number }[] | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // Sport categories loaded from database
  const [sportsList, setSportsList] = useState<{ id: string; name: string; fullName: string; calendarIds?: string[] }[]>([]);

  // Fetch sport categories from backend database on mount
  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await calendarService.getSports();
        setSportsList(data);
        if (data.length > 0) {
          // Select all by default
          setSelectedSports(data.map((s: any) => s.name));
        }
      } catch (err: any) {
        showToast('error', 'Failed to retrieve sport categories from the database.');
      }
    };
    loadSports();
  }, [showToast]);

  // Fetch sports availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const data = await calendarService.getSportsAvailability(startDate, endDate);
        setSportsAvailability(data);
      } catch (err) {
        console.error('Failed to fetch sports availability', err);
        setSportsAvailability(null);
      }
    };
    fetchAvailability();
  }, [startDate, endDate]);

  // Determine authorized sports based on user roles, permissions, and database sports list
  const authorizedSports = useMemo(() => {
    if (!user) return [];
    if (user.roles?.includes('ADMIN') || user.permissions?.includes('manage:all')) {
      return sportsList;
    }
    const permittedSportNames = (user.permissions || [])
      .filter((perm) => perm.startsWith('read:sport:'))
      .map((perm) => perm.replace('read:sport:', '').toLowerCase());

    return sportsList.filter((sport) =>
      permittedSportNames.includes(sport.name.toLowerCase())
    );
  }, [sportsList, user]);

  // Get active sport group metadata
  const activeGroup = useMemo(() => {
    return SPORT_GROUPS.find((g) => g.id === activeTab) || SPORT_GROUPS[0];
  }, [activeTab]);

  // Filter authorized sports belonging to the active group (to show in the second row)
  const groupSports = useMemo(() => {
    return authorizedSports.filter((sport) =>
      activeGroup.sports.includes(sport.name.toLowerCase())
    );
  }, [authorizedSports, activeGroup]);

  // Filter selected sports belonging to the active group (to query API)
  const activeGroupSelectedSports = useMemo(() => {
    return selectedSports.filter((sportName) =>
      activeGroup.sports.includes(sportName.toLowerCase())
    );
  }, [selectedSports, activeGroup]);

  // Track last applied filter values to determine when to skip debouncing (e.g. on pagination)
  const lastFiltersRef = React.useRef({
    startDate,
    endDate,
    selectedSportsStr: '',
  });

  // Fetch events from calendar using backend-side query parameters
  const fetchEvents = useCallback(async (
    filters: { startDate?: string; endDate?: string; sports?: string; page: number; limit: number },
    signal?: AbortSignal
  ) => {
    setIsLoading(true);
    try {
      const response = await calendarService.getEvents(filters, { signal });
      
      if (response && response.data && response.meta) {
        setEvents(response.data);
        setMeta(response.meta);
      } else {
        setEvents(Array.isArray(response) ? response : response.data || []);
        setMeta(null);
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      showToast('error', 'Failed to retrieve sports schedules.');
    } finally {
      if (!signal || !signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [showToast]);

  // Reactively fetch events when filters, page, or limit changes
  useEffect(() => {
    if (activeGroupSelectedSports.length === 0) {
      setEvents([]);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    const currentSportsStr = activeGroupSelectedSports.join(',');
    const isFilterChanged =
      lastFiltersRef.current.startDate !== startDate ||
      lastFiltersRef.current.endDate !== endDate ||
      lastFiltersRef.current.selectedSportsStr !== currentSportsStr;

    lastFiltersRef.current = {
      startDate,
      endDate,
      selectedSportsStr: currentSportsStr,
    };

    const controller = new AbortController();
    const delay = isFilterChanged ? 250 : 0;

    const timeoutId = setTimeout(() => {
      fetchEvents(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sports: activeGroupSelectedSports.join(','),
          page,
          limit,
        },
        controller.signal
      );
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [startDate, endDate, activeGroupSelectedSports, page, limit, fetchEvents]);

  // Toggles for active sub-categories
  const handleSportToggle = (sportName: string) => {
    setSelectedSports((prev) => {
      const isSelected = prev.includes(sportName);
      setPage(1);
      return isSelected ? prev.filter((s) => s !== sportName) : [...prev, sportName];
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStartDate(todayStr());
    setEndDate(endOfYearStr());
    setSelectedSports(sportsList.map((s) => s.name));
    setPage(1);
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    
    const formattedStart = start.toLocaleDateString('en-GB', options).toUpperCase();
    const formattedEnd = end.toLocaleDateString('en-GB', options).toUpperCase();
    
    if (formattedStart === formattedEnd) {
      return formattedStart;
    }
    return `${formattedStart} - ${formattedEnd}`;
  };

  const getEventLogoText = (name: string) => {
    if (!name) return 'SP';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Category Tabs (Top level Event Types: groups of sports) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-1.5 bg-slate-900/60 rounded-2xl border border-slate-800">
        {SPORT_GROUPS.map((group) => {
          const Icon = group.icon;
          const isActive = activeTab === group.id;
          return (
            <button
              key={group.id}
              onClick={() => {
                setActiveTab(group.id);
                setPage(1);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                isActive
                  ? `${group.color} text-white`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="truncate">{group.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-categories row (Open/Close Filters) */}
      <div className="glass-panel rounded-2xl p-5 border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            Filter Sub-categories
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/40"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How it works?
            </button>
            <span className="text-xs text-slate-500 hidden sm:inline">Toggle sub-events below</span>
          </div>
        </div>

        {/* Dynamic Category List depending on Selected Tab */}
        <div className="flex flex-wrap gap-2.5">
          {groupSports.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No leagues available for this category.</span>
          ) : (
            groupSports.map((sport) => {
              const hasEvents = sportsAvailability === null || sportsAvailability.some(a => a.sportName.toLowerCase() === sport.name.toLowerCase() && a.count > 0);
              const isUnavailable = sportsAvailability !== null && !hasEvents;
              const isUnfinished = sport.calendarIds?.length === 0;
              const isDisabled = isUnavailable || isUnfinished;
              const isChecked = selectedSports.includes(sport.name) && !isDisabled;

              return (
                <button
                  key={sport.name}
                  onClick={() => !isDisabled && handleSportToggle(sport.name)}
                  disabled={isDisabled}
                  className={`px-4.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-200 ${
                    isChecked
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : isDisabled
                      ? 'bg-slate-900/45 text-slate-655 border-slate-950 cursor-not-allowed opacity-50'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {sport.fullName || sport.name}
                  {isUnfinished && ' (Soon)'}
                  {isUnavailable && !isUnfinished && ' (Empty)'}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Date Pickers - Collapsible or Inline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 glass-panel rounded-2xl p-4 border-slate-800">
        <Input
          id="startDate"
          type="date"
          label="Start Date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
        />
        <Input
          id="endDate"
          type="date"
          label="End Date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* 3. Main Body: Grid of color-coded cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 glass-panel rounded-2xl min-h-[300px]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500 mb-3" />
            <span className="text-sm text-slate-400">Retrieving events data...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-16 glass-panel rounded-2xl min-h-[300px] border-dashed border-slate-800">
            <CalendarIcon className="w-14 h-14 text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300">No Events Scheduled</h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              No matching events found. Try adjusting dates or selection toggles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {events.map((event) => {
              const prox = getEventProximity(event.startTime, event.endTime);
              return (
                <div
                  key={event.id}
                  className={`flex flex-col sm:flex-row items-stretch border rounded-2xl p-5 gap-4 transition-all duration-300 ${prox.cardStyle}`}
                >
                  {/* Left Block: Sport/Event Logo or graphic */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-800/40 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center flex-shrink-0 self-center overflow-hidden">
                    <SportLogo sportName={event.sportName} />
                  </div>

                  {/* Right Block: Content Details */}
                  <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
                    <div>
                      {/* Subtitle / Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-slate-900/60 border border-slate-800 text-slate-300">
                          {event.sportName}
                        </span>
                        
                        {/* Live/Status dot */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${prox.dotColor}`} />
                          <span className={`text-[10px] uppercase tracking-wider ${prox.statusColor}`}>
                            {prox.status}
                          </span>
                        </div>
                      </div>

                      {/* Main Title */}
                      <h3 className="text-lg font-bold text-white tracking-tight mt-1.5 line-clamp-1">
                        {event.title}
                      </h3>

                      {/* Date Range format */}
                      <p className="text-sm font-semibold text-slate-300 mt-1">
                        {formatDateRange(event.startTime, event.endTime)}
                      </p>

                      {/* Short Description */}
                      {event.description && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-900/30">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{event.location || 'Online / TBA'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls for Live DB Sports */}
        {meta && meta.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-2xl mt-6 border-slate-800/60">
            <div className="text-xs text-slate-400">
              Showing page <span className="font-semibold text-slate-200">{meta.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{meta.totalPages}</span> ({meta.total} matches)
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-900 text-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value={6}>6 items</option>
                  <option value={10}>10 items</option>
                  <option value={20}>20 items</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="py-1 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                  className="py-1 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog explaining proximity logic */}
      <Dialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Event Card Color Proximity Logic"
        maxWidth="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-400 leading-relaxed">
            The calendar database stores the exact start and end times of each match. 
            When you open the dashboard, JavaScript calculates the remaining time in real-time and classifies each event into one of the following categories:
          </p>

          <div className="space-y-3.5">
            {/* Green (Today) */}
            <div className="flex items-start gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-emerald-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-505 animate-pulse mt-1.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-400">Current / Today Event (Green 🟢)</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  The match is currently happening live, OR is scheduled to start later today.
                </p>
              </div>
            </div>

            {/* Green (Soon) */}
            <div className="flex items-start gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/5 text-emerald-100/90">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-505 mt-1.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-400">Next Event / Soon (Green 🟢)</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  The match is scheduled within the next 2 weeks (1 to 14 days).
                </p>
              </div>
            </div>

            {/* Yellow */}
            <div className="flex items-start gap-4 p-3 rounded-xl border border-amber-500/20 bg-amber-950/10 text-amber-100">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-505 mt-1.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-amber-400">Next Event / 2 wk - 1 Month (Yellow 🟡)</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  The match is scheduled between 15 to 30 days in the future.
                </p>
              </div>
            </div>

            {/* White */}
            <div className="flex items-start gap-4 p-3 rounded-xl border border-slate-700 bg-slate-900/40 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-slate-350">2+ Month Event (White ⚪)</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  The match is scheduled further out, more than 30 days away.
                </p>
              </div>
            </div>

            {/* Grey */}
            <div className="flex items-start gap-4 p-3 rounded-xl border border-slate-850 bg-slate-950/40 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-slate-400">Past Event / Unavailable (Grey ⚫)</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  The match has already ended or is unavailable.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="px-5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/50 rounded-xl"
            >
              Got it
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}


