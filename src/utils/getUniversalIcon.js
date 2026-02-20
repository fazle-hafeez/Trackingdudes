import { getVendorIcon } from "./getVendorIcon";
import { getPaymentOptionIcon } from "./getPaymentOptionIcon";
import { getCategoryIcon } from "./getCategoryIcon";
import DefaultIcon from "../../assets/payment-option-icons/default.svg";

const normalize = (name = "") =>
  name
    .toLowerCase()
    .replace(".svg", "")
    .replace(/[\s_-]/g, "");

export function getUniversalIcon(icon = "") {
  if (!icon) return DefaultIcon;

  const normalizedIcon = normalize(icon);

  // Vendor
  let component = getVendorIcon(normalizedIcon);
  if (component) return component;

  // Category
  component = getCategoryIcon(normalizedIcon);
  if (component) return component;

  // Payment
  component = getPaymentOptionIcon(normalizedIcon);
  if (component) return component;

  return DefaultIcon;
}