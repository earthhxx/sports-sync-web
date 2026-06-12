'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Database, 
  FileText, 
  Sparkles, 
  Layers,
  Info,
  Calendar,
  AlertCircle,
  Loader2,
  Download,
  Filter,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { 
  parseScheduleText, 
  ParsedEvent, 
  ReconciliationResult,
  DBEvent
} from '@/lib/reconciliation-parser';
import { scheduleService } from '@/services/schedule.service';
import { calendarService } from '@/services/calendar.service';

const SAMPLE_INPUT = `SUNDAY 14 JUN

FIFA WORLD CUP 2026
05:00 AM | Brazil vs Morocco
08:00 AM | Haiti vs Scotland

NRL ROUND 15
10:05 AM | Wests Tigers vs Gold Coast Titans

11:00 AM | Australia vs Türkiye

FORMULA 1
 08:00 PM | SPANISH GRAND PRIX – RACE

HSBC CHAMPIONSHIPS (WTA 500)
Women's Singles Final`;

export default function ReconcilePage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [inputText, setInputText] = useState('');
  const [showTextarea, setShowTextarea] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState<'txt' | 'csv'>('txt');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoLang, setInfoLang] = useState<'en' | 'th'>('th');
  const [activeTab, setActiveTab] = useState<'matched' | 'conflicts' | 'manual_review'>('matched');
  const [loading, setLoading] = useState(false);
  
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dbEvents, setDbEvents] = useState<DBEvent[]>([]);

  const [rawResult, setRawResult] = useState<ReconciliationResult & { allParsed: ParsedEvent[] }>({
    matched: [],
    conflicts: [],
    manual_review: [],
    allParsed: [],
  });

  const [filteredResult, setFilteredResult] = useState<ReconciliationResult & { allParsed: ParsedEvent[] }>({
    matched: [],
    conflicts: [],
    manual_review: [],
    allParsed: [],
  });

  const getBangkokDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    
    const year = dateParts.find(p => p.type === 'year')?.value || '';
    const month = dateParts.find(p => p.type === 'month')?.value || '';
    const day = dateParts.find(p => p.type === 'day')?.value || '';
    const dateStr = `${year}-${month}-${day}`;

    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date);
    
    const hour = timeParts.find(p => p.type === 'hour')?.value || '12';
    const minute = timeParts.find(p => p.type === 'minute')?.value || '00';
    const dayPeriod = timeParts.find(p => p.type === 'dayPeriod')?.value || 'AM';
    const timeStr = `${hour.padStart(2, '0')}:${minute} ${dayPeriod.toUpperCase()}`;
    
    return { dateStr, timeStr };
  };

  const performReconciliation = async (text: string) => {
    const { events } = parseScheduleText(text);
    const recon = await scheduleService.reconcile(text);
    
    let start = startDate;
    let end = endDate;

    if (!start || !end) {
      const dates = events.map(e => e.date).filter(Boolean) as string[];
      if (dates.length > 0) {
        dates.sort();
        if (!start) start = dates[0];
        if (!end) end = dates[dates.length - 1];
      }
    }

    if (start && end) {
      try {
        const sportsData = await calendarService.getSports();
        const sportsList = Array.isArray(sportsData) ? sportsData : sportsData?.data ?? [];
        const activeSports = sportsList.filter((s: any) => s.isActive).map((s: any) => s.name).join(',');

        const dbResponse = await calendarService.getEvents({ 
          startDate: start, 
          endDate: end, 
          sports: activeSports || undefined, 
          limit: 2000 
        });
        const dbEventsData = Array.isArray(dbResponse) ? dbResponse : dbResponse?.data || [];
        
        const converted = dbEventsData.map((calEv: any) => {
          const { dateStr, timeStr } = getBangkokDateTime(calEv.startTime);
          let homeTeam: string | undefined;
          let awayTeam: string | undefined;
          const vsRegex = /\s+(?:vs|VS|v)\s+/;
          if (vsRegex.test(calEv.title)) {
            const parts = calEv.title.split(vsRegex);
            if (parts.length === 2) {
              homeTeam = parts[0].trim();
              awayTeam = parts[1].trim();
            }
          }
          return {
            id: calEv.id,
            date: dateStr,
            time: timeStr,
            league: calEv.sportName,
            eventName: calEv.title,
            homeTeam,
            awayTeam
          };
        });
        setDbEvents(converted);

        const matchedDbIds = new Set<string>();
        recon.matched.forEach((m: any) => {
          if (m.db?.id) matchedDbIds.add(m.db.id);
        });
        recon.conflicts.forEach((c: any) => {
          if (c.db?.id) matchedDbIds.add(c.db.id);
        });

        // We no longer track or show events that are present in the DB but missing from the imported schedule.
      } catch (err) {
        console.error('Failed to fetch calendar events from database:', err);
      }
    }

    const res = {
      matched: recon.matched,
      conflicts: recon.conflicts,
      manual_review: recon.manual_review,
      allParsed: events,
    };

    setRawResult(res);
    applyFilters(res, startDate, endDate);
  };

  const handleReconcile = async () => {
    if (!inputText.trim()) {
      showToast('error', 'Please paste or import some schedule text first.');
      return;
    }
    setLoading(true);
    try {
      await performReconciliation(inputText);
    } catch (error) {
      console.error('Reconciliation failed:', error);
      showToast('error', 'Reconciliation failed.');
    } finally {
      setLoading(false);
    }
  };


  // Helper to filter results based on date range
  const applyFilters = (
    data: ReconciliationResult & { allParsed: ParsedEvent[] },
    start: string,
    end: string
  ) => {
    let matched = data.matched;
    let conflicts = data.conflicts;
    let manualReview = data.manual_review;
    let allParsed = data.allParsed;

    if (start) {
      const minDate = new Date(start);
      matched = matched.filter(item => item.parsed.date && new Date(item.parsed.date) >= minDate);
      conflicts = conflicts.filter(item => {
        const dateStr = item.parsed?.date || item.db?.date;
        return dateStr && new Date(dateStr) >= minDate;
      });
      allParsed = allParsed.filter(item => item.date && new Date(item.date) >= minDate);
      
      manualReview = manualReview.filter(item => {
        if (!item.dateContext) return true;
        const parsedDate = parseScheduleText(item.dateContext).events[0]?.date || 
                           parseScheduleText(item.dateContext).manualReviews[0]?.dateContext;
        return !parsedDate || new Date(parsedDate) >= minDate;
      });
    }

    if (end) {
      const maxDate = new Date(end);
      matched = matched.filter(item => item.parsed.date && new Date(item.parsed.date) <= maxDate);
      conflicts = conflicts.filter(item => {
        const dateStr = item.parsed?.date || item.db?.date;
        return dateStr && new Date(dateStr) <= maxDate;
      });
      allParsed = allParsed.filter(item => item.date && new Date(item.date) <= maxDate);
      manualReview = manualReview.filter(item => {
        if (!item.dateContext) return true;
        const parsedDate = parseScheduleText(item.dateContext).events[0]?.date || 
                           parseScheduleText(item.dateContext).manualReviews[0]?.dateContext;
        return !parsedDate || new Date(parsedDate) <= maxDate;
      });
    }

    setFilteredResult({ matched, conflicts, manual_review: manualReview, allParsed });

    // Set active tab based on available items - prioritize showing conflicts & manual reviews first
    if (conflicts.length > 0) {
      setActiveTab('conflicts');
    } else if (manualReview.length > 0) {
      setActiveTab('manual_review');
    } else if (matched.length > 0) {
      setActiveTab('matched');
    }
  };

  // Apply filters whenever date inputs change
  useEffect(() => {
    applyFilters(rawResult, startDate, endDate);
  }, [startDate, endDate]);

  // Run initial parse on component mount
  useEffect(() => {
    // Only run initial parse if there is input text
    if (inputText) {
      handleReconcile();
    }
  }, []);

  const [isDragging, setIsDragging] = useState(false);

  // Handle local file uploads via FileReader API
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setInputText(text);
        setShowTextarea(true);
        showToast('success', `Successfully loaded and reconciling ${file.name}`);
        
        // Trigger reconciliation immediately
        setLoading(true);
        try {
          await performReconciliation(text);
        } catch (error) {
          console.error('Reconciliation failed:', error);
          showToast('error', 'Reconciliation failed.');
        } finally {
          setLoading(false);
        }

        // Reset file input value to allow uploading same file again if edited
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showToast('error', 'Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      showToast('error', 'Please upload a .txt or .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setInputText(text);
        setShowTextarea(true);
        showToast('success', `Successfully loaded and reconciling ${file.name}`);
        
        // Trigger reconciliation immediately
        setLoading(true);
        try {
          await performReconciliation(text);
        } catch (error) {
          console.error('Reconciliation failed:', error);
          showToast('error', 'Reconciliation failed.');
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Export report function (opens modal)
  const handleExportReport = () => {
    setIsExportModalOpen(true);
  };

  // Actual export download execution
  const executeExportReport = () => {
    const reportDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
    const rangeText = startDate || endDate 
      ? `Filtered Range: ${startDate || 'ANY'} to ${endDate || 'ANY'}` 
      : 'Filtered Range: All Dates';

    if (reportFormat === 'txt') {
      let reportLines: string[] = [];
      reportLines.push('==================================================');
      reportLines.push('        SPORTS SYNC - RECONCILIATION REPORT       ');
      reportLines.push('==================================================');
      reportLines.push(`Generated on:   ${reportDate} (Asia/Bangkok)`);
      reportLines.push(`${rangeText}`);
      reportLines.push('');
      reportLines.push('SUMMARY STATS:');
      reportLines.push('--------------------------------------------------');
      reportLines.push(`Total Events Parsed:      ${filteredResult.allParsed.length}`);
      reportLines.push(`Verified Matches:         ${filteredResult.matched.length}`);
      reportLines.push(`Conflicts & Discrepancies: ${filteredResult.conflicts.length}`);
      reportLines.push(`Requires Manual Review:   ${filteredResult.manual_review.length}`);
      reportLines.push('');

      // 1. MATCHES SECTION
      reportLines.push('1. VERIFIED MATCHES (Match Database Perfectly)');
      reportLines.push('--------------------------------------------------');
      if (filteredResult.matched.length === 0) {
        reportLines.push('No verified matches found.');
      } else {
        filteredResult.matched.forEach((item, idx) => {
          reportLines.push(`[${idx + 1}] Date: ${item.parsed.date || 'Unspecified'}`);
          reportLines.push(`    Time:   ${item.parsed.time}`);
          reportLines.push(`    League: ${item.parsed.league || 'General'}`);
          reportLines.push(`    Event:  ${item.parsed.eventName}`);
          reportLines.push(`    Status: VERIFIED MATCH`);
          reportLines.push('');
        });
      }
      reportLines.push('');

      // 2. CONFLICTS SECTION
      reportLines.push('2. CONFLICTS & DISCREPANCIES (Time Mismatch or Missing DB Records)');
      reportLines.push('--------------------------------------------------');
      if (filteredResult.conflicts.length === 0) {
        reportLines.push('No database conflicts found.');
      } else {
        filteredResult.conflicts.forEach((item, idx) => {
          const typeLabel = item.field === 'not_found' 
            ? 'Missing Database Entry' 
            : item.field === 'missing_in_import' 
              ? 'Missing in Imported Schedule' 
              : 'Time Discrepancy';
          reportLines.push(`[${idx + 1}] Conflict Type: ${typeLabel}`);
          if (item.parsed) {
            reportLines.push(`    Customer Schedule: [${item.parsed.date || 'Unspecified'}] ${item.parsed.time} | ${item.parsed.league || 'General'} | ${item.parsed.eventName}`);
          } else {
            reportLines.push(`    Customer Schedule: Missing from imported schedule`);
          }
          if (item.db) {
            reportLines.push(`    Master Database:   [${item.db.date}] ${item.db.time} | ${item.db.league} | ${item.db.eventName}`);
          } else {
            reportLines.push(`    Master Database:   No matching entry found in database`);
          }
          reportLines.push(`    Reason:            ${item.reason}`);
          reportLines.push('');
        });
      }
      reportLines.push('');

      // 3. MANUAL REVIEW SECTION
      reportLines.push('3. FORMATTING ERRORS & MANUAL REVIEWS (Failed to Parse)');
      reportLines.push('--------------------------------------------------');
      if (filteredResult.manual_review.length === 0) {
        reportLines.push('No formatting errors found.');
      } else {
        filteredResult.manual_review.forEach((item, idx) => {
          reportLines.push(`[${idx + 1}] Raw Line Content: "${item.originalLine}"`);
          reportLines.push(`    Date Context:   ${item.dateContext || 'Unknown'}`);
          reportLines.push(`    League Context: ${item.leagueContext || 'Unknown'}`);
          reportLines.push(`    Reason:         ${item.reason}`);
          reportLines.push('');
        });
      }
      reportLines.push('');
      reportLines.push('==================================================');
      reportLines.push('End of Report.');

      const fileContent = reportLines.join('\n');
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV Export
      let csvRows: string[][] = [];
      // Header
      csvRows.push(['Type', 'League', 'Event Title', 'Schedule Date', 'Schedule Time', 'Database Date', 'Database Time', 'Status / Reason']);
      
      // Matched
      filteredResult.matched.forEach((item) => {
        csvRows.push([
          'Matched',
          item.parsed.league || 'General',
          item.parsed.eventName,
          item.parsed.date || 'Unspecified',
          item.parsed.time,
          item.parsed.date || 'Unspecified',
          item.parsed.time,
          'Verified Match'
        ]);
      });

      // Conflicts
      filteredResult.conflicts.forEach((item) => {
        csvRows.push([
          item.field === 'missing_in_import' ? 'Missing in Import' : 'Conflict',
          item.parsed ? (item.parsed.league || 'General') : (item.db ? item.db.league : 'N/A'),
          item.parsed ? item.parsed.eventName : (item.db ? item.db.eventName : 'N/A'),
          item.parsed ? (item.parsed.date || 'Unspecified') : 'N/A',
          item.parsed ? item.parsed.time : 'N/A',
          item.db ? item.db.date : 'N/A',
          item.db ? item.db.time : 'N/A',
          item.reason
        ]);
      });

      // Manual Review
      filteredResult.manual_review.forEach((item) => {
        csvRows.push([
          'Manual Review',
          item.leagueContext || 'Unknown',
          item.originalLine,
          'Unknown',
          'Unknown',
          'N/A',
          'N/A',
          item.reason
        ]);
      });

      const csvContent = csvRows
        .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    setIsExportModalOpen(false);
    showToast('success', `Report exported successfully as ${reportFormat.toUpperCase()}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden file input for imports */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".txt,.csv"
        className="hidden"
      />

      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 sm:p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Database-Backed Engine
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Schedule Reconciler
            </h1>
            <p className="mt-2 text-slate-400 text-sm max-w-xl">
              Paste semi-structured plaintext schedules to parse event times, league information, and match them against the PostgreSQL database in real-time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 border border-indigo-500/25 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              How it works
            </button>
            <button
              onClick={triggerFileSelect}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import File
            </button>
            <button
              onClick={() => { setInputText(''); setShowTextarea(false); }}
              className="px-3.5 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-950/20 border border-slate-900 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => { setInputText(SAMPLE_INPUT); setShowTextarea(true); }}
              className="px-3.5 py-2 text-sm font-medium text-teal-400 hover:text-teal-300 bg-teal-500/5 border border-teal-500/20 rounded-xl hover:bg-teal-500/10 transition-all cursor-pointer"
            >
              Load Sample
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Input Pane */}
        <div className="xl:col-span-5 flex flex-col space-y-5">
          {/* Date Range Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800/60 bg-slate-950/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Date Range Filter</h2>
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-350 transition-colors cursor-pointer uppercase tracking-wide"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="reconcile-start"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                id="reconcile-end"
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Raw Schedule Input Card */}
          <div className="flex flex-col h-full min-h-[420px] xl:min-h-[450px] rounded-2xl border border-slate-800/60 bg-slate-950/40 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900/60 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-teal-400" />
                <h2 className="text-sm font-semibold text-slate-200">Raw Schedule Input</h2>
              </div>
              <span className="text-xs text-slate-500">
                {inputText ? inputText.split('\n').filter(Boolean).length : 0} lines detected
              </span>
            </div>
            
            {!inputText && !showTextarea ? (
              <div 
                className={`flex-1 m-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 transition-all duration-300 cursor-pointer ${
                  isDragging 
                    ? 'border-teal-400 bg-teal-950/25 ring-2 ring-teal-500/35' 
                    : 'border-slate-800/80 bg-slate-950/20 hover:border-teal-500/50 hover:bg-slate-900/10'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                  <Upload className={`w-7 h-7 text-teal-400 ${isDragging ? 'animate-bounce' : ''}`} />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Drag & Drop Schedule File</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                  Supports .txt and .csv files. Drop your file here or click to browse.
                </p>
                <div className="flex gap-2.5 mt-5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={triggerFileSelect}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 transition-all cursor-pointer"
                  >
                    Browse Files
                  </button>
                  <button
                    onClick={() => setShowTextarea(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-350 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-all cursor-pointer"
                  >
                    Paste Manually
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="flex-1 p-5 relative flex flex-col"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={loading}
                  placeholder="Paste sports schedule plain text here, or drag and drop a .txt/.csv file..."
                  className={`w-full flex-grow h-[300px] xl:h-[330px] font-mono text-sm bg-slate-950/80 text-slate-300 placeholder-slate-600 border rounded-xl p-4 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 focus:outline-none resize-none transition-all disabled:opacity-60 ${
                    isDragging 
                      ? 'border-teal-400 ring-2 ring-teal-500/30 bg-teal-950/20' 
                      : 'border-slate-800/60'
                  }`}
                />
                {isDragging && (
                  <div className="absolute inset-5 bg-teal-950/50 border-2 border-dashed border-teal-400 rounded-xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
                    <Upload className="w-10 h-10 text-teal-400 animate-bounce mb-2" />
                    <span className="text-sm font-semibold text-teal-300">Drop file here to import & reconcile</span>
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-4 border-t border-slate-900/60 bg-slate-950/40 flex items-center justify-between">
              <div>
                {(inputText || showTextarea) && (
                  <button
                    onClick={() => { setInputText(''); setShowTextarea(false); }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium underline"
                  >
                    Reset to Uploader
                  </button>
                )}
              </div>
              <button
                onClick={handleReconcile}
                disabled={loading || (!inputText.trim())}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Run Reconciliation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Pane */}
        <div className="xl:col-span-7 flex flex-col space-y-6">
          {/* Dashboard Summary Widgets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Parsed Widget */}
            <div className="p-4 rounded-2xl border border-slate-800/60 bg-slate-950/30">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Parsed</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{filteredResult.allParsed.length}</span>
                <span className="text-[10px] text-slate-500">events</span>
              </div>
            </div>

            {/* Matched Widget */}
            <button
              onClick={() => setActiveTab('matched')}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                activeTab === 'matched' 
                  ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[inset_0_0_15px_-4px_rgba(16,185,129,0.1)]' 
                  : 'border-slate-800/60 bg-slate-950/30 hover:border-slate-800'
              }`}
            >
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Matched</span>
              <div className="mt-1 flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span className="text-2xl font-bold">{filteredResult.matched.length}</span>
              </div>
            </button>

            {/* Conflicts Widget */}
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                activeTab === 'conflicts' 
                  ? 'border-amber-500/30 bg-amber-500/5 shadow-[inset_0_0_15px_-4px_rgba(245,158,11,0.1)]' 
                  : 'border-slate-800/60 bg-slate-950/30 hover:border-slate-800'
              }`}
            >
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Conflicts</span>
              <div className="mt-1 flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4.5 h-4.5" />
                <span className="text-2xl font-bold">{filteredResult.conflicts.length}</span>
              </div>
            </button>

            {/* Manual Review Widget */}
            <button
              onClick={() => setActiveTab('manual_review')}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                activeTab === 'manual_review' 
                  ? 'border-rose-500/30 bg-rose-500/5 shadow-[inset_0_0_15px_-4px_rgba(239,68,68,0.1)]' 
                  : 'border-slate-800/60 bg-slate-950/30 hover:border-slate-800'
              }`}
            >
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Review</span>
              <div className="mt-1 flex items-center gap-1.5 text-rose-400">
                <HelpCircle className="w-4.5 h-4.5" />
                <span className="text-2xl font-bold">{filteredResult.manual_review.length}</span>
              </div>
            </button>
          </div>

          {/* Reconciliation Outcome Alert Banners */}
          {(filteredResult.conflicts.length > 0 || filteredResult.manual_review.length > 0) && (
            <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 backdrop-blur-md flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-amber-450 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-300">
                  Mismatches & Formatting Issues Detected
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The system detected <strong>{filteredResult.conflicts.length} mismatch(es)/missing database record(s)</strong> and <strong>{filteredResult.manual_review.length} formatting error(s)</strong>. Please review the details below.
                </p>
              </div>
            </div>
          )}

          {filteredResult.allParsed.length > 0 && filteredResult.conflicts.length === 0 && filteredResult.manual_review.length === 0 && filteredResult.matched.length > 0 && (
            <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 backdrop-blur-md flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.05)] animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-300">
                  Verification Successful
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All <strong>{filteredResult.matched.length} event(s)</strong> match the master database records perfectly. Ready to export.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Details Container */}
          <div className="flex-1 flex flex-col rounded-2xl border border-slate-800/60 bg-slate-950/40 backdrop-blur-sm overflow-hidden min-h-[350px] relative">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                <span className="text-sm font-medium text-slate-300">Reconciling with database...</span>
              </div>
            )}

            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-900/60 bg-slate-950/40 px-4">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('matched')}
                  className={`px-4 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === 'matched' 
                      ? 'border-emerald-500 text-emerald-400' 
                      : 'border-transparent text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Matched ({filteredResult.matched.length})
                </button>
                <button
                  onClick={() => setActiveTab('conflicts')}
                  className={`px-4 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === 'conflicts' 
                      ? 'border-amber-500 text-amber-400' 
                      : 'border-transparent text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Conflicts ({filteredResult.conflicts.length})
                </button>
                <button
                  onClick={() => setActiveTab('manual_review')}
                  className={`px-4 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeTab === 'manual_review' 
                      ? 'border-rose-500 text-rose-400' 
                      : 'border-transparent text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Manual Review ({filteredResult.manual_review.length})
                </button>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/35 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Report
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[420px]">
              {activeTab === 'matched' && (
                <div className="space-y-4">
                  {filteredResult.matched.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <CheckCircle2 className="w-10 h-10 text-slate-700 mb-3" />
                      <p className="text-sm">No matched events found.</p>
                    </div>
                  ) : (
                    filteredResult.matched.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex flex-col md:flex-row justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                            <Layers className="w-3 h-3" /> {item.parsed.league || 'General League'}
                          </span>
                          <h3 className="text-sm font-bold text-slate-100">{item.parsed.eventName}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {item.parsed.date || 'Unspecified Date'}
                            </span>
                            <span>•</span>
                            <span>Time: {item.parsed.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Verified Match
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'conflicts' && (
                <div className="space-y-4">
                  {filteredResult.conflicts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <CheckCircle2 className="w-10 h-10 text-slate-700 mb-3" />
                      <p className="text-sm">Excellent! No database conflicts detected.</p>
                    </div>
                  ) : (
                    filteredResult.conflicts.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3"
                      >
                        {/* Conflict Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                              <AlertCircle className="w-3 h-3" /> {item.field === 'not_found' ? 'Not In Database' : item.field === 'missing_in_import' ? 'Missing In Imported Schedule' : 'Conflict Found'}
                            </span>
                            <h3 className="text-sm font-bold text-slate-100 mt-1">{item.parsed?.eventName || item.db?.eventName}</h3>
                          </div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.field === 'not_found' ? 'Missing DB Record' : item.field === 'missing_in_import' ? 'Missing in Import' : 'Time Discrepancy'}
                          </span>
                        </div>

                        {/* Comparative Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                          {/* Parsed Schedule Card */}
                          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-slate-500 font-semibold block mb-1">Parsed Schedule:</span>
                            {item.parsed ? (
                              <div className="space-y-1 text-slate-350">
                                <div>Date: <span className="text-slate-200">{item.parsed.date || 'Unspecified'}</span></div>
                                <div>Time: <span className="text-amber-400 font-semibold">{item.parsed.time}</span></div>
                                <div>League: <span className="text-slate-200">{item.parsed.league || 'Unspecified'}</span></div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-rose-400/80 italic py-2">
                                Missing from imported schedule
                              </div>
                            )}
                          </div>

                          {/* Database Card */}
                          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-slate-500 font-semibold block mb-1">Master Database:</span>
                            {item.db ? (
                              <div className="space-y-1 text-slate-350">
                                <div>Date: <span className="text-slate-200">{item.db.date}</span></div>
                                <div>Time: <span className="text-emerald-400 font-semibold">{item.db.time}</span></div>
                                <div>League: <span className="text-slate-200">{item.db.league}</span></div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-slate-500 italic py-2">
                                No matching entry found
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Daily Database Events Context */}
                        {(() => {
                          const targetDate = item.parsed?.date || item.db?.date;
                          if (!targetDate) return null;
                          const dailyEvs = dbEvents.filter(ev => ev.date === targetDate);
                          
                          // Fallback: If for some reason the calendar service didn't return this conflict's db record, add it manually
                          if (item.db && !dailyEvs.some(ev => ev.id === item.db?.id)) {
                            dailyEvs.push(item.db);
                          }
                          
                          return (
                            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs space-y-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                All Database Events Scheduled for {targetDate}:
                              </div>
                              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                {dailyEvs.length === 0 ? (
                                  <span className="text-slate-500 italic">No master database records found for this date.</span>
                                ) : (
                                  dailyEvs.map((ev, eIdx) => {
                                    const isSelf = ev.id === item.db?.id;
                                    return (
                                      <div 
                                        key={eIdx} 
                                        className={`text-[10.5px] px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
                                          isSelf 
                                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 font-semibold shadow-[0_0_10px_rgba(20,184,166,0.15)]' 
                                            : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                                        }`}
                                      >
                                        <span className="font-mono text-[10px] text-slate-500 font-semibold">{ev.time}</span>
                                        <span className="text-slate-200">{ev.eventName}</span>
                                        <span className="text-[9px] px-1 rounded bg-slate-800/80 text-slate-500 font-mono">{ev.league}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Error Reason */}
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/40 text-xs text-amber-300/90 border border-amber-500/10">
                          <Info className="w-4 h-4 flex-shrink-0" />
                          <span>{item.reason}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'manual_review' && (
                <div className="space-y-4">
                  {filteredResult.manual_review.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <CheckCircle2 className="w-10 h-10 text-slate-700 mb-3" />
                      <p className="text-sm">Hooray! No lines require manual review.</p>
                    </div>
                  ) : (
                    filteredResult.manual_review.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-xl border border-rose-500/15 bg-rose-500/5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">
                            Requires Human Assessment
                          </span>
                        </div>
                        <div className="font-mono text-sm bg-slate-950/80 p-3 rounded-lg border border-slate-900 text-slate-300 break-words">
                          "{item.originalLine}"
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-1">
                          <div>
                            <span className="text-slate-500">Date Context:</span> {item.dateContext || 'Unknown'}
                          </div>
                          <div>
                            <span className="text-slate-500">League Context:</span> {item.leagueContext || 'Unknown'}
                          </div>
                        </div>
                        <div className="text-xs text-rose-300/80 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{item.reason}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Format Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel border-slate-800/80 w-full max-w-md p-6 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-1">Export Reconciliation Report</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">
              Choose the format to download the audit trail report.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setReportFormat('txt')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  reportFormat === 'txt'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-355 hover:border-slate-700'
                }`}
              >
                <span className="text-2xl mb-1">📄</span>
                <span className="text-sm font-bold">Plain Text</span>
                <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Formatted Log (.txt)</span>
              </button>
              <button
                onClick={() => setReportFormat('csv')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  reportFormat === 'csv'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-355 hover:border-slate-700'
                }`}
              >
                <span className="text-2xl mb-1">📊</span>
                <span className="text-sm font-bold">CSV Sheet</span>
                <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Tabular Data (.csv)</span>
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeExportReport}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 transition-all cursor-pointer shadow-lg shadow-teal-500/10"
              >
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Explanation Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel border-slate-800/80 w-full max-w-xl p-6 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header with Language Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400 animate-pulse" />
                {infoLang === 'th' ? 'หลักการทำงานของระบบ Reconciler' : 'How Reconciler Works'}
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
                    หน้าต่างนี้ทำหน้าที่เปรียบเทียบตารางแข่งขันดิบที่คุณคัดลอกหรืออัปโหลดเข้ามา กับตารางการแข่งจริงที่บันทึกอยู่ในระบบ เพื่อดูว่าตรงกันหรือไม่ หรือมีเวลาการแข่งใดขัดแย้งกัน
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-emerald-400"></span>
                        รูปแบบที่ระบบรองรับ (Supported Formats)
                      </h4>
                      <p className="text-xs text-slate-400 mb-2">
                        เพื่อให้ระเบียบการเปรียบเทียบข้อมูลทำงานได้สมบูรณ์ ตารางที่นำเข้าควรจัดเรียงในลักษณะนี้:
                      </p>
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-350 space-y-1">
                        <div>SUNDAY 14 JUN <span className="text-slate-500 font-sans italic text-[10px] ml-2">(ระบุวันและวันที่ภาษาอังกฤษอย่างชัดเจน)</span></div>
                        <div>FIFA WORLD CUP 2026 <span className="text-slate-500 font-sans italic text-[10px] ml-2">(ระบุชื่อลีกบรรทัดถัดมา)</span></div>
                        <div>05:00 AM | Brazil vs Morocco <span className="text-slate-500 font-sans italic text-[10px] ml-2">(ระบุเวลา AM/PM คั่นด้วยเครื่องหมาย | และคู่ทีม)</span></div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-rose-500"></span>
                        รูปแบบที่ไม่รองรับ / ต้องใช้คนตรวจทาน (Unsupported Formats)
                      </h4>
                      <p className="text-xs text-slate-400 mb-2">
                        หากนำข้อมูลในลักษณะต่อไปนี้เข้าระบบ ระบบจะไม่สามารถจับคู่ได้อัตโนมัติ และจะส่งผลลัพธ์ไปที่แท็บ <strong className="text-rose-400">Manual Review</strong> เพื่อให้คุณตรวจเช็กเอง:
                      </p>
                      <ul className="list-disc pl-4 space-y-2 text-xs text-slate-400">
                        <li>
                          <strong>เขียนรายการแข่งขันโดยไม่มีวันระบุข้างบน (Floating Entries):</strong> เขียนชื่อคู่ทีมและเวลาแข่งเลยโดยไม่มีหัวข้อบอกวัน (ระบบจะไม่รู้ว่าแมตช์นี้แข่งวันไหน)
                        </li>
                        <li>
                          <strong>ไม่ใส่เวลาแข่งขัน (Missing Time):</strong> บอกแต่ชื่อการแข่งขันแต่ไม่ได้ระบุเวลาแข่งขัน เช่น <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px] text-slate-300">Women's Singles Final</code> (ระบบตรวจหาเวลาไม่พบ)
                        </li>
                        <li>
                          <strong>พิมพ์รูปแบบเวลาไม่ถูกต้อง:</strong> ลืมระบุช่วงเวลาเช้า/เย็น (AM/PM) หรือไม่ระบุคู่แข่งขันถัดจากข้อความเวลา
                        </li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-800/40">
                      <h4 className="font-bold text-slate-100 mb-1.5">ผลลัพธ์การกระทบยอด (Reconciliation Result)</h4>
                      <p className="text-xs text-slate-400">
                        เมื่อวิเคราะห์เสร็จ ระบบจะแสดงรายการแยกตามสี:
                      </p>
                      <ul className="list-disc pl-4 mt-1 space-y-1.5 text-xs text-slate-400">
                        <li><span className="text-emerald-400 font-semibold">Matched:</span> ข้อมูลตรงกันครบถ้วนทั้งวัน เวลาแข่งขัน และชื่อคู่แข่งขัน</li>
                        <li><span className="text-amber-400 font-semibold">Conflicts:</span> ตารางที่นำเข้ากับตารางในระบบหลักระบุเวลาแข่งขันไม่ตรงกัน หรือไม่พบแมตช์นี้อยู่ในระบบ (อาจเกิดจากบันทึกตกหล่น)</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-405 mb-4">
                    This screen compares the raw schedule document you pasted or uploaded against the company's master database to ensure match timings and details correspond perfectly.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-emerald-400"></span>
                        Supported Formats
                      </h4>
                      <p className="text-xs text-slate-400 mb-2">
                        For optimal results, ensure your document aligns with this structure:
                      </p>
                      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-350 space-y-1">
                        <div>SUNDAY 14 JUN <span className="text-slate-500 font-sans italic text-[10px] ml-2">(Specify the weekday and date clearly in English)</span></div>
                        <div>FIFA WORLD CUP 2026 <span className="text-slate-500 font-sans italic text-[10px] ml-2">(Specify the league name on the next line)</span></div>
                        <div>05:00 AM | Brazil vs Morocco <span className="text-slate-500 font-sans italic text-[10px] ml-2">(Use AM/PM time separated by | and match teams)</span></div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-rose-500"></span>
                        Unsupported Formats (Fails to Reconcile)
                      </h4>
                      <p className="text-xs text-slate-400 mb-2">
                        If your text contains these patterns, the system cannot parse them automatically and will categorize them under <strong className="text-rose-400">Manual Review</strong>:
                      </p>
                      <ul className="list-disc pl-4 space-y-2 text-xs text-slate-400">
                        <li>
                          <strong>Floating Matches:</strong> Listing matches without a Date Header above them (the system cannot determine the match day).
                        </li>
                        <li>
                          <strong>Missing Time:</strong> Stating the match title but omitting the kick-off time entirely, e.g. <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[11px] text-slate-300">Women's Singles Final</code> (no time format detected).
                        </li>
                        <li>
                          <strong>Malformed Timings:</strong> Omitting the AM/PM designation or leaving out the match teams after the separator.
                        </li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-800/40">
                      <h4 className="font-bold text-slate-100 mb-1.5">Reconciliation Results</h4>
                      <p className="text-xs text-slate-400">
                        After analysis, records are classified into:
                      </p>
                      <ul className="list-disc pl-4 mt-1 space-y-1.5 text-xs text-slate-400">
                        <li><span className="text-emerald-400 font-semibold">Matched:</span> Date, time, and team names match database records perfectly.</li>
                        <li><span className="text-amber-400 font-semibold">Conflicts:</span> The match exists in the master database but schedule timings differ, or no matching event was found in the database.</li>
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
