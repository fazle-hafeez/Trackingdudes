
 export const normalizeStatus = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value.toLowerCase();
    if (typeof value === "object" && value.status) return String(value.status).toLowerCase();
    return null;
  };

 export const mergePendingAndNormalize = (obj = {}) => {
    const out = {};
    Object.keys(obj).forEach(k => {
      const v = obj[k];
      const n = normalizeStatus(v);
      if (n) out[k] = n;
    });
    return out;
  };