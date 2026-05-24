'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { calendarService } from '@/services/calendar.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarEvent } from '@/types';
import { Calendar as CalendarIcon, MapPin, RefreshCw, Filter, ShieldCheck, CheckSquare, Square, X } from 'lucide-react';

// Master list of all known sports seeded in the backend
const MASTER_SPORTS = [
  { name: 'UFC', label: 'UFC' },
  { name: 'PGA Tour', label: 'PGA Tour' },
  { name: 'ONE Championship', label: 'ONE Championship' },
  { name: 'NRL', label: 'NRL' },
  { name: 'NBA', label: 'NBA' },
  { name: 'MotoGP', label: 'MotoGP' },
  { name: 'Football (Premier League)', label: 'Premier League' },
  { name: 'Cricket (International)', label: 'Cricket' },
  { name: 'AFL', label: 'AFL' },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // 1. Determine authorized sports based on user roles and permissions
  const authorizedSports = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.roles.includes('ADMIN') || user.permissions.includes('manage:all');
    if (isAdmin) {
      return MASTER_SPORTS;
    }
    
    // Member: Only show sports that match permissions read:sport:<sport_name>
    return MASTER_SPORTS.filter((sport) => {
      const permissionName = `read:sport:${sport.name}`.toLowerCase();
      return user.permissions.some(
        (perm) => perm.toLowerCase() === permissionName
      );
    });
  }, [user]);

  // Fetch events from calendar
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await calendarService.getEvents();
      setEvents(data);
    } catch (err: any) {
      showToast('error', 'Failed to retrieve sports schedules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Sync Schedules Button
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await calendarService.syncCalendar();
      showToast('success', response.data?.message || 'Schedules synchronized successfully!');
      fetchEvents();
    } catch (err: any) {
      showToast('error', 'Schedules synchronization failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter Actions
  const handleSportToggle = (sportName: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportName)
        ? prev.filter((s) => s !== sportName)
        : [...prev, sportName]
    );
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSports([]);
  };

  // Filtered Events computed property
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // 1. Sport category filter
      if (selectedSports.length > 0 && !selectedSports.some(s => s.toLowerCase() === event.sportName.toLowerCase())) {
        return false;
      }

      // 2. Date range filters
      const eventStart = new Date(event.startTime);
      if (startDate) {
        const startLimit = new Date(startDate);
        if (eventStart < startLimit) return false;
      }
      if (endDate) {
        const endLimit = new Date(endDate);
        // Set end limit to end of day
        endLimit.setHours(23, 59, 59, 999);
        if (eventStart > endLimit) return false;
      }

      return true;
    });
  }, [events, startDate, endDate, selectedSports]);

  // Helper: Get unique badge styling for each sport
  const getSportBadgeStyle = (sportName: string) => {
    const name = sportName.toLowerCase();
    if (name.includes('ufc') || name.includes('one')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (name.includes('nba') || name.includes('nrl')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
    if (name.includes('football') || name.includes('premier')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (name.includes('motogp') || name.includes('afl')) {
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
          <p className="text-sm text-slate-400">View and sync all permitted sports calendars</p>
        </div>
        <Button
          onClick={handleSync}
          isLoading={isSyncing}
          variant="primary"
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing && 'animate-spin'}`} />
          Sync Schedules
        </Button>
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
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="endDate"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Sport Selector */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sport Categories
            </h4>
            {authorizedSports.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No permitted sports configured.</p>
            ) : (
              <div className="flex flex-col gap-2">
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
                      <span>{sport.label}</span>
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
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 glass-panel rounded-xl min-h-[300px] border-dashed border-slate-800">
              <CalendarIcon className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-300">No Match Matches Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                There are no scheduled sports events matching your current filters. Try adjusting dates or categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
