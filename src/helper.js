import { getVendorIcon } from "./utils/getVendorIcon";

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

  // Helper to convert date object to YYYY-MM-DD string
  const formatDate = (date) => date.toISOString().split("T")[0];

  let start = null;
  let end = null;

  switch (tab) {
    case "this-week": {
      // Calculate the first day of the current week (Monday)
      const dayOfWeek = today.getDay();
      start = new Date(today);
      start.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      // Calculate the last day of the week (Sunday)
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }

    case "prev-week": {
      // Calculate the end of the previous week
      const day = today.getDay();
      end = new Date(today);
      end.setDate(today.getDate() - (day === 0 ? 7 : day));

      // Calculate the start of the previous week
      start = new Date(end);
      start.setDate(end.getDate() - 6);
      break;
    }

    case "this-month": {
      // Get the first and last day of the current month
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    }

    case "others":
    default: {
      // Dynamic range: From a fixed past date until the current date
      return {
        from: "2020-01-01",      // Set to your preferred starting point
        to: formatDate(today),  // Dynamically sets 'to' as today's date
      };
    }
  }

  return {
    from: formatDate(start),
    to: formatDate(end),
  };
};


// filter data throught tabs from api maybe we add or remove some tab therefore i keep it here

export const DATE_TABS = {
  THIS_WEEK: "this-week",
  PREV_WEEK: "prev-week",
  THIS_MONTH: "this-month",
  OTHERS: "others"
};


//============== get type and icon name from string ex:fontAwosome6:car

export const parseIconString = (iconStr = "") => {
  if (!iconStr || !iconStr.includes(":")) {
    return { type: null, icon: null }; // property name 'icon'
  }

  const [prefix, iconName] = iconStr.split(":");

  const map = {
    font: "FontAwesome",
    font5: "FontAwesome5",
    font6: "FontAwesome6",
    ion: "Ionicons",
    mater: "MaterialIcons",
    svg: "SvgIcon",
    ant: "AntDesign"
  };

  return {
    type: map[prefix] || "Ionicons",
    icon: iconName,
    prefix: prefix
  };
};


// To display icon
export const RenderIcons = ({ item, size = 26, color = "#000" }) => {
  if (!item || !item.icon) return null;

  // Type ya prefix dono mein se jo mile use use karein
  const iconType = (item.type || item.prefix || "").toLowerCase();

  switch (iconType) {
    case "fontawesome":
    case "font":
      return <FontAwesome name={item.icon} size={size} color={color} />;

    case "fontawesome5":
    case "font5":
      return <FontAwesome5 name={item.icon} size={size} color={color} />;

    case "materialicons":
    case "mater":
      return <MaterialIcons name={item.icon} size={size} color={color} />;

    case "antdesign":
    case "ant":
      return <AntDesign name={item.icon} size={size} color={color} />;

    case "svgicon":
    case "svg":
      const SvgComponent = getVendorIcon(item.icon);
      if (!SvgComponent) return null;
      return <SvgComponent width={size} height={size} fill={color} />;

    case "ionicons":
    case "ion":
    default:
      return <Ionicons name={item.icon} size={size} color={color} />;
  }
};