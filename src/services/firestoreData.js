import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { STORAGE_KEYS } from "../config/constants";
import { appStorage } from "./storage";
import { getFirebaseDb, hasFirebaseServices } from "./firebase";

const MEMBERS_COLLECTION = "members";
const EVENTS_COLLECTION = "events";

function memberDocId(name) {
  return encodeURIComponent(`${name}`.trim());
}

function normalizeMember(member) {
  if (typeof member === "string") {
    return { name: member, hasPin: false, pinHash: null, profile: {} };
  }

  return {
    name: member.name,
    hasPin: typeof member.hasPin === "boolean" ? member.hasPin : Boolean(member.pinHash),
    pinHash: member.pinHash ?? null,
    profile: typeof member.profile === "object" && member.profile ? member.profile : {},
  };
}

function normalizeEvent(event) {
  return {
    id: event.id,
    title: event.title || "벙개",
    location: event.location || "",
    date: event.date || "",
    note: event.note || "",
    rsvp: Array.isArray(event.rsvp) ? event.rsvp : [],
    checkin: Array.isArray(event.checkin) ? event.checkin : [],
    photoCount: typeof event.photoCount === "number" ? event.photoCount : 0,
    createdBy: event.createdBy || "크루원",
  };
}

function assertFirebaseAvailable() {
  if (!hasFirebaseServices()) {
    throw new Error("Firebase config is missing.");
  }

  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firestore is unavailable.");
  }

  return db;
}

async function loadLocalMembers() {
  const storedMembers = (await appStorage.get(STORAGE_KEYS.members)) ?? [];
  return storedMembers.map(normalizeMember);
}

async function saveLocalMembers(members) {
  await appStorage.set(STORAGE_KEYS.members, members);
}

async function loadLocalEvents() {
  const storedEvents = (await appStorage.get(STORAGE_KEYS.events)) ?? [];
  return storedEvents.map(normalizeEvent);
}

async function saveLocalEvents(events) {
  await appStorage.set(STORAGE_KEYS.events, events);
}

