import { PAYMENT_OPTION_ICONS, DEFAULT_PAYMENT_OPTION_ICON } from '../constants/paymentOptionIcon';
export function getPaymentOptionIcon(label) {
    if (!label || label.trim() === "" || label == undefined) return DEFAULT_PAYMENT_OPTION_ICON;

    const key = label.toLowerCase().trim();

    // LOGGING FOR DEBUGGING:
    const icon = PAYMENT_OPTION_ICONS[key] || DEFAULT_PAYMENT_OPTION_ICON;

    return icon;
}
