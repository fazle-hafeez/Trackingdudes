import { VENDOR_ICONS, DEFAULT_VENDOR_ICON } from '../constants/vendorIcons';

export function getVendorIcon(vendorName) {
    if (!vendorName || vendorName.trim() === "" || vendorName == undefined) return DEFAULT_VENDOR_ICON;

    const key = vendorName.toLowerCase().trim();

    // LOGGING FOR DEBUGGING:
    const icon = VENDOR_ICONS[key] || DEFAULT_VENDOR_ICON;
    console.log("Icon type:", typeof icon); // This should now say 'function' or 'object'

    return icon;
}
