'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { calendarService } from '@/services/calendar.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import {
  Calendar as CalendarIcon,
  MapPin,
  Filter,
  ShieldCheck,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
  Sparkles,
  CalendarDays
} from 'lucide-react';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const weekLaterStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

/** Sport-specific accent colour tokens */
const getSportAccent = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('football') || n.includes('premier') || n.includes('afl') || n.includes('soccer')) return 'border-blue-500/40 bg-blue-500/10 text-blue-400 checked:bg-blue-500';
  if (n.includes('nba') || n.includes('basketball')) return 'border-orange-500/40 bg-orange-500/10 text-orange-400';
  if (n.includes('nfl') || n.includes('rugby') || n.includes('nrl')) return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
  if (n.includes('ufc') || n.includes('mma') || n.includes('one')) return 'border-red-500/40 bg-red-500/10 text-red-400';
  if (n.includes('motogp') || n.includes('motor')) return 'border-rose-500/40 bg-rose-500/10 text-rose-400';
  if (n.includes('nhl') || n.includes('hockey')) return 'border-sky-500/40 bg-sky-500/10 text-sky-400';
  if (n.includes('mlb') || n.includes('baseball')) return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400';
  if (n.includes('cricket')) return 'border-lime-500/40 bg-lime-500/10 text-lime-400';
  if (n.includes('golf') || n.includes('pga')) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
  return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400';
};

const getSportIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('football') || n.includes('premier') || n.includes('soccer') || n.includes('afl')) return '⚽';
  if (n.includes('nba') || n.includes('basketball')) return '🏀';
  if (n.includes('nfl')) return '🏈';
  if (n.includes('nrl') || n.includes('rugby')) return '🏉';
  if (n.includes('ufc') || n.includes('mma') || n.includes('one')) return '🥊';
  if (n.includes('motogp') || n.includes('motor')) return '🏍️';
  if (n.includes('nhl') || n.includes('hockey')) return '🏒';
  if (n.includes('mlb') || n.includes('baseball')) return '⚾';
  if (n.includes('cricket')) return '🏏';
  if (n.includes('golf') || n.includes('pga')) return '⛳';
  return '🏅';
};

