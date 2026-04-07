import { del, list, put } from "@vercel/blob";

const MEMBERS_PREFIX = "members/";

function buildPathname() {
  return `${MEMBERS_PREFIX}${Date.now()}.json`;
}

async function readBlobJson(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const text = await response.text();
  return JSON.parse(text);
}

export async function loadMembers() {
  const { blobs } = await list({ prefix: MEMBERS_PREFIX });
  if (!blobs.length) {
    return [];
  }

  const latestBlob = [...blobs].sort((left, right) => right.pathname.localeCompare(left.pathname))[0];
  return readBlobJson(latestBlob.url);
}

export async function saveMembers(members) {
  const { blobs } = await list({ prefix: MEMBERS_PREFIX });
  const blob = await put(buildPathname(), JSON.stringify(members), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  const staleBlobUrls = blobs.map((item) => item.url).filter((url) => url !== blob.url);
  if (staleBlobUrls.length) {
    await del(staleBlobUrls);
  }

  return members;
}
