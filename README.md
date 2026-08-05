# n8n-nodes-anydoc

An [n8n](https://n8n.io/) community node that converts documents to clean,
LLM-friendly GitHub-Flavored Markdown with
[@firecrawl/anydoc](https://github.com/firecrawl/anydoc).

Conversion runs locally. It doesn't require credentials or send documents to an external service.

## Supported formats

| Family | Extensions |
| --- | --- |
| Word | `.doc`, `.docx`, `.docm` |
| PowerPoint | `.ppt`, `.pps`, `.pot`, `.pptx`, `.pptm`, `.ppsx`, `.ppsm` |
| Excel | `.xls`, `.xlsx`, `.xlsm`, `.xlsb` |
| OpenDocument | `.odt`, `.ods`, `.odp` |
| Other | `.rtf`, `.epub`, `.csv`, `.pdf` |

PDF conversion supports text-based PDFs. Scanned or image-only PDFs require a separate OCR
service. Embedded images are represented by their alt text because Markdown can't contain the
image bytes.

## Installation

This node contains a native dependency and is intended for self-hosted n8n.

Install `n8n-nodes-anydoc` from **Settings → Community Nodes** in n8n, or install it in the
community nodes directory:

```bash
npm install n8n-nodes-anydoc
```

Restart n8n after installation.

The package requires Node.js 22 or newer. Prebuilt anydoc binaries are available for common
Linux glibc and musl, macOS, and Windows environments on x64 and ARM64.

## Usage

1. Add a node that produces binary document data, such as an HTTP Request, Form, or Read/Write
   Files from Disk node.
2. Add the **Anydoc** node.
3. Set **Input Binary Field** to the field containing the source document. The usual value is
   `data`.
4. Choose whether to return Markdown as text, a `.md` binary file, or both.
5. Execute the workflow.

Auto detection inspects the document bytes first and then falls back to the source filename and
MIME type. CSV has no binary signature, so unnamed CSV input needs either a `text/csv` MIME type
or an explicit **Input Format** selection.

By default, the node adds:

- Markdown text at `json.markdown`
- A Markdown file at `binary.markdown`
- Conversion metadata at `json.anydoc`

All input JSON and binary fields are preserved. Output items are linked to their corresponding
input items.

## Limitations

- Plain text, Markdown, HTML, and image files aren't anydoc input formats.
- Scanned PDFs aren't OCRed.
- Embedded image bytes aren't copied into the Markdown output.
- Large documents are loaded into worker memory as a buffer, following n8n's binary-data helper
  API.
- Because anydoc is an external native dependency, this package isn't eligible for n8n verified
  community-node distribution under the current no-runtime-dependencies requirement.

## Development

```bash
npm install
npm test
npm run lint
npm run build
```

Run a local n8n development instance with:

```bash
npm run dev
```

## License

[MIT](LICENSE.md)
