import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../config/constants";
import {
  clearMemberPin as clearMemberPinRemote,
  createMembers,
  deleteMember,
  listMembers,
  setupMemberPin as setupMemberPinRemote,
  updateMemberProfile as updateMemberProfileRemote,
  verifyMemberPin as verifyMemberPinRemote,
} from "../services/memberApi";
import { deleteEventPhotos, listEventPhotos, uploadEventPhoto } from "../services/photoStorage";
import { appStorage } from "../services/storage";
import { resizeImage } from "../utils/image";
import { hashPin } from "../utils/hash";

const CrewContext = createContext(null);
const USER_ROLE = "member";
const ADMIN_ROLE = "admin";

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function buildEvent(form, myName) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: form.title || "벙개",
    location: form.location,
    date: form.date,
    note: form.note,
    rsvp: [],
    checkin: [],
    photoCount: 0,
    createdBy: myName || "크루원",
  };
}

function normalizeMember(member) {
  if (typeof member === "string") {
    return { name: member, hasPin: false, profile: {} };
  }

  return {
    name: member.name,
    hasPin: typeof member.hasPin === "boolean" ? member.hasPin : Boolean(member.pinHash ?? member.pin),
    profile: typeof member.profile === "object" && member.profile ? member.profile : {},
  };
}

function normalizeMembers(rawMembers) {
  return Array.isArray(rawMembers) ? rawMembers.map(normalizeMember) : [];
}

function toErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "멤버 서버 저장소에 연결하지 못했습니다.";
}

