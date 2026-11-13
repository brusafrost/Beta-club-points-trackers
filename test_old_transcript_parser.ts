import assert from 'node:assert/strict';
import { parseOldTranscriptImportText } from './src/utils/oldTranscriptImportParser';

const parsed = parseOldTranscriptImportText(`123456789\t4.5\tPrevious Year Carryover\t2024-2025\n987654321, 3.0, Summer Service Credit, 2024-2025\nbad-id, 2.0, Needs review`);

assert.equal(parsed.rows.length, 3);
assert.equal(parsed.rows[0].studentId, '123456789');
assert.equal(parsed.rows[0].points, 4.5);
assert.equal(parsed.rows[0].sourceYear, '2024-2025');
assert.equal(parsed.rows[2].status, 'review');
assert.equal(parsed.summary.saved, 2);
assert.equal(parsed.summary.review, 1);

const selectedYear = parseOldTranscriptImportText('123456789\t4.5', '2025-2026');
assert.equal(selectedYear.rows[0].sourceYear, '2025-2026');

const rowYearOverridesDefault = parseOldTranscriptImportText('123456789\t4.5\t2023-2024', '2025-2026');
assert.equal(rowYearOverridesDefault.rows[0].sourceYear, '2023-2024');

console.log('old transcript parser test passed');