export default function SportsCalendar() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekLaterStr());
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportsAvailability, setSportsAvailability] = useState<{ sportName: string; count: number }[] | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // Sport categories
  const [sportsList, setSportsList] = useState<{ id: string; name: string; fullName: string; isActive?: boolean; calendarIds?: string[] }[]>([]);

  // Load sports list
  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await calendarService.getSports();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setSportsList(list);

        // Pre-select permitted active sports with calendar IDs by default
        const permittedList = (() => {
          if (!user) return [];
          if (user.roles?.includes('ADMIN') || user.permissions?.includes('manage:all')) {
            return list;
          }
          const permittedSportNames = (user.permissions || [])
            .filter((perm: string) => perm.startsWith('read:sport:'))
            .map((perm: string) => perm.replace('read:sport:', '').toLowerCase());

          return list.filter((sport: any) =>
            permittedSportNames.includes(sport.name.toLowerCase())
          );
        })();

        const selectableList = permittedList.filter((s: any) => s.isActive && (s.calendarIds?.length || 0) > 0);
        setSelectedSports(selectableList.map((s: any) => s.name));
      } catch (err: any) {
        showToast('error', 'Failed to retrieve sport categories.');
      }
    };
    loadSports();
  }, [showToast, user]);

  // Load sports availability
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

  const fetchEvents = useCallback(async (filters?: { startDate?: string; endDate?: string; sports?: string; page?: number; limit?: number }) => {
    setIsLoading(true);
    try {
      const queryParams = {
        ...filters,
        page: filters?.page ?? page,
        limit: filters?.limit ?? limit,
      };
      const response = await calendarService.getEvents(queryParams);

      if (response && response.data && response.meta) {
        setEvents(response.data);
        setMeta(response.meta);
      } else {
        const items = Array.isArray(response) ? response : response?.data || [];
        setEvents(items);
        setMeta({
          total: items.length,
          page: queryParams.page,
          limit: queryParams.limit,
          totalPages: Math.ceil(items.length / queryParams.limit) || 1,
        });
      }
    } catch (err: unknown) {
      showToast('error', 'Failed to retrieve sports schedules.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, showToast]);

  // Real-time fetch trigger
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEvents({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sports: selectedSports.length > 0 ? selectedSports.join(',') : undefined,
        page,
        limit,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [startDate, endDate, selectedSports, page, limit, fetchEvents]);

  const handleSportToggle = (sportName: string) => {
    setSelectedSports((prev) => {
      setPage(1);
      return prev.includes(sportName)
        ? prev.filter((s) => s !== sportName)
        : [...prev, sportName];
    });
  };

  const handleSelectAll = () => {
    const selectableSports = authorizedSports
      .filter((s) => {
        if (!s.isActive || (s.calendarIds?.length || 0) === 0) return false;
        if (sportsAvailability !== null) {
          const hasEvents = sportsAvailability.some(a => a.sportName.toLowerCase() === s.name.toLowerCase() && a.count > 0);
          if (!hasEvents) return false;
        }
        return true;
      })
      .map((s) => s.name);
    setSelectedSports(selectableSports);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedSports([]);
    setPage(1);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);
  
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const canView = selectedSports.length > 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 -translate-y-16 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-16 w-[300px] h-[300px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="p-6 glass-panel rounded-xl glow-teal relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg border border-indigo-500/20">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sports Calendar</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Search and filter active tournament schedules from the database.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
        {/* ── Left Column: Controls ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Date Range Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <CalendarIcon className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Date Range</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="startDate"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
              <Input
                id="endDate"
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
          </div>

          {/* Sport Selection Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Select Sports</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer uppercase tracking-wide"
                >
                  Select All
                </button>
                <span className="text-slate-700">|</span>
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-350 transition-colors cursor-pointer uppercase tracking-wide"
                >
                  Clear All
                </button>
              </div>
            </div>

            {isLoading && sportsList.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : authorizedSports.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No permitted sports available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {authorizedSports.map((sport) => {
                  const isInactive = !sport.isActive;
                  const isUnfinished = sport.calendarIds?.length === 0;
                  
                  const hasEvents = sportsAvailability === null || sportsAvailability.some(a => a.sportName.toLowerCase() === sport.name.toLowerCase() && a.count > 0);
                  const isUnavailable = sportsAvailability !== null && !hasEvents;

                  const isDisabled = isInactive || isUnfinished || isUnavailable;

                  const checked = selectedSports.includes(sport.name) && !isDisabled;
                  const accent = getSportAccent(sport.name);
                  const icon = getSportIcon(sport.name);
                  return (
                    <button
                      key={sport.id || sport.name}
                      onClick={() => !isDisabled && handleSportToggle(sport.name)}
                      disabled={isDisabled}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 ${
                        isDisabled
                          ? 'border-slate-800/40 bg-slate-900/20 text-slate-500 opacity-60 cursor-not-allowed'
                          : checked
                          ? accent + ' shadow-sm cursor-pointer'
                          : 'border-slate-800/60 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-300 cursor-pointer'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Square className={`w-4 h-4 flex-shrink-0 ${isDisabled ? 'text-slate-700' : 'text-slate-600'}`} />
                      )}
                      <span className={`text-base leading-none ${isDisabled ? 'grayscale opacity-50' : ''}`}>{icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight truncate flex items-center gap-2">
                          {sport.fullName}
                          {isUnfinished && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Coming Soon</span>
                          )}
                          {isInactive && !isUnfinished && (
                            <span className="text-[9px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Inactive</span>
                          )}
                          {isUnavailable && !isInactive && !isUnfinished && (
                            <span className="text-[9px] bg-slate-800/80 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">No Matches</span>
                          )}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">{sport.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Count badge */}
            <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-500 flex justify-between items-center">
              <span className={selectedSports.length === 0 ? 'text-amber-400' : 'text-slate-400'}>
                {selectedSports.length} of {authorizedSports.filter(s => {
                  if (!s.isActive || (s.calendarIds?.length || 0) === 0) return false;
                  if (sportsAvailability !== null) {
                    const hasEvents = sportsAvailability.some(a => a.sportName.toLowerCase() === s.name.toLowerCase() && a.count > 0);
                    if (!hasEvents) return false;
                  }
                  return true;
                }).length} available sports selected
              </span>
              {sportsAvailability === null && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
            </div>
          </div>

          {/* Warning if none selected */}
          {!canView && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300">Select at least one sport to view schedule.</p>
            </div>
          )}

          {/* Information box */}
          <div className="pt-4 border-t border-slate-850">
            <div className="flex items-start gap-2.5 p-3 rounded bg-slate-950/40 border border-slate-900/60 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-indigo-500/80 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-350">Authorized Access Only</p>
                <p className="mt-0.5 leading-relaxed">Your account profile restricts match schedule viewing to permitted sports categories.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Calendar Matches Table ───────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="glass-panel rounded-xl border border-slate-800/60 flex flex-col h-full min-h-[500px] overflow-hidden">
            
            <div className="p-5 flex-1 flex flex-col min-h-0">
              {/* Table Toolbar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Matches Available</h2>
                {meta && meta.total > 0 && (
                  <span className="text-xs font-bold text-violet-400">
                    {meta.total} Matches Found
                  </span>
                )}
              </div>

              {/* Table / List Content */}
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-sm">Fetching match list...</p>
                </div>
              ) : !canView ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center border-dashed border border-slate-800 rounded-lg p-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Filter className="w-8 h-8 text-indigo-400/60" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-400 font-bold">Filters inactive</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Select sports categories on the left panel to populate the calendar view.
                    </p>
                  </div>
                </div>
              ) : events.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center border-dashed border border-slate-800 rounded-lg p-6">
                  <CalendarIcon className="w-10 h-10 text-slate-700 animate-pulse" />
                  <p className="text-sm text-slate-400 font-bold">No Matches Found</p>
                  <p className="text-xs text-slate-600">There are no scheduled sports events in the database matching your parameters.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 justify-between">
                  <div className="overflow-auto rounded-lg border border-slate-800 bg-slate-900/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                          <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Date &amp; Time</th>
                          <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Sport</th>
                          <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Match</th>
                          <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {events.map((event) => {
                          const icon = getSportIcon(event.sportName);
                          const matchDate = new Date(event.startTime);
                          const dateStr = matchDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                          const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                          
                          return (
                            <tr 
                              key={event.id} 
                              className="transition-colors hover:bg-slate-800/30"
                            >
                              <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                <span className="text-slate-300">{dateStr}</span> <span className="text-slate-500">{timeStr}</span>
                              </td>
                              <td className="p-3 whitespace-nowrap flex items-center gap-2">
                                <span>{icon}</span>
                                <span className="text-slate-300 capitalize">{event.sportName}</span>
                              </td>
                              <td className="p-3 text-slate-300 truncate max-w-[200px]" title={event.title}>
                                {event.title}
                              </td>
                              <td className="p-3 text-slate-400 truncate max-w-[150px] flex items-center gap-1" title={event.location || 'Online / TBA'}>
                                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className="truncate">{event.location || 'Online / TBA'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {meta && meta.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-xl mt-4 border-slate-800/60 bg-slate-950/40">
                      <div className="text-xs text-slate-400">
                        Showing page <span className="font-semibold text-slate-200">{meta.page}</span> of <span className="font-semibold text-slate-200">{meta.totalPages}</span> ({meta.total} matches)
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Show:</span>
                          <select
                            value={limit}
                            onChange={(e) => handleLimitChange(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500/50 cursor-pointer"
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
      </div>
    </div>
  );
}