function shouldUseLocalFallback() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export async function listMembers() {
  try {
    const db = assertFirebaseAvailable();
    const snapshot = await getDocs(collection(db, MEMBERS_COLLECTION));
    return snapshot.docs
      .map((memberDoc) => normalizeMember({
        name: memberDoc.data().name ?? decodeURIComponent(memberDoc.id),
        ...memberDoc.data(),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "ko"));
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    return loadLocalMembers();
  }
}

export async function createMembers(names) {
  try {
    const db = assertFirebaseAvailable();
    const existingMembers = await listMembers();
    const uniqueNames = names
      .map((name) => `${name}`.trim())
      .filter((name) => name && !existingMembers.some((member) => member.name === name));

    await Promise.all(
      uniqueNames.map((name) => setDoc(doc(db, MEMBERS_COLLECTION, memberDocId(name)), {
        name,
        pinHash: null,
        profile: {},
      })),
    );

    return listMembers();
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const existingMembers = await loadLocalMembers();
    const uniqueNames = names
      .map((name) => `${name}`.trim())
      .filter((name) => name && !existingMembers.some((member) => member.name === name));
    const nextMembers = [
      ...existingMembers,
      ...uniqueNames.map((name) => ({ name, hasPin: false, pinHash: null, profile: {} })),
    ].sort((left, right) => left.name.localeCompare(right.name, "ko"));
    await saveLocalMembers(nextMembers);
    return nextMembers;
  }
}

export async function deleteMember(name) {
  try {
    const db = assertFirebaseAvailable();
    await deleteDoc(doc(db, MEMBERS_COLLECTION, memberDocId(name)));
    return listMembers();
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const members = await loadLocalMembers();
    const nextMembers = members.filter((member) => member.name !== name);
    await saveLocalMembers(nextMembers);
    return nextMembers;
  }
}

export async function setupMemberPin(name, pinHash) {
  try {
    const db = assertFirebaseAvailable();
    const memberRef = doc(db, MEMBERS_COLLECTION, memberDocId(name));
    const snapshot = await getDoc(memberRef);
    if (!snapshot.exists()) {
      throw new Error("Member not found");
    }

    await setDoc(memberRef, {
      ...snapshot.data(),
      pinHash,
    });
    return listMembers();
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const members = await loadLocalMembers();
    const nextMembers = members.map((member) => (
      member.name === name ? { ...member, hasPin: true, pinHash } : member
    ));
    await saveLocalMembers(nextMembers);
    return nextMembers;
  }
}

export async function verifyMemberPin(name, pinHash) {
  try {
    const db = assertFirebaseAvailable();
    const snapshot = await getDoc(doc(db, MEMBERS_COLLECTION, memberDocId(name)));
    if (!snapshot.exists()) {
      return false;
    }

    return snapshot.data().pinHash === pinHash;
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const members = await loadLocalMembers();
    return members.some((member) => member.name === name && member.pinHash === pinHash);
  }
}

export async function clearMemberPin(name) {
  try {
    const db = assertFirebaseAvailable();
    const memberRef = doc(db, MEMBERS_COLLECTION, memberDocId(name));
    const snapshot = await getDoc(memberRef);
    if (!snapshot.exists()) {
      throw new Error("Member not found");
    }

    await setDoc(memberRef, {
      ...snapshot.data(),
      pinHash: null,
    });
    return listMembers();
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const members = await loadLocalMembers();
    const nextMembers = members.map((member) => (
      member.name === name ? { ...member, hasPin: false, pinHash: null } : member
    ));
    await saveLocalMembers(nextMembers);
    return nextMembers;
  }
}

export async function updateMemberProfile(name, profile) {
  try {
    const db = assertFirebaseAvailable();
    const memberRef = doc(db, MEMBERS_COLLECTION, memberDocId(name));
    const snapshot = await getDoc(memberRef);
    if (!snapshot.exists()) {
      throw new Error("Member not found");
    }

    await setDoc(memberRef, {
      ...snapshot.data(),
      profile,
    });
    return listMembers();
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const members = await loadLocalMembers();
    const nextMembers = members.map((member) => (
      member.name === name ? { ...member, profile } : member
    ));
    await saveLocalMembers(nextMembers);
    return nextMembers;
  }
}

export async function listEvents() {
  try {
    const db = assertFirebaseAvailable();
    const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));
    return snapshot.docs.map((eventDoc) => normalizeEvent({ id: eventDoc.id, ...eventDoc.data() }));
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    return loadLocalEvents();
  }
}

export async function saveEvent(event) {
  const normalizedEvent = normalizeEvent(event);

  try {
    const db = assertFirebaseAvailable();
    await setDoc(doc(db, EVENTS_COLLECTION, normalizedEvent.id), normalizedEvent);
    return normalizedEvent;
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const events = await loadLocalEvents();
    const nextEvents = events.some((item) => item.id === normalizedEvent.id)
      ? events.map((item) => (item.id === normalizedEvent.id ? normalizedEvent : item))
      : [normalizedEvent, ...events];
    await saveLocalEvents(nextEvents);
    return normalizedEvent;
  }
}

export async function saveEvents(events) {
  try {
    const db = assertFirebaseAvailable();
    await Promise.all(events.map((event) => setDoc(doc(db, EVENTS_COLLECTION, event.id), normalizeEvent(event))));
    return events.map(normalizeEvent);
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    await saveLocalEvents(events.map(normalizeEvent));
    return events.map(normalizeEvent);
  }
}

export async function deleteEventById(eventId) {
  try {
    const db = assertFirebaseAvailable();
    await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
    return;
  } catch (error) {
    if (!shouldUseLocalFallback()) {
      throw error;
    }

    const events = await loadLocalEvents();
    await saveLocalEvents(events.filter((event) => event.id !== eventId));
  }
}
