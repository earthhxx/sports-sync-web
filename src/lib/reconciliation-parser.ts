export interface ParsedEvent {
  originalLine: string;
  date: string | null; // normalized YYYY-MM-DD
  dateRaw: string | null;
  league: string | null;
  time: string; // HH:MM AM/PM
  eventName: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface DBEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  league: string;
  eventName: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface ReconciliationResult {
  matched: Array<{ parsed: ParsedEvent; db: DBEvent }>;
  conflicts: Array<{ parsed: ParsedEvent | null; db: DBEvent | null; reason: string; field: 'time' | 'teams' | 'not_found' | 'missing_in_import' }>;
  manual_review: Array<{
    originalLine: string;
    reason: string;
    dateContext: string | null;
    leagueContext: string | null;
  }>;
}

// Normalize month name to MM format
function getMonthNumber(monthStr: string): string | null {
  const m = monthStr.toLowerCase();
  const months: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };
  return months[m] || null;
}

// Check if line is a Date
export function parseDateLine(line: string): { normalized: string; raw: string } | null {
  const cleanLine = line.trim();
  // Regex to match e.g. "SUNDAY 14 JUN" or "14 JUN" or "JUN 14"
  // Look for day of week (optional) and numeric day + month word
  const dateRegex = /\b(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY|MON|TUE|WED|THU|FRI|SAT|SUN)?\s*(\d{1,2})\s+([A-Za-z]{3,9})\b/i;
  const match = cleanLine.match(dateRegex);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthNum = getMonthNumber(match[2]);
    if (monthNum) {
      // Use 2026 as the default year for our simulation context
      return {
        normalized: `2026-${monthNum}-${day}`,
        raw: cleanLine,
      };
    }
  }
  
  return null;
}

// Normalise time format: e.g. "05:00 AM" or "5:00am" -> "05:00 AM"
function normalizeTime(timeStr: string): string {
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match) {
    const hr = match[1].padStart(2, '0');
    const min = match[2];
    const ampm = match[3];
    return `${hr}:${min} ${ampm}`;
  }
  return clean;
}

// Core text parser
export function parseScheduleText(text: string): { events: ParsedEvent[]; manualReviews: ReconciliationResult['manual_review'] } {
  const lines = text.split(/\r?\n/);
  const events: ParsedEvent[] = [];
  const manualReviews: ReconciliationResult['manual_review'] = [];

  let currentDate: string | null = null;
  let currentDateRaw: string | null = null;
  let currentLeague: string | null = null;

  // Time pattern check: matches HH:MM AM/PM
  const timeRegex = /\b(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue; // Skip empty lines
    }

    // 1. Check if it's a Date header
    const parsedDate = parseDateLine(line);
    if (parsedDate) {
      currentDate = parsedDate.normalized;
      currentDateRaw = parsedDate.raw;
      // Reset league when date changes if desired, but typically league headers are after the date
      currentLeague = null;
      continue;
    }

    // 2. Check if it contains a time (signaling a potential event line)
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      const parsedTimeRaw = timeMatch[0];
      const parsedTime = normalizeTime(parsedTimeRaw);

      // Extract details. Usually: Time | Details
      let eventDetailsStr = '';
      if (line.includes('|')) {
        const parts = line.split('|');
        // Find the non-time part
        const timePartIndex = parts.findIndex(p => p.includes(parsedTimeRaw));
        if (timePartIndex !== -1) {
          eventDetailsStr = parts.filter((_, idx) => idx !== timePartIndex).join('|').trim();
        } else {
          eventDetailsStr = parts[1]?.trim() || '';
        }
      } else {
        // Fallback: strip time from line
        eventDetailsStr = line.replace(parsedTimeRaw, '').replace(/^\s*\|\s*/, '').trim();
      }

      if (!eventDetailsStr) {
        manualReviews.push({
          originalLine: line,
          reason: 'Time found, but event name/details missing or malformed',
          dateContext: currentDateRaw,
          leagueContext: currentLeague,
        });
        continue;
      }

      // Check for "vs" separator
      let homeTeam: string | undefined;
      let awayTeam: string | undefined;
      const vsRegex = /\s+(?:vs|VS|v)\s+/;
      if (vsRegex.test(eventDetailsStr)) {
        const teamParts = eventDetailsStr.split(vsRegex);
        if (teamParts.length === 2) {
          homeTeam = teamParts[0].trim();
          awayTeam = teamParts[1].trim();
        }
      }

      events.push({
        originalLine: line,
        date: currentDate,
        dateRaw: currentDateRaw,
        league: currentLeague,
        time: parsedTime,
        eventName: eventDetailsStr,
        homeTeam,
        awayTeam,
      });
      continue;
    }

    // 3. If no time, check if it's a league header
    // Leagues are typically UPPERCASE strings, containing words like CUP, ROUND, CHAMPIONSHIPS, FORMULA, WTA, ATP, etc.
    // Let's assume any line that:
    // - Is mostly UPPERCASE (has letters, and at most 2 lowercase letters - e.g., WTA 500, or Mixed)
    // - Is not empty, not a date, and not a time line.
    const lowercaseCount = (line.match(/[a-z]/g) || []).length;
    
    // Threshold: if a line is short and uppercase, or has very few lowercase letters relative to length
    const isLeague = lowercaseCount <= 2 || /\b(?:LEAGUE|CUP|ROUND|CHAMPIONSHIP|SERIES|GRAND PRIX|TOURNAMENT|WTA|ATP|FRIENDLIES)\b/i.test(line);

    if (isLeague) {
      currentLeague = line.trim();
    } else {
      // 4. Otherwise, it's a line that contains event-like information but failed parsing (e.g. "Women's Singles Final" - no time)
      manualReviews.push({
        originalLine: line,
        reason: 'Event missing scheduled time format (HH:MM AM/PM)',
        dateContext: currentDateRaw,
        leagueContext: currentLeague,
      });
    }
  }

  return { events, manualReviews };
}

