'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { calendarService } from '@/services/calendar.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import { Calendar as CalendarIcon, MapPin, Filter, ShieldCheck, CheckSquare, Square, X, CalendarDays } from 'lucide-react';

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

export default function SportsCalendar() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekLaterStr());
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  // Sport categories
  const [sportsList, setSportsList] = useState<{ id: string; name: string; fullName: string, calendarIds?: string[] }[]>([]);

  // 1. FIXED: แกะข้อมูล array ชัวร์ๆ ป้องกัน select sports หาย
  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await calendarService.getSports();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setSportsList(list);
      } catch (err: any) {
        showToast('error', 'Failed to retrieve sport categories.');
      }
    };
    loadSports();
  }, [showToast]);

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

  // 2. FIXED: สร้าง meta จำลองให้ dropdown pagination ไม่หาย
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

  // REAL-TIME TRIGGER
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
    setSelectedSports(authorizedSports.filter(s => (s.calendarIds?.length || 0) > 0).map(s => s.name));
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

  const handleClearFilters = () => {
    setStartDate(todayStr());
    setEndDate(weekLaterStr());
    setSelectedSports([]);
    setPage(1);
  };

  const getSportBadgeStyle = (sportName: string) => {
    const name = sportName.toLowerCase();
    if (name.includes('ufc') || name.includes('one')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (name.includes('nba') || name.includes('nrl') || name.includes('nfl')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (name.includes('football') || name.includes('premier') || name.includes('afl')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (name.includes('motogp') || name.includes('nhl') || name.includes('mlb') || name.includes('pga')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 relative">
      <div className="absolute top-0 right-0 -translate-y-12 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-12 w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 glass-panel rounded-xl glow-teal relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-indigo-400" />
            Sports Calendar
          </h1>
          <p className="text-sm text-slate-400">Search and filter active tournament schedules from the database</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        <div className="lg:col-span-1 glass-panel rounded-xl p-6 self-start space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" />
              Filter Events
            </h3>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Range</h4>
            <Input id="startDate" type="date" label="Start Date" value={startDate} onChange={(e) => handleDateChange('start', e.target.value)} className="bg-slate-900 border-slate-800" />
            <Input id="endDate" type="date" label="End Date" value={endDate} onChange={(e) => handleDateChange('end', e.target.value)} className="bg-slate-900 border-slate-800" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sport Categories</h4>
              <div className="flex gap-2">
                <button type="button" onClick={handleSelectAll} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase">Select All</button>
                <span className="text-[10px] text-slate-700">|</span>
                <button type="button" onClick={handleClearFilters} className="text-[10px] font-bold text-slate-500 hover:text-slate-400 uppercase">Clear</button>
              </div>
            </div>
            
            {authorizedSports.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No permitted sports configured.</p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                {authorizedSports.map((sport) => {
                  const isUnfinished = sport.calendarIds?.length === 0;
                  const isChecked = selectedSports.includes(sport.name) && !isUnfinished;
                  return (
                    <button
                      key={sport.name}
                      type="button"
                      onClick={() => !isUnfinished && handleSportToggle(sport.name)}
                      disabled={isUnfinished}
                      className={`flex items-center gap-2.5 text-sm text-left transition-colors group ${
                        isUnfinished ? 'text-slate-500 opacity-60 cursor-not-allowed' : 'text-slate-300 hover:text-white cursor-pointer'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" /> : <Square className={`w-4.5 h-4.5 flex-shrink-0 ${isUnfinished ? 'text-slate-700' : 'text-slate-600 group-hover:text-slate-400'}`} />}
                      <span className="truncate flex items-center gap-2">
                        {sport.fullName || sport.name}
                        {isUnfinished && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Coming Soon</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-start gap-2.5 p-3 rounded bg-slate-950/40 border border-slate-900/60 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-indigo-500/80 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Authorized Access Only</p>
                <p className="mt-0.5 leading-relaxed">Your current account profile restricts match schedule viewing to permitted sports categories.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-xl min-h-[350px]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500 mb-3" />
              <span className="text-sm text-slate-400">Fetching match list...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 glass-panel rounded-xl min-h-[350px] border-dashed border-slate-800">
              <CalendarIcon className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-slate-300">No Matches Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">There are no scheduled sports events in the database matching your current search parameters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col justify-between gap-4 border-slate-800/60 transition-all duration-300 hover:scale-[1.01] hover:border-indigo-500/30 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded border ${getSportBadgeStyle(event.sportName)}`}>{event.sportName}</span>
                        <span className="text-xs text-slate-400">{formatDate(event.startTime)}</span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-snug tracking-tight">{event.title}</h3>
                      {event.description && <p className="text-sm text-slate-400 line-clamp-2">{event.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-900/60 pt-3 mt-auto">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{event.location || 'Online / TBA'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {meta && meta.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel rounded-xl mt-6 border-slate-800/60">
                  <div className="text-xs text-slate-400">
                    Showing page <span className="font-semibold text-slate-200">{meta.page}</span> of <span className="font-semibold text-slate-200">{meta.totalPages}</span> ({meta.total} matches found)
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
                      <Button type="button" variant="outline" size="sm" onClick={() => handlePageChange(meta.page - 1)} disabled={meta.page <= 1} className="py-1 px-3 text-xs">Previous</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handlePageChange(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="py-1 px-3 text-xs">Next</Button>
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