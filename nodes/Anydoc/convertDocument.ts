import {
	Format,
	formatFromBytes,
	formatFromExtension,
	formatFromPath,
	toMarkdownBytes,
} from '@firecrawl/anydoc';

export const AUTO_FORMAT = 'auto';

export type InputFormat = Format | typeof AUTO_FORMAT;

export interface ConversionResult {
	markdown: string;
	format: Format;
}

const MIME_FORMATS: Readonly<Record<string, Format>> = {
	'application/epub+zip': Format.epub,
	'application/msword': Format.doc,
	'application/pdf': Format.pdf,
	'application/rtf': Format.rtf,
	'application/vnd.ms-excel': Format.xlsx,
	'application/vnd.ms-excel.sheet.binary.macroenabled.12': Format.xlsx,
	'application/vnd.ms-excel.sheet.macroenabled.12': Format.xlsx,
	'application/vnd.ms-powerpoint': Format.ppt,
	'application/vnd.ms-powerpoint.presentation.macroenabled.12': Format.pptx,
	'application/vnd.ms-powerpoint.slideshow.macroenabled.12': Format.pptx,
	'application/vnd.ms-word.document.macroenabled.12': Format.docx,
	'application/vnd.oasis.opendocument.presentation': Format.odp,
	'application/vnd.oasis.opendocument.spreadsheet': Format.ods,
	'application/vnd.oasis.opendocument.text': Format.odt,
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': Format.pptx,
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Format.xlsx,
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': Format.docx,
	'text/csv': Format.csv,
	'text/rtf': Format.rtf,
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
