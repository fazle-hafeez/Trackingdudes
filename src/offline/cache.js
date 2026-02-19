import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Normalize cache key by removing timestamp query param like &_t=...
 * Also guard against non-string keys.
 */
export const normalizeKey = (key) => {
  if (!key || typeof key !== "string") return "";

  let clean = key.split("&_t=")[0];

  // Remove page parameter also
  clean = clean.replace(/(&|\\?)page=\\d+/g, "");

  return clean;
};


// ----- STORE CACHE -----
export const storeCache = async (key, data) => {
  try {
    if (!key || typeof key !== "string") {
      console.warn("[CACHE] storeCache skipped (invalid key):", key);
      return;
    }
    const normalizedKey = normalizeKey(key);
    // prefix to avoid colliding with other storage items
    const storeKey = `cache_${normalizedKey}`;
    console.log("[CACHE STORE]", storeKey, data);
    await AsyncStorage.setItem(storeKey, JSON.stringify(data));
  } catch (err) {
    console.warn("[CACHE] Cache store failed:", err);
  }
};

// ----- READ CACHE -----
export const readCache = async (key) => {
  try {
    if (!key || typeof key !== "string") {
      console.warn("[CACHE] readCache skipped (invalid key):", key);
      return null;
    }
    const normalizedKey = normalizeKey(key);
    const storeKey = `cache_${normalizedKey}`;
    const stored = await AsyncStorage.getItem(storeKey);
    console.log("[CACHE READ]", storeKey, stored ? "(found)" : "(empty)");
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.warn("[CACHE] Cache read failed:", err);
    return null;
  }
};

// ----- QUEUE HANDLING (helpers kept if used elsewhere) -----
const QUEUE_KEY = "offlineQueue";

export const readQueue = async () => {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.warn("[CACHE] Queue read failed:", err);
    return [];
  }
};

export const storeQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("[CACHE] Queue store failed:", err);
  }
};

export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (err) {
    console.warn("[CACHE] Queue clear failed:", err);
  }
};
