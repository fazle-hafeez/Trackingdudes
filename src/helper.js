import { getVendorIcon } from "./utils/getVendorIcon";
import { Ionicons, FontAwesome, FontAwesome5, FontAwesome6, MaterialIcons, AntDesign, Feather } from "@expo/vector-icons";
import { Svg } from "react-native-svg";

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
    fa: "FontAwesome",
    fa5: "FontAwesome5",
    fa6: "FontAwesome6",
    ion: "Ionicons",
    mat: "MaterialIcons",
    svg: "SvgIcon",
    ant: "AntDesign",
    fth: "Feather"
  };

  return {
    type: map[prefix] || "Ionicons",
    icon: iconName,
    prefix: prefix
  };
};


// To display icon
export const RenderIcon = ({ icon, size = 26, color = "#000", prefix }) => {
  if (!icon || "") return null;

  // Type ya prefix dono mein se jo mile use use karein
  const iconType = (prefix || "").toLowerCase();

  switch (iconType.toLowerCase()) {

    case "svg":
      const SvgComponent = getVendorIcon(icon);
      if (!SvgComponent) return null;
      // return <SvgComponent width={size} height={size} fill={color} preserveAspectRatio="xMidYMid meet" overflow="visible" />;
      return (
        <Svg width={size} height={size}  viewBox="0 0 64 64" fill={color}>
          <SvgComponent width={size * 2} height={size * 2} />
        </Svg>
      );

    case "fa5":
      return <FontAwesome5 name={icon} size={size} color={color} />;

    case "ant":
      return <AntDesign name={icon} size={size} color={color} />;

    case "fa6":
      return <FontAwesome6 name={icon} size={size} color={color} />;

    case "mat":
      return <MaterialIcons name={icon} size={size} color={color} />;

    case "fth":
      return <Feather name={icon} size={size} color={color} />;


    case "fa":
      return <FontAwesome name={icon} size={size} color={color} />;


    default:
      return <Ionicons name={icon} size={size} color={color} />;
  }
};