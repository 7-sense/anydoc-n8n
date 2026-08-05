import {
	formatFromBytes,
	formatFromExtension,
	formatFromPath,
	toMarkdownBytes,
	type Format,
} from '@firecrawl/anydoc';

export const AUTO_FORMAT = 'auto';

export type InputFormat = Format | typeof AUTO_FORMAT;

export interface ConversionResult {
	markdown: string;
	format: Format;
}

const MIME_FORMATS: Readonly<Record<string, Format>> = {
	'application/epub+zip': 'epub',
	'application/pdf': 'pdf',
	'application/rtf': 'rtf',
	'application/vnd.ms-excel': 'xlsx',
	'application/vnd.ms-powerpoint': 'pptx',
	'application/vnd.ms-word': 'doc',
	'application/vnd.oasis.opendocument.presentation': 'odp',
	'application/vnd.oasis.opendocument.spreadsheet': 'ods',
	'application/vnd.oasis.opendocument.text': 'odt',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
	'text/csv': 'csv',
	'text/rtf': 'rtf',
};

function normalizeMimeType(mimeType?: string): string | undefined {
	return mimeType?.split(';', 1)[0]?.trim().toLowerCase() || undefined;
}

export function detectFormat(
	bytes: Uint8Array,
	fileName?: string,
	mimeType?: string,
): Format | null {
	const contentFormat = formatFromBytes(bytes);
	if (contentFormat !== null) {
		return contentFormat;
	}

	if (fileName) {
		const pathFormat = formatFromPath(fileName);
		if (pathFormat !== null) {
			return pathFormat;
		}

		const extension = fileName.match(/\.([^.\\/]+)$/)?.[1];
		if (extension) {
			const extensionFormat = formatFromExtension(extension);
			if (extensionFormat !== null) {
				return extensionFormat;
			}
		}
	}

	const normalizedMimeType = normalizeMimeType(mimeType);
	return normalizedMimeType ? (MIME_FORMATS[normalizedMimeType] ?? null) : null;
}

export async function convertDocument(
	bytes: Uint8Array,
	inputFormat: InputFormat,
	fileName?: string,
	mimeType?: string,
): Promise<ConversionResult> {
	const format =
		inputFormat === AUTO_FORMAT ? detectFormat(bytes, fileName, mimeType) : inputFormat;

	if (format === null) {
		throw new Error(
			'Unsupported or unrecognized document format. Provide a supported filename extension or choose the input format explicitly.',
		);
	}

	const markdown = await toMarkdownBytes(bytes, format);
	return { markdown, format };
}

export function markdownFileName(sourceFileName?: string): string {
	const baseName = sourceFileName?.split(/[\\/]/).pop()?.trim();
	if (!baseName) {
		return 'document.md';
	}

	const stem = baseName.replace(/\.[^.]+$/, '').trim();
	return `${stem || 'document'}.md`;
}