// Compare parsed events to Master DB
export function reconcileEvents(parsed: ParsedEvent[], db: DBEvent[]): ReconciliationResult {
  const matched: ReconciliationResult['matched'] = [];
  const conflicts: ReconciliationResult['conflicts'] = [];
  const manualReviews: ReconciliationResult['manual_review'] = [];

  for (const parsedEvent of parsed) {
    // Attempt to find a matching database record
    // We match on date, and either team names OR eventName similarity
    const candidates = db.filter(dbEv => dbEv.date === parsedEvent.date);

    let bestMatch: DBEvent | null = null;
    let matchReason: 'time' | 'teams' | 'not_found' = 'not_found';

    for (const cand of candidates) {
      // 1. Team-based match
      if (parsedEvent.homeTeam && parsedEvent.awayTeam && cand.homeTeam && cand.awayTeam) {
        const homeMatch = parsedEvent.homeTeam.toLowerCase() === cand.homeTeam.toLowerCase();
        const awayMatch = parsedEvent.awayTeam.toLowerCase() === cand.awayTeam.toLowerCase();
        const invertedMatch = parsedEvent.homeTeam.toLowerCase() === cand.awayTeam.toLowerCase() && 
                              parsedEvent.awayTeam.toLowerCase() === cand.homeTeam.toLowerCase();
        
        if ((homeMatch && awayMatch) || invertedMatch) {
          bestMatch = cand;
          break;
        }
      }

      // 2. Exact or clean eventName match
      const pName = parsedEvent.eventName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cName = cand.eventName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (pName === cName || pName.includes(cName) || cName.includes(pName)) {
        bestMatch = cand;
        break;
      }
    }

    if (bestMatch) {
      // Normalize times for accurate comparison
      const normalizedParsedTime = normalizeTime(parsedEvent.time);
      const normalizedDbTime = normalizeTime(bestMatch.time);

      if (normalizedParsedTime === normalizedDbTime) {
        matched.push({ parsed: parsedEvent, db: bestMatch });
      } else {
        conflicts.push({
          parsed: parsedEvent,
          db: bestMatch,
          reason: `Time mismatch: Schedule says ${parsedEvent.time}, DB has ${bestMatch.time}`,
          field: 'time',
        });
      }
    } else {
      // Event parsed successfully but not found in DB
      conflicts.push({
        parsed: parsedEvent,
        db: null,
        reason: 'Event not found in the master database for this date',
        field: 'not_found',
      });
    }
  }

  return {
    matched,
    conflicts,
    manual_review: [], // UI will combine this with parsed manual reviews
  };
}
