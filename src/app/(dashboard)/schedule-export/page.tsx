'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { calendarService } from '@/services/calendar.service';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  Eye,
  CheckSquare,
  Square,
  FileText,
  Calendar,
  Loader2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { SportCategory } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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



// ─── Simple CSV Parser for Preview ───────────────────────────────────────────
const parseCSV = (csvStr: string) => {
  const cleanStr = csvStr.replace(/^\uFEFF/, '').trim();
  if (!cleanStr) return [];
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    if (inQuotes) {
      if (char === '"' && cleanStr[i+1] === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && cleanStr[i+1] === '\n')) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++;
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  return rows;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleExportPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();

  const [sports, setSports] = useState<SportCategory[]>([]);
  const [isSportsLoading, setIsSportsLoading] = useState(true);

  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekLaterStr());

  const [sportsAvailability, setSportsAvailability] = useState<{ sportName: string; count: number }[] | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewMatches, setPreviewMatches] = useState<any[] | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'txt' | 'csv'>('txt');
  const [activeTab, setActiveTab] = useState<'selection' | 'file'>('selection');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isFilePreviewLoading, setIsFilePreviewLoading] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoLang, setInfoLang] = useState<'en' | 'th'>('th');

  // Filter sports categories based on user read permissions
  const authorizedSports = useMemo(() => {
    if (!user) return [];
    if (user.roles?.includes('ADMIN') || user.permissions?.includes('manage:all')) {
      return sports;
    }
    const permittedSportNames = (user.permissions || [])
      .filter((perm) => perm.startsWith('read:sport:'))
      .map((perm) => perm.replace('read:sport:', '').toLowerCase());

    return sports.filter((sport) =>
      permittedSportNames.includes(sport.name.toLowerCase())
    );
  }, [sports, user]);

  // ── Load sports ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsSportsLoading(true);
      try {
        const data = await calendarService.getSports();
        const list: SportCategory[] = Array.isArray(data) ? data : data?.data ?? [];
        setSports(list);

        // Pre-select only the authorized sports names by default
        const permittedList = (() => {
          if (!user) return [];
          if (user.roles?.includes('ADMIN') || user.permissions?.includes('manage:all')) {
            return list;
          }
          const permittedSportNames = (user.permissions || [])
            .filter((perm) => perm.startsWith('read:sport:'))
            .map((perm) => perm.replace('read:sport:', '').toLowerCase());

          return list.filter((sport) =>
            permittedSportNames.includes(sport.name.toLowerCase())
          );
        })();

        // Filter out inactive or unfinished sports from default selection
        const selectableList = permittedList.filter(s => s.isActive && (s.calendarIds?.length || 0) > 0);
        setSelectedSports(selectableList.map((s) => s.name));
      } catch {
        showToast('error', 'Failed to load sport categories.');
      } finally {
        setIsSportsLoading(false);
      }
    };
    load();
  }, [showToast, user]);

  // ── Load sports availability ──────────────────────────────────────────────────
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

  // ── Selection Helpers ────────────────────────────────────────────────────────
  const toggleSport = (name: string) => {
    setSelectedSports((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };
  const selectAll = () => {
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
  };
  const clearAll = () => setSelectedSports([]);

  // ── Build query params ───────────────────────────────────────────────────────
  const buildParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (selectedSports.length > 0)
      params.set('sports', selectedSports.join(','));
    return params;
  }, [startDate, endDate, selectedSports]);

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (previewMatches && selectedMatchIds.length === 0) {
      showToast('error', 'Please select at least one match to export.');
      return;
    }

    setIsExporting(true);
    try {
      const eventIds = previewMatches ? selectedMatchIds : undefined;
      const paramsObj = Object.fromEntries(buildParams().entries());
      const data = await calendarService.exportSchedule(paramsObj, exportFormat, eventIds);
      const mimeType = exportFormat === 'csv' ? 'text/csv' : 'text/plain';
      const blob = new Blob([data], { type: `${mimeType}; charset=utf-8` });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sports-schedule-${startDate}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', `Schedule exported successfully as sports-schedule-${startDate}.${exportFormat}`);
    } catch {
      showToast('error', 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Preview (Load Matches) ───────────────────────────────────────────────────
  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewMatches(null);
    setSelectedMatchIds([]);
    try {
      const paramsObj = Object.fromEntries(buildParams().entries());
      const res = await calendarService.getExportPreview(paramsObj);
      const matches = res.data || [];
      setPreviewMatches(matches);
      setSelectedMatchIds(matches.map((m: any) => m.id));
      if (matches.length === 0) {
        showToast('error', 'No matches found for the selected filters.');
      } else {
        setActiveTab('selection');
        setPreviewText(null); // clear old file preview
      }
    } catch {
      showToast('error', 'Failed to load matches.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const toggleMatch = (id: string) => {
    setSelectedMatchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllMatches = () => {
    if (selectedMatchIds.length === previewMatches?.length) {
      setSelectedMatchIds([]);
    } else {
      setSelectedMatchIds(previewMatches?.map(m => m.id) || []);
    }
  };

  const canExport = selectedSports.length > 0;

  const fetchFilePreview = async (formatToFetch: 'txt' | 'csv' = exportFormat) => {
    if (!previewMatches || selectedMatchIds.length === 0) return;
    setIsFilePreviewLoading(true);
    try {
      const paramsObj = Object.fromEntries(buildParams().entries());
      const data = await calendarService.exportSchedule(paramsObj, formatToFetch, selectedMatchIds);
      setPreviewText(data);
    } catch {
      showToast('error', 'Failed to generate file preview.');
    } finally {
      setIsFilePreviewLoading(false);
    }
  };

  const handleTabChange = async (tab: 'selection' | 'file') => {
    setActiveTab(tab);
    if (tab === 'file' && previewMatches && selectedMatchIds.length > 0) {
      await fetchFilePreview();
    }
  };

  const handleFormatChange = (format: 'txt' | 'csv') => {
    setExportFormat(format);
    if (activeTab === 'file') {
      fetchFilePreview(format);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 -translate-y-16 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-16 w-[300px] h-[300px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="p-6 glass-panel rounded-xl glow-teal relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Sports Schedule Export</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Filter by date range &amp; sports, then export a formatted TXT or CSV schedule file.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 border border-indigo-500/25 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer self-start sm:self-center"
          >
            <HelpCircle className="w-4 h-4" />
            How it works
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
        {/* ── Left Column: Controls ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Date Range Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Calendar className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Date Range</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="export-start"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                id="export-end"
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                  onClick={selectAll}
                  className="text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer uppercase tracking-wide"
                >
                  Select All
                </button>
                <span className="text-slate-700">|</span>
                <button
                  onClick={clearAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer uppercase tracking-wide"
                >
                  Clear All
                </button>
              </div>
            </div>

            {isSportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : authorizedSports.length === 0 ? ( // แก้จุดนี้: เช็คจาก authorizedSports
              <p className="text-xs text-slate-500 italic py-4 text-center">No permitted sports available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {/* แก้จุดนี้: เปลี่ยนจาก sports.map เป็น authorizedSports.map */}
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
                      key={sport.id}
                      onClick={() => !isDisabled && toggleSport(sport.name)}
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
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Coming Soon</span>
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
          {!isSportsLoading && !canExport && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300">Select at least one sport to export.</p>
            </div>
          )}

          {/* Format Selector */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Export Format</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleFormatChange('txt')}
                className={`flex items-center justify-center py-2.5 rounded-lg border text-sm font-bold transition-all ${
                  exportFormat === 'txt'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                TXT Format
              </button>
              <button
                onClick={() => handleFormatChange('csv')}
                className={`flex items-center justify-center py-2.5 rounded-lg border text-sm font-bold transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                CSV Format
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              id="preview-btn"
              onClick={handlePreview}
              disabled={!canExport || isPreviewing}
              isLoading={isPreviewing}
              variant="outline"
              className="w-full gap-2 justify-center"
            >
              <Eye className="w-4 h-4" />
              {isPreviewing ? 'Loading Matches…' : 'Preview & Select Matches'}
            </Button>
            <Button
              id="export-btn"
              onClick={handleExport}
              disabled={!canExport || isExporting}
              isLoading={isExporting}
              className="w-full gap-2 justify-center bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting…' : `Export ${exportFormat.toUpperCase()} Schedule`}
            </Button>
          </div>
        </div>

        {/* ── Right Column: Preview Pane ───────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="glass-panel rounded-xl border border-slate-800/60 flex flex-col h-full min-h-[500px] overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-slate-800/80 bg-slate-900/50">
              <button
                onClick={() => handleTabChange('selection')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                  activeTab === 'selection' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Select Matches
              </button>
              <button
                onClick={() => handleTabChange('file')}
                disabled={previewMatches === null || selectedMatchIds.length === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                  (previewMatches === null || selectedMatchIds.length === 0) ? 'opacity-50 cursor-not-allowed text-slate-600' :
                  activeTab === 'file' ? 'text-teal-400 border-b-2 border-teal-500 bg-teal-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                File Preview ({exportFormat.toUpperCase()})
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col min-h-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60">
                {activeTab === 'selection' ? (
                  <>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Matches Available</h2>
                    {previewMatches !== null && (
                      <span className="text-xs font-bold text-violet-400">
                        {selectedMatchIds.length} / {previewMatches.length} Selected
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Generated File Preview</h2>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded uppercase">
                      {exportFormat} format
                    </span>
                  </>
                )}
              </div>

              {/* Tab Content */}
              {activeTab === 'selection' ? (
                <>
                  {isPreviewing ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                      <p className="text-sm">Loading matches…</p>
                    </div>
                  ) : previewMatches === null ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <CheckSquare className="w-8 h-8 text-indigo-400/60" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-400">No matches loaded</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Select your filters and click <strong className="text-slate-500">Preview &amp; Select Matches</strong> to see the list here.
                        </p>
                      </div>
                    </div>
                  ) : previewMatches.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                      <Calendar className="w-10 h-10 text-slate-700" />
                      <p className="text-sm text-slate-500">No matches found for the selected filters.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-900/50">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                            <th className="p-3 border-b border-slate-700/60 w-10 text-center">
                              <button onClick={toggleAllMatches} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                                {selectedMatchIds.length === previewMatches.length ? <CheckSquare className="w-4 h-4 mx-auto" /> : <Square className="w-4 h-4 mx-auto" />}
                              </button>
                            </th>
                            <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Date &amp; Time</th>
                            <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Sport</th>
                            <th className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">Match</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {previewMatches.map((match) => {
                            const isSelected = selectedMatchIds.includes(match.id);
                            const originalSport = authorizedSports.find(s => s.name.toLowerCase() === match.sportName);
                            const displaySport = originalSport ? originalSport.name : match.sportName;
                            const icon = getSportIcon(match.sportName);
                            
                            const matchDate = new Date(match.startTime);
                            const dateStr = matchDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                            const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            return (
                              <tr 
                                key={match.id} 
                                className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'hover:bg-slate-800/30'}`}
                                onClick={() => toggleMatch(match.id)}
                              >
                                <td className="p-3 text-center">
                                  <div className={`w-4 h-4 mx-auto rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600'}`}>
                                    {isSelected && <CheckSquare className="w-4 h-4" />}
                                  </div>
                                </td>
                                <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                  <span className="text-slate-300">{dateStr}</span> <span className="text-slate-500">{timeStr}</span>
                                </td>
                                <td className="p-3 whitespace-nowrap flex items-center gap-2">
                                  <span>{icon}</span>
                                  <span className="text-slate-300">{displaySport}</span>
                                </td>
                                <td className="p-3 text-slate-300 truncate max-w-[250px]" title={match.title}>
                                  {match.title}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isFilePreviewLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                      <p className="text-sm">Generating file preview…</p>
                    </div>
                  ) : previewText ? (
                    exportFormat === 'csv' ? (
                      <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-900/50">
                        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                          <thead>
                            <tr className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                              {parseCSV(previewText)[0]?.map((header, idx) => (
                                <th key={idx} className="p-3 font-semibold text-slate-300 border-b border-slate-700/60 uppercase tracking-wider text-[10px]">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {parseCSV(previewText).slice(1).map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="p-3 text-slate-400 font-mono text-[11px] truncate max-w-[200px]" title={cell}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="flex-1 overflow-auto text-xs leading-relaxed text-slate-300 font-mono whitespace-pre bg-slate-950/60 rounded-lg p-4 border border-slate-900">
                        {previewText}
                      </pre>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <AlertTriangle className="w-8 h-8 text-amber-500/50" />
                      <p className="text-sm">No preview available.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Explanation Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel border-slate-800/80 w-full max-w-xl p-6 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header with Language Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400 animate-pulse" />
                {infoLang === 'th' ? 'หลักการทำงานของระบบ Export' : 'How Export Works'}
              </h3>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setInfoLang('th')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    infoLang === 'th'
                      ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ภาษาไทย
                </button>
                <button
                  onClick={() => setInfoLang('en')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    infoLang === 'en'
                      ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Description Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-slate-300 text-xs sm:text-sm leading-relaxed">
              {infoLang === 'th' ? (
                <>
                  <p className="text-slate-405 mb-4">
                    หน้านี้ใช้สำหรับค้นหาตารางการแข่งขันที่ได้รับอนุญาต เลือกแมตช์ที่ต้องการ และส่งออก (Export) เป็นไฟล์สำหรับส่งให้พันธมิตรหรือใช้งานต่ออย่างมีระบบ
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        1. การกรองตารางการแข่งขัน
                      </h4>
                      <p className="text-xs text-slate-400">
                        ระบุช่วงวันที่ที่คุณสนใจ และติ๊กเลือกประเภทกีฬาที่ได้รับการอนุญาต (หากกีฬาใดไม่มีข้อมูลแมตช์จริงในช่วงเวลานั้น ระบบจะแสดงป้าย "No Matches" และปิดปุ่มไว้เพื่อประหยัดเวลาเลือก)
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        2. เลือกคู่การแข่งขันเฉพาะเจาะจง
                      </h4>
                      <p className="text-xs text-slate-400">
                        เมื่อกดปุ่ม "Preview & Select Matches" ข้อมูลจะปรากฏทางขวามือ คุณสามารถกดเลือกคู่การแข่งที่จะเก็บไว้ หรือกดติ๊กออกคู่ที่ไม่เกี่ยวข้องได้ทีละคู่
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        3. ตรวจเช็กหน้าตาไฟล์ (File Preview)
                      </h4>
                      <p className="text-xs text-slate-400">
                        คุณสามารถเปลี่ยนแท็บด้านขวาไปที่ "File Preview" เพื่อจำลองหน้าตาของเอกสารจริงที่จะได้รับ ก่อนดาวน์โหลดเก็บไว้
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        4. สองฟอร์แมตไฟล์สำหรับการนำออก
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                        <li><strong>Plain Text (TXT):</strong> รายงานสรุปแบบข้อความพิมพ์ปกติ เหมาะสำหรับนำไปคัดลอกส่งต่อคู่ค้า</li>
                        <li><strong>CSV Sheet (CSV):</strong> ตารางชีตข้อมูลแยกช่องตารางชัดเจน เหมาะสำหรับเปิดคำนวณต่อบน Excel หรือ Google Sheets</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-405 mb-4">
                    This screen allows you to search for tournament schedules, filter out unnecessary match entries, preview reports, and export clean files.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        1. Schedule Filtering
                      </h4>
                      <p className="text-xs text-slate-400">
                        Specify date boundaries and select sport categories. (Sports without matches are marked "No Matches" and disabled to save your selection time).
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        2. Selecting Matches
                      </h4>
                      <p className="text-xs text-slate-400">
                        Click "Preview & Select Matches" to display active events. Check or uncheck entries to choose which matches are exported.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        3. Visual File Preview
                      </h4>
                      <p className="text-xs text-slate-400">
                        Navigate to the "File Preview" tab to check the generated file format layout before downloading it.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        4. Export File Options
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                        <li><strong>Plain Text (TXT):</strong> A formatted raw text document suitable for copy-pasting.</li>
                        <li><strong>CSV Sheet (CSV):</strong> A structured spreadsheet file ready for Excel or Google Sheets.</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/60 pt-4 mt-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 transition-all cursor-pointer shadow-lg shadow-teal-500/15"
              >
                {infoLang === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
