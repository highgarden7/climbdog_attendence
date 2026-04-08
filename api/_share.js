import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_NAME = "Climb Dog 🐾";
const DEFAULT_DESCRIPTION = "클라이밍 벙개 일정과 참여 현황을 확인해보세요.";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedEnv = null;

function loadLocalEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const filenames = [
    path.join(__dirname, "..", ".env.local"),
    path.join(__dirname, "..", ".env"),
  ];

  const env = {};
  for (const filename of filenames) {
    if (!existsSync(filename)) {
      continue;
    }

    const lines = readFileSync(filename, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trimStart().startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      env[key] = value;
    }
  }

  cachedEnv = env;
  return env;
}

function getEnv(name) {
  return process.env[name] || loadLocalEnv()[name] || "";
}

function decodeFirestoreValue(field) {
  if (!field || typeof field !== "object") {
    return "";
  }

  if ("stringValue" in field) {
    return field.stringValue;
  }

  if ("integerValue" in field) {
    return Number(field.integerValue);
  }

  if ("doubleValue" in field) {
    return Number(field.doubleValue);
  }

  if ("booleanValue" in field) {
    return Boolean(field.booleanValue);
  }

  if ("arrayValue" in field) {
    return Array.isArray(field.arrayValue.values)
      ? field.arrayValue.values.map(decodeFirestoreValue)
      : [];
  }

  if ("mapValue" in field) {
    const entries = Object.entries(field.mapValue.fields ?? {});
    return Object.fromEntries(entries.map(([key, value]) => [key, decodeFirestoreValue(value)]));
  }

  return "";
}

export function formatEventDate(dateText) {
  if (!dateText) {
    return "";
  }

  const date = new Date(`${dateText}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function buildAbsoluteUrl(request, pathWithQuery = "") {
  const protocol = request.headers["x-forwarded-proto"] ?? "https";
  const host = request.headers["x-forwarded-host"] ?? request.headers.host ?? "localhost:3000";
  return `${protocol}://${host}${pathWithQuery}`;
}

export function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function fetchEventForShare(eventId) {
  const projectId = getEnv("VITE_FIREBASE_PROJECT_ID");
  const apiKey = getEnv("VITE_FIREBASE_API_KEY");

  if (!projectId || !apiKey || !eventId) {
    return null;
  }

  const encodedEventId = encodeURIComponent(eventId);
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events/${encodedEventId}?key=${apiKey}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const fields = payload.fields ?? {};

  return {
    id: decodeFirestoreValue(fields.id) || eventId,
    title: decodeFirestoreValue(fields.title) || "벙개",
    location: decodeFirestoreValue(fields.location) || "",
    date: decodeFirestoreValue(fields.date) || "",
    note: decodeFirestoreValue(fields.note) || "",
  };
}

export function getShareMetadata(event, request) {
  if (!event) {
    const imageUrl = buildAbsoluteUrl(request, "/api/og-image");
    return {
      title: APP_NAME,
      description: DEFAULT_DESCRIPTION,
      imageUrl,
      imageType: "image/png",
      imageWidth: "1200",
      imageHeight: "630",
      canonicalUrl: buildAbsoluteUrl(request, "/events"),
    };
  }

  const formattedDate = formatEventDate(event.date);
  const title = [event.title, formattedDate].filter(Boolean).join(" | ") || "벙개";
  const description = [event.location, event.note].filter(Boolean).join(" · ") || DEFAULT_DESCRIPTION;
  const canonicalUrl = buildAbsoluteUrl(request, `/events?event=${encodeURIComponent(event.id)}`);
  const imageUrl = buildAbsoluteUrl(request, `/api/og-image?event=${encodeURIComponent(event.id)}`);

  return {
    title,
    description,
    imageUrl,
    imageType: "image/png",
    imageWidth: "1200",
    imageHeight: "630",
    canonicalUrl,
  };
}
