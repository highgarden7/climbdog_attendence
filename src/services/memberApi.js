import { appStorage } from "./storage";

const MEMBER_STORAGE_KEY = "crew-members";

function normalizeMember(member) {
  if (typeof member === "string") {
    return { name: member, hasPin: false, pinHash: null, profile: {} };
  }

  return {
    name: member.name,
    hasPin: typeof member.hasPin === "boolean" ? member.hasPin : Boolean(member.pinHash ?? member.pin),
    pinHash: member.pinHash ?? member.pin ?? null,
    profile: typeof member.profile === "object" && member.profile ? member.profile : {},
  };
}

function isLocalRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

async function fallbackLoadMembers() {
  const storedMembers = (await appStorage.get(MEMBER_STORAGE_KEY)) ?? [];
  return storedMembers.map(normalizeMember);
}

async function fallbackSaveMembers(members) {
  await appStorage.set(MEMBER_STORAGE_KEY, members);
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data.detail || data.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function shouldUseFallback() {
  return isLocalRuntime();
}

export async function listMembers() {
  try {
    const data = await requestJson("/api/members");
    return data.members.map(normalizeMember);
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    return fallbackLoadMembers();
  }
}

export async function createMembers(names) {
  try {
    const data = await requestJson("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });
    return data.members.map(normalizeMember);
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    const existingMembers = await fallbackLoadMembers();
    const uniqueNames = names
      .map((name) => `${name}`.trim())
      .filter((name) => name && !existingMembers.some((member) => member.name === name));
    const nextMembers = [
      ...existingMembers,
      ...uniqueNames.map((name) => ({ name, hasPin: false, pinHash: null, profile: {} })),
    ].sort((left, right) => left.name.localeCompare(right.name, "ko"));
    await fallbackSaveMembers(nextMembers);
    return nextMembers;
  }
}

export async function deleteMember(name) {
  try {
    const data = await requestJson(`/api/members?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    return data.members.map(normalizeMember);
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    const members = await fallbackLoadMembers();
    const nextMembers = members.filter((member) => member.name !== name);
    await fallbackSaveMembers(nextMembers);
    return nextMembers;
  }
}

export async function setupMemberPin(name, pinHash) {
  try {
    await requestJson("/api/members-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup", name, pinHash }),
    });
    return listMembers();
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    const members = await fallbackLoadMembers();
    const nextMembers = members.map((member) => (
      member.name === name ? { ...member, hasPin: true, pinHash } : member
    ));
    await fallbackSaveMembers(nextMembers);
    return nextMembers;
  }
}

export async function verifyMemberPin(name, pinHash) {
  try {
    const data = await requestJson("/api/members-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", name, pinHash }),
    });
    return Boolean(data.ok);
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    const members = await fallbackLoadMembers();
    return members.some((member) => member.name === name && member.pinHash === pinHash);
  }
}

export async function clearMemberPin(name) {
  try {
    await requestJson("/api/members-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear", name }),
    });
    return listMembers();
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    const members = await fallbackLoadMembers();
    const nextMembers = members.map((member) => (
      member.name === name ? { ...member, hasPin: false, pinHash: null } : member
    ));
    await fallbackSaveMembers(nextMembers);
    return nextMembers;
  }
}

export async function updateMemberProfile(name, profile) {
  try {
    const data = await requestJson("/api/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, profile }),
    });
    return data.members.map(normalizeMember);
  } catch (error) {
    if (!shouldUseFallback()) {
      throw error;
    }

    const members = await fallbackLoadMembers();
    const nextMembers = members.map((member) => (
      member.name === name ? { ...member, profile } : member
    ));
    await fallbackSaveMembers(nextMembers);
    return nextMembers;
  }
}
