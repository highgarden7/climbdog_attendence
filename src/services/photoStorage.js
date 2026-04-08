import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadString,
} from "firebase/storage";
import { STORAGE_KEYS } from "../config/constants";
import { appStorage } from "./storage";
import { ensureFirebaseStorage } from "./firebase";

function buildLocalStorageKey(eventId) {
  return `${STORAGE_KEYS.photoPrefix}${eventId}`;
}

function buildPhotoPath(eventId) {
  return `events/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

async function loadLocalPhotos(eventId) {
  return (await appStorage.get(buildLocalStorageKey(eventId))) ?? [];
}

async function saveLocalPhotos(eventId, photos) {
  await appStorage.set(buildLocalStorageKey(eventId), photos);
}

async function deleteLocalPhotos(eventId) {
  await appStorage.delete(buildLocalStorageKey(eventId));
}

function decoratePhotos(photos, eventMap, eventId) {
  const eventInfo = eventMap.get(eventId) ?? {};
  return photos.map((photo, index) => ({
    ...photo,
    eventId,
    eventTitle: eventInfo.title ?? "벙개",
    eventDate: eventInfo.date ?? "",
    key: photo.path ?? `${eventId}-${photo.at}-${index}`,
  }));
}

export async function uploadEventPhoto(eventId, { dataUrl, by, at }) {
  const storage = ensureFirebaseStorage();

  if (!storage) {
    const photos = await loadLocalPhotos(eventId);
    const nextPhotos = [...photos, { data: dataUrl, by, at }];
    await saveLocalPhotos(eventId, nextPhotos);
    return nextPhotos.length;
  }

  const photoRef = ref(storage, buildPhotoPath(eventId));
  await uploadString(photoRef, dataUrl, "data_url", {
    contentType: "image/jpeg",
    customMetadata: { by, at },
  });

  const photos = await listEventPhotos(eventId);
  return photos.length;
}

export async function listEventPhotos(eventId) {
  const storage = ensureFirebaseStorage();

  if (!storage) {
    return loadLocalPhotos(eventId);
  }

  const folderRef = ref(storage, `events/${eventId}`);
  const result = await listAll(folderRef);
  const photos = await Promise.all(
    result.items.map(async (itemRef) => {
      const [url, metadata] = await Promise.all([
        getDownloadURL(itemRef),
        getMetadata(itemRef),
      ]);

      return {
        data: url,
        by: metadata.customMetadata?.by ?? "익명",
        at: metadata.customMetadata?.at ?? metadata.timeCreated ?? new Date().toISOString(),
        path: itemRef.fullPath,
      };
    }),
  );

  return photos.sort((left, right) => right.at.localeCompare(left.at));
}

export async function deleteEventPhotos(eventId) {
  const storage = ensureFirebaseStorage();

  if (!storage) {
    await deleteLocalPhotos(eventId);
    return;
  }

  const folderRef = ref(storage, `events/${eventId}`);
  const result = await listAll(folderRef);
  await Promise.all(result.items.map((itemRef) => deleteObject(itemRef)));
}

export async function listRecentPhotos(events, { offset = 0, limit = 20 } = {}) {
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const storage = ensureFirebaseStorage();

  let allPhotos = [];

  if (!storage) {
    const localPhotos = await Promise.all(
      events.map(async (event) => decoratePhotos(await loadLocalPhotos(event.id), eventMap, event.id)),
    );
    allPhotos = localPhotos.flat();
  } else {
    const photoGroups = await Promise.all(
      events.map(async (event) => decoratePhotos(await listEventPhotos(event.id), eventMap, event.id)),
    );
    allPhotos = photoGroups.flat();
  }

  const sortedPhotos = allPhotos.sort((left, right) => right.at.localeCompare(left.at));
  const items = sortedPhotos.slice(offset, offset + limit);

  return {
    items,
    hasMore: offset + limit < sortedPhotos.length,
  };
}
