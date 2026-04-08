import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, fetchEventForShare, getShareMetadata } from "./_share.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadHtmlTemplate() {
  const candidates = [
    path.join(__dirname, "..", "dist", "index.html"),
    path.join(__dirname, "..", "index.html"),
  ];

  for (const filename of candidates) {
    try {
      return await readFile(filename, "utf8");
    } catch {
      continue;
    }
  }

  throw new Error("Unable to find index.html template.");
}

function injectMetaTags(html, metadata) {
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(metadata.imageUrl)}" />`,
    `<meta property="og:image:type" content="${escapeHtml(metadata.imageType)}" />`,
    `<meta property="og:image:width" content="${escapeHtml(metadata.imageWidth)}" />`,
    `<meta property="og:image:height" content="${escapeHtml(metadata.imageHeight)}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(metadata.imageUrl)}" />`,
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`,
  ].join("\n    ");

  const nextHead = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace("</head>", `    ${tags}\n  </head>`);

  return nextHead;
}

export default async function handler(request, response) {
  try {
    const eventId = `${request.query.event ?? ""}`.trim();
    const [template, event] = await Promise.all([
      loadHtmlTemplate(),
      fetchEventForShare(eventId),
    ]);

    const metadata = getShareMetadata(event, request);
    const html = injectMetaTags(template, metadata);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.status(200).send(html);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
