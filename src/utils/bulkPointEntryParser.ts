export interface ParsedBulkPointEntry {
  line: number;
  raw: string;
  studentId: string;
  points: number;
  eventName: string;
  notes: string;
}

export interface ParsedBulkPointEntries {
  entries: ParsedBulkPointEntry[];
  invalidLines: Array<{ line: number; raw: string }>;
}

function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < row.length; index++) {
    const character = row[index];
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseBulkPointEntries(text: string): ParsedBulkPointEntries {
  const entries: ParsedBulkPointEntry[] = [];
  const invalidLines: ParsedBulkPointEntries['invalidLines'] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const cells = trimmed.includes('\t')
      ? trimmed.split('\t').map(cell => cell.trim())
      : parseCsvRow(trimmed);
    if (index === 0 && /^(student\s*id|student\s*number|id)$/i.test(cells[0] || '')) return;

    const [studentId, pointsText, eventName, ...notes] = cells;
    const points = Number(pointsText);
    if (!/^\d{9,10}$/.test(studentId || '') || !Number.isFinite(points) || points <= 0 || !eventName?.trim()) {
      invalidLines.push({ line: index + 1, raw });
      return;
    }

    entries.push({
      line: index + 1,
      raw,
      studentId,
      points: Math.round(points * 10) / 10,
      eventName: eventName.trim(),
      notes: notes.join(', ').trim()
    });
  });

  return { entries, invalidLines };
}
