import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../constants/categoryIcon';
export function getCategoryIcon(label) {
    if (!label || label.trim() === "" || label == undefined) return DEFAULT_CATEGORY_ICON;

    const key = label.toLowerCase().trim();

    // LOGGING FOR DEBUGGING:
    const icon = CATEGORY_ICONS[key] || DEFAULT_CATEGORY_ICON;

    return icon;
}
