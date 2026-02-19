import { getVendorIcon } from "./getVendorIcon";
import { getPaymentOptionIcon } from "./getPaymentOptionIcon";
 import { getCategoryIcon } from "./getCategoryIcon";
import DefaultIcon from '../../assets/payment-option-icons/default.svg'

export function getIconComponent(icon = "", type = "vendor") {
  if (!icon) return null;

  const iconType = type?.toLowerCase();

  switch (iconType) {
    case 'vendor':
      return getVendorIcon(icon);
    case 'payment':
    case 'payment-option':  // Dono handle
      return getPaymentOptionIcon(icon);
    case 'category':
      return getCategoryIcon(icon);
    default:
      return DefaultIcon
  }
}
