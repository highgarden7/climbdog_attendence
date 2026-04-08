import fs from "node:fs/promises";
import path from "node:path";
import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

const ENV_FILES = [".env.local", ".env"];
const MEMBERS_COLLECTION = "members";

function parseEnvText(text) {
  const entries = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

async function loadEnvFromFiles() {
  for (const filename of ENV_FILES) {
    try {
      const fullPath = path.resolve(process.cwd(), filename);
      const text = await fs.readFile(fullPath, "utf8");
      const parsed = parseEnvText(text);
      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore missing env files.
    }
  }
}

function getFirebaseConfig() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
}

function assertFirebaseConfig(config) {
  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length) {
    throw new Error(`Missing Firebase env vars: ${missingKeys.join(", ")}`);
  }
}

function memberDocId(name) {
  return encodeURIComponent(`${name}`.trim());
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return "";
}

function normalizeDate(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!match) {
    return raw;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  function pushCell() {
    row.push(current);
    current = "";
  }

  function pushRow() {
    if (row.length > 0 || current) {
      pushCell();
      rows.push(row);
      row = [];
    }
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      pushRow();
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    pushRow();
  }

  const [rawHeaderRow = [], ...dataRows] = rows;
  const headerRow = rawHeaderRow.map((header) => `${header}`.replace(/^\uFEFF/, "").trim());

  return dataRows
    .filter((dataRow) => dataRow.some((cell) => `${cell}`.trim()))
    .map((dataRow) => Object.fromEntries(headerRow.map((header, idx) => [header, `${dataRow[idx] ?? ""}`.trim()])));
}

function mapCsvRowToMember(row) {
  const name = firstValue(row, ["이름"]);
  if (!name) {
    return null;
  }

  return {
    name,
    profile: {
      homeRegion: firstValue(row, ["출몰지역"]),
      status: firstValue(row, ["상태"]),
      level: firstValue(row, ["난이도"]),
      instagram: firstValue(row, ["인스타아이디"]),
      birthday: normalizeDate(firstValue(row, ["생일"])),
      joinDate: normalizeDate(firstValue(row, ["입장날"])),
      attendance: normalizeDate(firstValue(row, ["참석"])),
      dday: firstValue(row, ["D+day"]),
      surgeryPeriod: firstValue(row, ["수습기간"]),
      mbti: firstValue(row, ["MBTI"]),
      ment: firstValue(row, ["Ment"]),
      phone: firstValue(row, ["전화번호"]),
    },
  };
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error("Usage: node scripts/import-members-csv.mjs <csv-path>");
  }

  await loadEnvFromFiles();

  const firebaseConfig = getFirebaseConfig();
  assertFirebaseConfig(firebaseConfig);

  const absolutePath = path.resolve(csvPath);
  const csvText = (await fs.readFile(absolutePath, "utf8")).replace(/^\uFEFF/, "");
  const csvRows = parseCsv(csvText);
  const members = csvRows.map(mapCsvRowToMember).filter(Boolean);

  if (!members.length) {
    throw new Error("No members found in CSV.");
  }

  const app = initializeApp(firebaseConfig, "member-import");
  const db = getFirestore(app);

  let importedCount = 0;
  for (const member of members) {
    const docRef = doc(db, MEMBERS_COLLECTION, memberDocId(member.name));
    const snapshot = await getDoc(docRef);
    const existing = snapshot.exists() ? snapshot.data() : {};

    await setDoc(docRef, {
      name: member.name,
      pinHash: existing.pinHash ?? null,
      profile: {
        ...(existing.profile ?? {}),
        ...member.profile,
      },
    });

    importedCount += 1;
  }

  console.log(`Imported ${importedCount} members from ${absolutePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
