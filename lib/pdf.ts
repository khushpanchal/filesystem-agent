// Reads the text of a PDF in the browser, so the file never leaves it.
// Each page starts with a "--- page N ---" line, so grep results can be traced to a page.
export async function pdfToText(file: File): Promise<string> {
  // Loaded on first use only (~130 KB gzipped + a separate worker file).
  // Legacy build: the modern one needs newer browser features than we can rely on.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const out: string[] = [];
  let hasText = false;

  try {
    const doc = await task.promise;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const { items } = await page.getTextContent();
      out.push(`--- page ${n} ---`);
      // Text comes in pieces; a piece with hasEOL ends a line
      let line = '';
      for (const item of items) {
        if (!('str' in item)) continue;
        line += item.str;
        if (item.hasEOL) {
          out.push(line.trimEnd());
          line = '';
        }
      }
      if (line) out.push(line.trimEnd());
      if (items.some((item) => 'str' in item && item.str.trim())) hasText = true;
      page.cleanup();
    }
  } catch (e) {
    if ((e as Error).name === 'PasswordException') {
      throw new Error(`${file.name}: password-protected PDFs aren't supported`);
    }
    throw new Error(`${file.name}: couldn't read this PDF`);
  } finally {
    await task.destroy();
  }

  if (!hasText) {
    throw new Error(`${file.name}: no text found (a scanned PDF?)`);
  }
  return out.join('\n');
}
