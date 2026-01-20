
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

  // ======== currency formate ======
  export const formatCurrency = (amount, currency = "USD") => {
  const num = Number(amount);
  if (isNaN(num)) return amount;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
};


/**
 * Format date to YYYY-MM-DD
 */
export const formatDateDisplay = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = `${d.getDate()}`.padStart(2, "0");
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
};

/**
 * Get date range based on tab
 */
export const getDateRange = (tab) => {
  const today = new Date();
  let start = null;
  let end = null;

  switch (tab) {
    case "this-week": {
      const dayOfWeek = today.getDay(); // Sunday = 0
      start = new Date(today);
      start.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }

    case "prev-week": {
      const day = today.getDay();
      end = new Date(today);
      end.setDate(today.getDate() - (day === 0 ? 7 : day));
      start = new Date(end);
      start.setDate(end.getDate() - 6);
      break;
    }

    case "this-month": {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    }

    //  OTHERS / ALL DATA
    case "others":
    default: {
      return {
        from: "",
        to: "",
      };
    }
  }

  return {
    from: formatDateDisplay(start),
    to: formatDateDisplay(end),
  };
};


// filter data throught tabs from api maybe we add or remove some tab therefore i keep it here

export  const DATE_TABS = {
  THIS_WEEK: "this-week",
  PREV_WEEK: "prev-week",
  THIS_MONTH: "this-month",
  OTHERS: "others"
};


//============== get type and icon name from string ex:fontAwosome6:car

 export const parseIconString = (iconStr = "") => {
    if (!iconStr || !iconStr.includes(":")) return null;

    const [prefix, icon] = iconStr.split(":");

    const map = {
        font4: "FontAwesome",
        font5: "FontAwesome5",
        font6: "FontAwesome6",
        ion: "Ionicons",
        mater: "MaterialIcons",
    };

    return {
        prefix,
        icon,
        type: map[prefix] || "Ionicons",
    };
};