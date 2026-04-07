function parseStoredValue(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

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

async function getFromNativeStorage(key) {
  if (typeof window === "undefined" || !window.storage?.get) {
    return null;
  }

  try {
    const result = await window.storage.get(key, true);
    return result ? parseStoredValue(result.value) : null;
  } catch {
    return null;
  }
}

async function setToNativeStorage(key, value) {
  if (typeof window === "undefined" || !window.storage?.set) {
    return false;
  }

  try {
    await window.storage.set(key, JSON.stringify(value), true);
    return true;
  } catch {
    return false;
  }
}

async function deleteFromNativeStorage(key) {
  if (typeof window === "undefined" || !window.storage?.delete) {
    return false;
  }

  try {
    await window.storage.delete(key, true);
    return true;
  } catch {
    return false;
  }
}

export const appStorage = {
  async get(key) {
    const nativeValue = await getFromNativeStorage(key);
    if (nativeValue !== null) {
      return nativeValue;
    }

    const localStorage = getLocalStorage();
    return parseStoredValue(localStorage?.getItem(key) ?? null);
  },

  async set(key, value) {
    const saved = await setToNativeStorage(key, value);
    if (saved) {
      return;
    }

    const localStorage = getLocalStorage();
    localStorage?.setItem(key, JSON.stringify(value));
  },

  async delete(key) {
    const deleted = await deleteFromNativeStorage(key);
    if (deleted) {
      return;
    }

    const localStorage = getLocalStorage();
    localStorage?.removeItem(key);
  },
};
