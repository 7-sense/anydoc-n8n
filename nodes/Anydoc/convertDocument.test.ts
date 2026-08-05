import { describe, expect, it } from 'vitest';

import {
	AUTO_FORMAT,
	convertDocument,
	detectFormat,
	markdownFileName,
} from './convertDocument';

describe('detectFormat', () => {
	it('detects a signed format from its content', () => {
		const bytes = Buffer.from('{\\rtf1\\ansi Hello}');

		expect(detectFormat(bytes, 'wrong.csv', 'text/csv')).toBe('rtf');
	});

	it('uses the filename for signature-less CSV input', () => {
		const bytes = Buffer.from('name,score\nAda,10\n');

		expect(detectFormat(bytes, 'scores.csv')).toBe('csv');
	});

	it('uses the MIME type when a CSV filename is unavailable', () => {
		const bytes = Buffer.from('name,score\nAda,10\n');

		expect(detectFormat(bytes, undefined, 'text/csv; charset=utf-8')).toBe('csv');
	});

	it('returns null for unsupported input', () => {
		expect(detectFormat(Buffer.from('plain text'), 'notes.txt', 'text/plain')).toBeNull();
	});
});

describe('convertDocument', () => {
	it('converts CSV bytes to Markdown in auto mode', async () => {
		const result = await convertDocument(
			Buffer.from('name,score\nAda,10\n'),
			AUTO_FORMAT,
			'scores.csv',
			'text/csv',
		);

		expect(result.format).toBe('csv');
		expect(result.markdown).toContain('| Ada | 10 |');
	});

	it('honors an explicitly selected format', async () => {
		const result = await convertDocument(
			Buffer.from('{\\rtf1\\ansi\\b Hello\\b0  world}'),
			'rtf',
		);

		expect(result).toEqual({
			format: 'rtf',
			markdown: '**Hello** world\n',
		});
	});

	it('rejects unknown input with an actionable error', async () => {
		await expect(
			convertDocument(Buffer.from('plain text'), AUTO_FORMAT, 'notes.txt', 'text/plain'),
		).rejects.toThrow('choose the input format explicitly');
	});
});

describe('markdownFileName', () => {
	it.each([
		['report.docx', 'report.md'],
		['C:\\uploads\\quarterly.report.xlsx', 'quarterly.report.md'],
		['/tmp/slides.pptx', 'slides.md'],
		[undefined, 'document.md'],
		['.docx', 'document.md'],
	])('derives a safe Markdown name from %s', (input, expected) => {
		expect(markdownFileName(input)).toBe(expected);
	});
});