export function CrewProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState(USER_ROLE);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [myName, setMyName] = useState("");
  const [memberAuthRequest, setMemberAuthRequest] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [memberApiError, setMemberApiError] = useState("");

  const saveEvents = useCallback(async (nextEvents) => {
    setEvents(nextEvents);
    await appStorage.set(STORAGE_KEYS.events, nextEvents);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [storedMembers, storedEvents] = await Promise.all([
        listMembers(),
        appStorage.get(STORAGE_KEYS.events),
      ]);

      setMembers(normalizeMembers(storedMembers));
      setMemberApiError("");

      if (storedEvents) {
        setEvents(storedEvents);
      }
    } catch (error) {
      setMembers([]);
      setMemberApiError(toErrorMessage(error));

      const storedEvents = await appStorage.get(STORAGE_KEYS.events);
      if (storedEvents) {
        setEvents(storedEvents);
      }
    }

    const sessionStorage = getSessionStorage();
    const localStorage = getLocalStorage();
    const selectedName = localStorage?.getItem(STORAGE_KEYS.myName);
    if (selectedName) {
      setMyName(selectedName);
    }

    if (sessionStorage?.getItem(STORAGE_KEYS.auth) === "1") {
      setAuthed(true);
      setRole(sessionStorage.getItem(STORAGE_KEYS.role) || USER_ROLE);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const passGate = useCallback((nextRole = USER_ROLE) => {
    setAuthed(true);
    setRole(nextRole);
    getSessionStorage()?.setItem(STORAGE_KEYS.auth, "1");
    getSessionStorage()?.setItem(STORAGE_KEYS.role, nextRole);
  }, []);

  const logout = useCallback(() => {
    setAuthed(false);
    setRole(USER_ROLE);
    const sessionStorage = getSessionStorage();
    sessionStorage?.removeItem(STORAGE_KEYS.auth);
    sessionStorage?.removeItem(STORAGE_KEYS.role);
  }, []);

  const finalizeMyName = useCallback((name) => {
    setMyName(name);
    getLocalStorage()?.setItem(STORAGE_KEYS.myName, name);
  }, []);

  const requestMemberAuth = useCallback((name) => {
    const member = members.find((item) => item.name === name);
    if (!member) {
      return;
    }

    setMemberAuthRequest({
      name,
      mode: member.hasPin ? "login" : "setup",
    });
  }, [members]);

  const closeMemberAuth = useCallback(() => {
    setMemberAuthRequest(null);
  }, []);

  const dismissMemberApiError = useCallback(() => {
    setMemberApiError("");
  }, []);

  const setupMemberPin = useCallback(async (name, pin) => {
    const pinHash = await hashPin(name, pin);
    const nextMembers = await setupMemberPinRemote(name, pinHash);
    setMembers(normalizeMembers(nextMembers));
    setMemberApiError("");
    finalizeMyName(name);
    setMemberAuthRequest(null);
  }, [finalizeMyName]);

  const verifyMemberPin = useCallback(async (name, pin) => {
    const pinHash = await hashPin(name, pin);
    const verified = await verifyMemberPinRemote(name, pinHash);
    if (!verified) {
      return false;
    }

    setMemberApiError("");
    finalizeMyName(name);
    setMemberAuthRequest(null);
    return true;
  }, [finalizeMyName]);

  const clearMyName = useCallback(() => {
    setMyName("");
    getLocalStorage()?.removeItem(STORAGE_KEYS.myName);
  }, []);

  const addMembers = useCallback(async (rawMembers) => {
    const names = rawMembers
      .split(/[,\n]/)
      .map((member) => member.trim())
      .filter((member) => member && !members.some((item) => item.name === member));

    if (!names.length) {
      return false;
    }

    const nextMembers = await createMembers(names);
    setMembers(normalizeMembers(nextMembers));
    setMemberApiError("");
    return true;
  }, [members]);

  const removeMember = useCallback(async (memberName) => {
    const nextMembers = await deleteMember(memberName);
    setMembers(normalizeMembers(nextMembers));
    setMemberApiError("");
    if (myName === memberName) {
      clearMyName();
    }
  }, [clearMyName, myName]);

  const clearMemberPin = useCallback(async (memberName) => {
    const nextMembers = await clearMemberPinRemote(memberName);
    setMembers(normalizeMembers(nextMembers));
    setMemberApiError("");
    if (myName === memberName) {
      clearMyName();
    }
  }, [clearMyName, myName]);

  const updateMemberProfile = useCallback(async (memberName, profile) => {
    const nextMembers = await updateMemberProfileRemote(memberName, profile);
    setMembers(normalizeMembers(nextMembers));
    setMemberApiError("");
  }, []);

  const createEvent = useCallback(async (form) => {
    if (!form.date) {
      return false;
    }

    const nextEvent = buildEvent(form, myName);
    await saveEvents([nextEvent, ...events]);
    return true;
  }, [events, myName, saveEvents]);

  const deleteEvent = useCallback(async (eventId) => {
    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) {
      return;
    }

    const canDelete = role === ADMIN_ROLE || targetEvent.createdBy === myName;
    if (!canDelete) {
      return;
    }

    await saveEvents(events.filter((event) => event.id !== eventId));
    await deleteEventPhotos(eventId);
  }, [events, myName, role, saveEvents]);

  const toggleRsvp = useCallback(async (eventId) => {
    if (!myName) {
      return;
    }

    const nextEvents = events.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      const alreadyJoined = event.rsvp.includes(myName);
      return {
        ...event,
        rsvp: alreadyJoined
          ? event.rsvp.filter((name) => name !== myName)
          : [...event.rsvp, myName],
      };
    });

    await saveEvents(nextEvents);
  }, [events, myName, saveEvents]);

  const uploadPhoto = useCallback(async (eventId, file) => {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setPhotoUploading(true);

    try {
      const dataUrl = await resizeImage(file, 800);
      const photoCount = await uploadEventPhoto(eventId, {
        dataUrl,
        by: myName || "익명",
        at: new Date().toISOString(),
      });

      const nextEvents = events.map((event) => (
        event.id === eventId ? { ...event, photoCount } : event
      ));

      await saveEvents(nextEvents);
      setPhotoVersion((version) => version + 1);
    } finally {
      setPhotoUploading(false);
    }
  }, [events, myName, saveEvents]);

  const checkIn = useCallback(async (eventId) => {
    if (!myName) {
      return { ok: false, reason: "missing-name" };
    }

    const photos = await listEventPhotos(eventId);
    if (!photos.length) {
      return { ok: false, reason: "missing-photo" };
    }

    const nextEvents = events.map((event) => {
      if (event.id !== eventId || event.checkin.includes(myName)) {
        return event;
      }

      return {
        ...event,
        checkin: [...event.checkin, myName],
      };
    });

    await saveEvents(nextEvents);
    return { ok: true };
  }, [events, myName, saveEvents]);

  const getPhotos = useCallback(async (eventId) => listEventPhotos(eventId), []);

  const value = useMemo(() => ({
    authed,
    isAdmin: role === ADMIN_ROLE,
    loading,
    members,
    events,
    myName,
    memberAuthRequest,
    photoUploading,
    photoVersion,
    memberApiError,
    passGate,
    logout,
    requestMemberAuth,
    closeMemberAuth,
    dismissMemberApiError,
    setupMemberPin,
    verifyMemberPin,
    clearMyName,
    addMembers,
    removeMember,
    clearMemberPin,
    updateMemberProfile,
    createEvent,
    deleteEvent,
    toggleRsvp,
    uploadPhoto,
    checkIn,
    getPhotos,
  }), [
    authed,
    role,
    loading,
    members,
    events,
    myName,
    memberAuthRequest,
    photoUploading,
    photoVersion,
    memberApiError,
    passGate,
    logout,
    requestMemberAuth,
    closeMemberAuth,
    dismissMemberApiError,
    setupMemberPin,
    verifyMemberPin,
    clearMyName,
    addMembers,
    removeMember,
    clearMemberPin,
    updateMemberProfile,
    createEvent,
    deleteEvent,
    toggleRsvp,
    uploadPhoto,
    checkIn,
    getPhotos,
  ]);

  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew() {
  const context = useContext(CrewContext);

  if (!context) {
    throw new Error("useCrew must be used within CrewProvider");
  }

  return context;
}
