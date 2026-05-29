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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleExportPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();

  const [sports, setSports] = useState<SportCategory[]>([]);
  const [isSportsLoading, setIsSportsLoading] = useState(true);

  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekLaterStr());

  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);

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

        setSelectedSports(permittedList.map((s) => s.name));
      } catch {
        showToast('error', 'Failed to load sport categories.');
      } finally {
        setIsSportsLoading(false);
      }
    };
    load();
  }, [showToast, user]);

  // ── Selection Helpers ────────────────────────────────────────────────────────
  const toggleSport = (name: string) => {
    setSelectedSports((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };
  const selectAll = () => setSelectedSports(authorizedSports.map((s) => s.name));
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

  // ── Export (download TXT) ────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const txt = await calendarService.exportSchedule(buildParams());
      const blob = new Blob([txt], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sports-schedule-${startDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', `Schedule exported successfully as sports-schedule-${startDate}.txt`);
    } catch {
      showToast('error', 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Preview ──────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewText(null);
    try {
      const txt = await calendarService.exportSchedule(buildParams());
      setPreviewText(txt);
    } catch {
      showToast('error', 'Failed to generate preview.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const canExport = selectedSports.length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 -translate-y-16 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-16 w-[300px] h-[300px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="p-6 glass-panel rounded-xl glow-teal relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sports Schedule Export</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Filter by date range &amp; sports, then export a formatted TXT schedule file.
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
                  const checked = selectedSports.includes(sport.name);
                  const accent = getSportAccent(sport.name);
                  const icon = getSportIcon(sport.name);
                  return (
                    <button
                      key={sport.id}
                      onClick={() => toggleSport(sport.name)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer ${checked
                          ? accent + ' shadow-sm'
                          : 'border-slate-800/60 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 flex-shrink-0 text-slate-600" />
                      )}
                      <span className="text-base leading-none">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate">{sport.fullName}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">{sport.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Count badge */}
            <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-500">
              <span className={selectedSports.length === 0 ? 'text-amber-400' : 'text-slate-400'}>
                {/* แก้จุดนี้: แสดงสัดส่วนตามจำนวนกีฬาที่มีสิทธิ์จริง */}
                {selectedSports.length} of {authorizedSports.length} sports selected
              </span>
            </div>
          </div>

          {/* Warning if none selected */}
          {!isSportsLoading && !canExport && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300">Select at least one sport to export.</p>
            </div>
          )}

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
              {isPreviewing ? 'Generating Preview…' : 'Preview Schedule'}
            </Button>
            <Button
              id="export-btn"
              onClick={handleExport}
              disabled={!canExport || isExporting}
              isLoading={isExporting}
              className="w-full gap-2 justify-center bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting…' : 'Export TXT Schedule'}
            </Button>
          </div>
        </div>

        {/* ── Right Column: Preview Pane ───────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="glass-panel rounded-xl p-5 border border-slate-800/60 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
              <Eye className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Preview</h2>
              {previewText && (
                <span className="ml-auto text-[10px] font-mono text-slate-500 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded">
                  TXT format
                </span>
              )}
            </div>

            {isPreviewing ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm">Generating preview…</p>
              </div>
            ) : previewText === null ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-indigo-400/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-400">No preview yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Select your filters and click <strong className="text-slate-500">Preview Schedule</strong> to see the output here.
                  </p>
                </div>
              </div>
            ) : previewText.trim().startsWith('No sports') || previewText.trim().startsWith('No matches') ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <Calendar className="w-10 h-10 text-slate-700" />
                <p className="text-sm text-slate-500">{previewText}</p>
              </div>
            ) : (
              <pre className="flex-1 overflow-auto text-xs leading-relaxed text-slate-300 font-mono whitespace-pre bg-slate-950/60 rounded-lg p-4 border border-slate-900">
                {previewText}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
