import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../config/constants";
import {
  clearMemberPin as clearMemberPinRemote,
  createMembers,
  deleteEventById,
  listEvents,
  deleteMember,
  listMembers,
  saveEvent,
  setupMemberPin as setupMemberPinRemote,
  updateMemberProfile as updateMemberProfileRemote,
  verifyMemberPin as verifyMemberPinRemote,
} from "../services/firestoreData";
import { deleteEventPhotos, listEventPhotos, uploadEventPhoto } from "../services/photoStorage";
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

  return "Firebase 데이터 저장소에 연결하지 못했습니다.";
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
  const [dataError, setDataError] = useState("");

  const saveEventsState = useCallback((nextEvents) => {
    setEvents(nextEvents);
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const storedEvents = await listEvents();
      setEvents(storedEvents);
      setDataError("");
      return true;
    } catch (error) {
      setDataError(toErrorMessage(error));
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [storedMembers, storedEvents] = await Promise.all([
        listMembers(),
        listEvents(),
      ]);

      setMembers(normalizeMembers(storedMembers));
      setEvents(storedEvents);
      setDataError("");
    } catch (error) {
      setMembers([]);
      setEvents([]);
      setDataError(toErrorMessage(error));
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

  const dismissDataError = useCallback(() => {
    setDataError("");
  }, []);

  const setupMemberPin = useCallback(async (name, pin) => {
    const pinHash = await hashPin(name, pin);
    const nextMembers = await setupMemberPinRemote(name, pinHash);
    setMembers(normalizeMembers(nextMembers));
    setDataError("");
    finalizeMyName(name);
    setMemberAuthRequest(null);
  }, [finalizeMyName]);

  const verifyMemberPin = useCallback(async (name, pin) => {
    const pinHash = await hashPin(name, pin);
    const verified = await verifyMemberPinRemote(name, pinHash);
    if (!verified) {
      return false;
    }

    setDataError("");
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
    setDataError("");
    return true;
  }, [members]);

  const removeMember = useCallback(async (memberName) => {
    const nextMembers = await deleteMember(memberName);
    setMembers(normalizeMembers(nextMembers));
    setDataError("");
    if (myName === memberName) {
      clearMyName();
    }
  }, [clearMyName, myName]);

  const clearMemberPin = useCallback(async (memberName) => {
    const nextMembers = await clearMemberPinRemote(memberName);
    setMembers(normalizeMembers(nextMembers));
    setDataError("");
    if (myName === memberName) {
      clearMyName();
    }
  }, [clearMyName, myName]);

  const updateMemberProfile = useCallback(async (memberName, profile) => {
    const nextMembers = await updateMemberProfileRemote(memberName, profile);
    setMembers(normalizeMembers(nextMembers));
    setDataError("");
  }, []);

  const createEvent = useCallback(async (form) => {
    if (!form.date) {
      return false;
    }

    const nextEvent = buildEvent(form, myName);
    await saveEvent(nextEvent);
    saveEventsState([nextEvent, ...events]);
    return true;
  }, [events, myName, saveEventsState]);

  const deleteEvent = useCallback(async (eventId) => {
    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) {
      return;
    }

    const canDelete = role === ADMIN_ROLE || targetEvent.createdBy === myName;
    if (!canDelete) {
      return;
    }

    await deleteEventById(eventId);
    saveEventsState(events.filter((event) => event.id !== eventId));
    await deleteEventPhotos(eventId);
  }, [events, myName, role, saveEventsState]);

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

    const nextTargetEvent = nextEvents.find((event) => event.id === eventId);
    if (nextTargetEvent) {
      await saveEvent(nextTargetEvent);
      saveEventsState(nextEvents);
    }
  }, [events, myName, saveEventsState]);

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

      const targetEvent = nextEvents.find((event) => event.id === eventId);
      if (targetEvent) {
        await saveEvent(targetEvent);
        saveEventsState(nextEvents);
      }

      setPhotoVersion((version) => version + 1);
    } finally {
      setPhotoUploading(false);
    }
  }, [events, myName, saveEventsState]);

  const checkIn = useCallback(async (eventId) => {
    if (!myName) {
      return { ok: false, reason: "missing-name" };
    }

    const targetEvent = events.find((event) => event.id === eventId);
    if (!targetEvent) {
      return { ok: false, reason: "missing-event" };
    }

    if (targetEvent.rsvp.length < 2) {
      return { ok: false, reason: "insufficient-attendees" };
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

    const nextTargetEvent = nextEvents.find((event) => event.id === eventId);
    if (nextTargetEvent) {
      await saveEvent(nextTargetEvent);
      saveEventsState(nextEvents);
    }

    return { ok: true };
  }, [events, myName, saveEventsState]);

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
    memberApiError: dataError,
    passGate,
    logout,
    requestMemberAuth,
    closeMemberAuth,
    dismissMemberApiError: dismissDataError,
    setupMemberPin,
    verifyMemberPin,
    clearMyName,
    addMembers,
    removeMember,
    clearMemberPin,
    updateMemberProfile,
    createEvent,
    refreshEvents,
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
    dataError,
    passGate,
    logout,
    requestMemberAuth,
    closeMemberAuth,
    dismissDataError,
    setupMemberPin,
    verifyMemberPin,
    clearMyName,
    addMembers,
    removeMember,
    clearMemberPin,
    updateMemberProfile,
    createEvent,
    refreshEvents,
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
