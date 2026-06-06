const GOOGLE_VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

function encodeBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]);
  return btoa(binary);
}

function normalizeTextAnnotation(annotation: Record<string, unknown>) {
  const text = (annotation.text as string) || '';

  const lines: Array<{ content: string }> = [];
  const pages = annotation.pages as Array<Record<string, unknown>> | undefined;
  if (pages) {
    for (const page of pages) {
      const blocks = page.blocks as Array<Record<string, unknown>> | undefined;
      if (!blocks) continue;
      for (const block of blocks) {
        const paragraphs = block.paragraphs as Array<Record<string, unknown>> | undefined;
        if (!paragraphs) continue;
        for (const paragraph of paragraphs) {
          const words = paragraph.words as Array<Record<string, unknown>> | undefined;
          if (!words) continue;
          const lineText = words
            .map((w) => {
              const symbols = w.symbols as Array<Record<string, unknown>> | undefined;
              if (!symbols) return '';
              return symbols.map((s) => (s.text as string) || '').join('');
            })
            .filter(Boolean)
            .join(' ')
            .trim();
          if (lineText) lines.push({ content: lineText });
        }
      }
    }
  }

  if (lines.length === 0 && text) {
    text.split('\n').filter(Boolean).forEach((l) => lines.push({ content: l.trim() }));
  }

  return {
    content: text,
    pages: [{ lines }],
    tables: [],
  };
}

export async function analyzeWithGoogleVision(
  apiKey: string,
  buffer: Uint8Array,
  _contentType: string,
) {
  const base64 = encodeBase64(buffer);

  const response = await fetch(`${GOOGLE_VISION_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['vi', 'en'] },
      }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Google Vision API failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const firstResponse = data.responses?.[0];
  if (!firstResponse) throw new Error('Google Vision: empty response');

  if (firstResponse.error) {
    throw new Error(`Google Vision: ${firstResponse.error.message || JSON.stringify(firstResponse.error)}`);
  }

  const annotation = firstResponse.fullTextAnnotation;
  if (!annotation) throw new Error('Google Vision: no text detected in image');

  return { analyzeResult: normalizeTextAnnotation(annotation) };
}
