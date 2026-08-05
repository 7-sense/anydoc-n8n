import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	AUTO_FORMAT,
	convertDocument,
	markdownFileName,
	type InputFormat,
} from './convertDocument';

type OutputMode = 'both' | 'file' | 'text';

export class Anydoc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Anydoc',
		name: 'anydoc',
		icon: 'file:anydoc.svg',
		group: ['transform'],
		version: 1,
		description: 'Convert documents to LLM-friendly Markdown',
		defaults: {
			name: 'Anydoc',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Input Binary Field',
				name: 'inputBinaryField',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary field containing the document to convert',
			},
			{
				displayName: 'Input Format',
				name: 'inputFormat',
				type: 'options',
				default: AUTO_FORMAT,
				description:
					'Format of the input document. Auto detects from the content, filename, and MIME type.',
				options: [
					{ name: 'Auto Detect', value: AUTO_FORMAT },
					{ name: 'CSV', value: 'csv' },
					{ name: 'EPUB', value: 'epub' },
					{ name: 'Excel (.xls, .xlsx, .xlsm, .xlsb)', value: 'xlsx' },
					{ name: 'OpenDocument Presentation (.odp)', value: 'odp' },
					{ name: 'OpenDocument Spreadsheet (.ods)', value: 'ods' },
					{ name: 'OpenDocument Text (.odt)', value: 'odt' },
					{ name: 'PDF', value: 'pdf' },
					{ name: 'PowerPoint (.ppt, .pps, .pot)', value: 'ppt' },
					{ name: 'PowerPoint Open XML (.pptx, .pptm, .ppsx, .ppsm)', value: 'pptx' },
					{ name: 'Rich Text Format (.rtf)', value: 'rtf' },
					{ name: 'Word (.doc)', value: 'doc' },
					{ name: 'Word Open XML (.docx, .docm)', value: 'docx' },
				],
			},
			{
				displayName: 'Output',
				name: 'outputMode',
				type: 'options',
				default: 'both',
				description: 'Whether to return Markdown as text, a file, or both',
				options: [
					{ name: 'Text and File', value: 'both' },
					{ name: 'Text', value: 'text' },
					{ name: 'File', value: 'file' },
				],
			},
			{
				displayName: 'Markdown JSON Field',
				name: 'markdownJsonField',
				type: 'string',
				default: 'markdown',
				required: true,
				description: 'Field where the Markdown text will be written',
				displayOptions: {
					show: {
						outputMode: ['both', 'text'],
					},
				},
			},
			{
				displayName: 'Output Binary Field',
				name: 'outputBinaryField',
				type: 'string',
				default: 'markdown',
				required: true,
				description: 'Binary field where the Markdown file will be written',
				displayOptions: {
					show: {
						outputMode: ['both', 'file'],
					},
				},
			},
			{
				displayName: 'Output Filename',
				name: 'outputFileName',
				type: 'string',
				default: '',
				placeholder: 'document.md',
				description:
					'Filename for the Markdown file. Leave empty to derive it from the source filename.',
				displayOptions: {
					show: {
						outputMode: ['both', 'file'],
					},
				},
			},
			{
				displayName: 'Include Source Metadata',
				name: 'includeSourceMetadata',
				type: 'boolean',
				default: true,
				description:
					'Whether to add conversion details under the "anydoc" field in the output JSON',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];

			try {
				const inputBinaryField = this.getNodeParameter(
					'inputBinaryField',
					itemIndex,
				) as string;
				const inputFormat = this.getNodeParameter(
					'inputFormat',
					itemIndex,
					AUTO_FORMAT,
				) as InputFormat;
				const outputMode = this.getNodeParameter(
					'outputMode',
					itemIndex,
					'both',
				) as OutputMode;
				const includeSourceMetadata = this.getNodeParameter(
					'includeSourceMetadata',
					itemIndex,
					true,
				) as boolean;

				const inputBinary = this.helpers.assertBinaryData(itemIndex, inputBinaryField);
				const bytes = await this.helpers.getBinaryDataBuffer(itemIndex, inputBinaryField);
				const result = await convertDocument(
					bytes,
					inputFormat,
					inputBinary.fileName,
					inputBinary.mimeType,
				);

				const json = { ...item.json };
				if (outputMode === 'both' || outputMode === 'text') {
					const markdownJsonField = this.getNodeParameter(
						'markdownJsonField',
						itemIndex,
						'markdown',
					) as string;
					json[markdownJsonField] = result.markdown;
				}

				if (includeSourceMetadata) {
					json.anydoc = {
						format: result.format,
						sourceFileName: inputBinary.fileName ?? null,
						sourceMimeType: inputBinary.mimeType,
						characterCount: result.markdown.length,
					};
				}

				const outputItem: INodeExecutionData = {
					json,
					pairedItem: { item: itemIndex },
				};

				if (item.binary) {
					outputItem.binary = { ...item.binary };
				}

				if (outputMode === 'both' || outputMode === 'file') {
					const outputBinaryField = this.getNodeParameter(
						'outputBinaryField',
						itemIndex,
						'markdown',
					) as string;
					const configuredFileName = this.getNodeParameter(
						'outputFileName',
						itemIndex,
						'',
					) as string;
					const outputFileName =
						configuredFileName.trim() || markdownFileName(inputBinary.fileName);
					const markdownBinary = await this.helpers.prepareBinaryData(
						Buffer.from(result.markdown, 'utf8'),
						outputFileName,
						'text/markdown',
					);

					outputItem.binary = {
						...outputItem.binary,
						[outputBinaryField]: markdownBinary,
					};
				}

				returnData.push(outputItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							...item.json,
							error: error instanceof Error ? error.message : String(error),
						},
						binary: item.binary,
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
