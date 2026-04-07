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
import { getFirebaseStorage } from "./firebase";

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

export async function uploadEventPhoto(eventId, { dataUrl, by, at }) {
  const storage = getFirebaseStorage();

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
  const storage = getFirebaseStorage();

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
  const storage = getFirebaseStorage();

  if (!storage) {
    await deleteLocalPhotos(eventId);
    return;
  }

  const folderRef = ref(storage, `events/${eventId}`);
  const result = await listAll(folderRef);
  await Promise.all(result.items.map((itemRef) => deleteObject(itemRef)));
}
