/** 合併 className，會自動略過 false / null / undefined。 */
export const cx = (...names) => names.filter(Boolean).join(" ");
