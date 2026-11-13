export interface ParsedOldTranscriptRow {
  id: string;
  studentId: string;
  studentName: string;
  points: number;
  category: string;
  sourceYear: string;
  notes?: string;
  status: 'saved' | 'review';
  raw: string;
}

export interface OldTranscriptImportSummary {
  total: number;
  saved: number;
  review: number;
  duplicate: number;
  skipped: number;
}

const cleanCell = (value: string): string => value.replace(/^['"]|['"]$/g, '').trim();

const findStudentId = (cells: string[]): string => {
  for (const cell of cells) {
    if (/^\d{9,10}$/.test(cell.trim())) return cell.trim();
  }
  return '';
};

const findPoints = (cells: string[]): number | null => {
  for (const cell of cells) {
    const trimmed = cell.trim();
    if (!trimmed) continue;
    if (/^\d{9,10}$/.test(trimmed)) continue;
    const match = trimmed.match(/-?\d+(?:\.\d+)?/);
    if (!match) continue;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) continue;
    if (trimmed.toLowerCase().includes('point')) return value;
    const nextIndex = cells.indexOf(cell);
    const remainder = cells.slice(nextIndex + 1).join(' ');
    if (/points?/i.test(remainder) || /pts?/i.test(remainder)) return value;
    if (trimmed === match[0] && !/^20\d{2}$/.test(trimmed)) return value;
  }
  return null;
};

const findSourceYear = (cells: string[]): string => {
  for (const cell of cells) {
    const match = cell.match(/20\d{2}-20\d{2}/) || cell.match(/20\d{2}/);
    if (match) return match[0];
  }
  return '';
};

const splitRowCells = (line: string): string[] => {
  const rawCells = line.split(/\t|\s*;\s*|\s*,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cleanCell);
  return rawCells.filter(value => value.length > 0);
};

export function parseOldTranscriptImportText(
  rawText: string,
  defaultSourceYear = '2024-2025'
): { rows: ParsedOldTranscriptRow[]; summary: OldTranscriptImportSummary } {
  const rows: ParsedOldTranscriptRow[] = [];
  const summary: OldTranscriptImportSummary = { total: 0, saved: 0, review: 0, duplicate: 0, skipped: 0 };

  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  lines.forEach((line, lineIndex) => {
    const cells = splitRowCells(line);
    if (cells.length === 0) return;

    const studentId = findStudentId(cells);
    const points = findPoints(cells);
    const sourceYear = findSourceYear(cells) || defaultSourceYear;
    const nameParts = cells.filter(cell => {
      const value = cell.trim();
      if (!value) return false;
      if (value === studentId) return false;
      if (!Number.isNaN(Number(value.replace(/[^\d.-]/g, '')))) return false;
      if (/20\d{2}/.test(value)) return false;
      if (/points?/i.test(value) || /hrs?/i.test(value) || /history|carryover|transcript|credit|service/i.test(value)) return false;
      return true;
    });
    const studentName = nameParts.join(' ') || `Student ${lineIndex + 1}`;

    const row: ParsedOldTranscriptRow = {
      id: `preview-${lineIndex + 1}`,
      studentId: studentId || '',
      studentName: studentName.trim() || 'Unmatched student',
      points: Number.isFinite(points) ? Number(points) : 0,
      category: 'Previous Year History',
      sourceYear,
      raw: line,
      status: studentId && Number.isFinite(points) && points >= 0 ? 'saved' : 'review'
    };

    if (row.status === 'saved') {
      summary.saved += 1;
    } else {
      summary.review += 1;
    }
    summary.total += 1;
    rows.push(row);
  });

  summary.skipped = summary.review + summary.duplicate;
  return { rows, summary };
}
