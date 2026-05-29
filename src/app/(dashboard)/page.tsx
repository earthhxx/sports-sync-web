'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { calendarService } from '@/services/calendar.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import { Calendar as CalendarIcon, MapPin, RefreshCw, Filter, ShieldCheck, CheckSquare, Square, X } from 'lucide-react';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // Sport categories loaded from database
  const [sportsList, setSportsList] = useState<{ id: string; name: string; fullName: string }[]>([]);

  // Fetch sport categories from backend database on mount
  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await calendarService.getSports();
        setSportsList(data);
      } catch (err: any) {
        showToast('error', 'Failed to retrieve sport categories from the database.');
      }
    };
    loadSports();
  }, [showToast]);

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

  // Track last applied filter values to determine when to skip debouncing (e.g. on pagination)
  const lastFiltersRef = React.useRef({
    startDate,
    endDate,
    selectedSportsStr: selectedSports.join(','),
  });

  // Fetch events from calendar using backend-side query parameters (Centralized Service Layer)
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
      // Gracefully ignore requests that were canceled by the AbortController
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

  // Reactively fetch events when filters, page, or limit changes with smart debouncing & abort control
  useEffect(() => {
    const currentSportsStr = selectedSports.join(',');
    const isFilterChanged =
      lastFiltersRef.current.startDate !== startDate ||
      lastFiltersRef.current.endDate !== endDate ||
      lastFiltersRef.current.selectedSportsStr !== currentSportsStr;

    // Update ref cache
    lastFiltersRef.current = {
      startDate,
      endDate,
      selectedSportsStr: currentSportsStr,
    };

    const controller = new AbortController();
    
    // Apply 250ms debounce delay if filters changed to prevent network/db congestion; pagination loads instantly.
    const delay = isFilterChanged ? 250 : 0;

    const timeoutId = setTimeout(() => {
      fetchEvents(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sports: selectedSports.length > 0 ? selectedSports.join(',') : undefined,
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
  }, [startDate, endDate, selectedSports, page, limit, fetchEvents]);

  // Sync Schedules Button


  // Filter Actions
  const handleSportToggle = (sportName: string) => {
    setSelectedSports((prev) => {
      const isSelected = prev.includes(sportName);
      setPage(1); // Reset page on filter toggle
      return isSelected ? prev.filter((s) => s !== sportName) : [...prev, sportName];
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when limit changes
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSports([]);
    setPage(1);
  };

  // Helper: Get unique badge styling for each sport
  const getSportBadgeStyle = (sportName: string) => {
    const name = sportName.toLowerCase();
    if (name.includes('ufc') || name.includes('one')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (name.includes('nba') || name.includes('nrl') || name.includes('nfl')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
    if (name.includes('football') || name.includes('premier') || name.includes('afl')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (name.includes('motogp') || name.includes('nhl') || name.includes('mlb') || name.includes('pga')) {
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 glass-panel rounded-xl glow-teal">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Schedules Dashboard</h1>
          <p className="text-sm text-slate-400">View all permitted sports calendars</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Filter Panel */}
        <div className="lg:col-span-1 glass-panel rounded-xl p-6 self-start space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-400" />
              Filters
            </h3>
            {(startDate || endDate || selectedSports.length > 0) && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-slate-400 hover:text-teal-400 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Date Picker */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Date Range
            </h4>
            <Input
              id="startDate"
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1); // Reset page on date change
              }}
            />
            <Input
              id="endDate"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1); // Reset page on date change
              }}
            />
          </div>

          {/* Sport Selector Checkboxes dynamically from Database */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sport Categories
            </h4>
            {authorizedSports.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No permitted sports configured.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {authorizedSports.map((sport) => {
                  const isChecked = selectedSports.includes(sport.name);
                  return (
                    <button
                      key={sport.name}
                      onClick={() => handleSportToggle(sport.name)}
                      className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white text-left transition-colors cursor-pointer"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4.5 h-4.5 text-teal-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="truncate">{sport.fullName || sport.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member permissions info */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-start gap-2.5 p-3 rounded bg-slate-950/40 border border-slate-900/60 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-500/80 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Strict Permission Lock</p>
                <p className="mt-0.5 leading-relaxed">
                  Only sports you have explicit read permission for are displayed. Unauthorized sports are hidden from view.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Events Grid */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-xl min-h-[300px]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-teal-500 mb-3" />
              <span className="text-sm text-slate-400">Loading schedules...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 glass-panel rounded-xl min-h-[300px] border-dashed border-slate-800">
              <CalendarIcon className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-300">No Match Matches Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                There are no scheduled sports events matching your current filters. Try adjusting dates or categories.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col justify-between gap-4 border-slate-800/60"
                  >
                    <div className="space-y-2">
                      {/* Badge & Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded border ${getSportBadgeStyle(event.sportName)}`}>
                          {event.sportName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(event.startTime)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-white leading-snug tracking-tight">
                        {event.title}
                      </h3>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Location & Times details */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-900/60 pt-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{event.location || 'Online / TBA'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Pagination controls */}
              {meta && meta.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-xl mt-6 border-slate-800/60">
                  {/* Page Info */}
                  <div className="text-xs text-slate-400">
                    Showing page <span className="font-semibold text-slate-200">{meta.page}</span> of{' '}
                    <span className="font-semibold text-slate-200">{meta.totalPages}</span> ({meta.total} matches found)
                  </div>

                  {/* Limit Selection and Buttons */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Show:</span>
                      <select
                        value={limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="bg-slate-950 border border-slate-900 text-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-teal-500/50 cursor-pointer"
                      >
                        <option value={5}>5 items</option>
                        <option value={10}>10 items</option>
                        <option value={20}>20 items</option>
                        <option value={50}>50 items</option>
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
          )}
        </div>
      </div>
    </div>
  );
}
