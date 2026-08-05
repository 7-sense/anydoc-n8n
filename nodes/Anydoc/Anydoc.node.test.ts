import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Anydoc } from './Anydoc.node';

function executionContext(
	items: INodeExecutionData[],
	parameters: Record<string, unknown> = {},
	continueOnFail = false,
): IExecuteFunctions {
	return {
		continueOnFail: () => continueOnFail,
		getInputData: () => items,
		getNode: () => ({ name: 'Anydoc', type: 'anydoc', typeVersion: 1, position: [0, 0] }),
		getNodeParameter: (name: string) => {
			const defaults: Record<string, unknown> = {
				includeSourceMetadata: true,
				inputBinaryField: 'data',
				inputFormat: 'auto',
				markdownJsonField: 'markdown',
				outputBinaryField: 'markdown',
				outputFileName: '',
				outputMode: 'both',
			};
			return parameters[name] ?? defaults[name];
		},
		helpers: {
			assertBinaryData: (itemIndex: number, propertyName: string) => {
				const binary = items[itemIndex].binary?.[propertyName];
				if (!binary) {
					throw new Error(`Missing binary field "${propertyName}"`);
				}
				return binary;
			},
			getBinaryDataBuffer: async (itemIndex: number, propertyName: string) => {
				const binary = items[itemIndex].binary?.[propertyName];
				if (!binary) {
					throw new Error(`Missing binary field "${propertyName}"`);
				}
				return Buffer.from(binary.data, 'base64');
			},
			prepareBinaryData: async (data: Buffer, fileName?: string, mimeType?: string) => ({
				data: data.toString('base64'),
				fileName,
				mimeType: mimeType ?? 'application/octet-stream',
			}),
		},
	} as unknown as IExecuteFunctions;
}

describe('Anydoc node', () => {
	it('converts every input item and preserves item linking', async () => {
		const items: INodeExecutionData[] = [
			{
				json: { id: 1 },
				binary: {
					data: {
						data: Buffer.from('name,score\nAda,10\n').toString('base64'),
						fileName: 'scores.csv',
						mimeType: 'text/csv',
					},
				},
			},
			{
				json: { id: 2 },
				binary: {
					data: {
						data: Buffer.from('{\\rtf1\\ansi Hello}').toString('base64'),
						fileName: 'greeting.rtf',
						mimeType: 'application/rtf',
					},
				},
			},
		];
		const node = new Anydoc();

		const [output] = await node.execute.call(executionContext(items));

		expect(output).toHaveLength(2);
		expect(output[0].pairedItem).toEqual({ item: 0 });
		expect(output[0].json.markdown).toContain('| Ada | 10 |');
		expect(output[0].json.anydoc).toMatchObject({
			format: 'csv',
			sourceFileName: 'scores.csv',
		});
		expect(output[0].binary?.markdown.fileName).toBe('scores.md');
		expect(output[0].binary?.markdown.mimeType).toBe('text/markdown');
		expect(output[1].pairedItem).toEqual({ item: 1 });
		expect(output[1].json.markdown).toContain('Hello');
	});

	it('supports file-only output without adding Markdown to JSON', async () => {
		const items: INodeExecutionData[] = [
			{
				json: { id: 1 },
				binary: {
					source: {
						data: Buffer.from('name,score\nAda,10\n').toString('base64'),
						fileName: 'scores.csv',
						mimeType: 'text/csv',
					},
				},
			},
		];
		const context = executionContext(items, {
			inputBinaryField: 'source',
			outputBinaryField: 'result',
			outputFileName: 'converted.md',
			outputMode: 'file',
		});
		const node = new Anydoc();

		const [output] = await node.execute.call(context);

		expect(output[0].json.markdown).toBeUndefined();
		expect(output[0].binary?.source).toEqual(items[0].binary?.source);
		expect(output[0].binary?.result.fileName).toBe('converted.md');
	});

	it('returns an error item when continue on fail is enabled', async () => {
		const items: INodeExecutionData[] = [
			{
				json: { id: 1 },
				binary: {
					data: {
						data: Buffer.from('plain text').toString('base64'),
						fileName: 'notes.txt',
						mimeType: 'text/plain',
					},
				},
			},
		];
		const node = new Anydoc();

		const [output] = await node.execute.call(executionContext(items, {}, true));

		expect(output).toEqual([
			expect.objectContaining({
				json: expect.objectContaining({
					id: 1,
					error: expect.stringContaining('Unsupported or unrecognized'),
				}),
				pairedItem: { item: 0 },
			}),
		]);
	});
});
