// Client-side .docx text extraction: unzip the package with DecompressionStream
// and read paragraph text out of word/document.xml. No server round-trip.

function readU32(view: DataView, off: number) {
  return view.getUint32(off, true);
}
function readU16(view: DataView, off: number) {
  return view.getUint16(off, true);
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function extractEntry(buffer: ArrayBuffer, wanted: string): Promise<string | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Locate End Of Central Directory record.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i--) {
    if (readU32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = readU16(view, eocd + 10);
  let ptr = readU32(view, eocd + 16);
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (readU32(view, ptr) !== 0x02014b50) break;
    const method = readU16(view, ptr + 10);
    const compressedSize = readU32(view, ptr + 20);
    const nameLen = readU16(view, ptr + 28);
    const extraLen = readU16(view, ptr + 30);
    const commentLen = readU16(view, ptr + 32);
    const localOffset = readU32(view, ptr + 42);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

    if (name === wanted) {
      const lNameLen = readU16(view, localOffset + 26);
      const lExtraLen = readU16(view, localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      const out = method === 0 ? data : await inflateRaw(data);
      return decoder.decode(out);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function unescapeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&");
}

export function linesFromDocumentXml(xml: string): string[] {
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  const out: string[] = [];
  for (const p of paragraphs) {
    const runs = p.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [];
    const text = runs
      .map((r) => unescapeXml(r.replace(/<w:t(?:\s[^>]*)?>/, "").replace(/<\/w:t>$/, "")))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

export async function parseDocxLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const xml = await extractEntry(buffer, "word/document.xml");
  if (!xml) throw new Error("Could not read that Word file. Please save it as .docx and try again.");
  const lines = linesFromDocumentXml(xml);
  if (!lines.length) throw new Error("No text found in that document.");
  return lines;
}

export function linesFromPlainText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
