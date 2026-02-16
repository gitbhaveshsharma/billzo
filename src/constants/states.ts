/** Indian States and Union Territories with GST State Codes */
export const INDIAN_STATES = [
  { code: "01", name: "Jammu and Kashmir", shortCode: "JK" },
  { code: "02", name: "Himachal Pradesh", shortCode: "HP" },
  { code: "03", name: "Punjab", shortCode: "PB" },
  { code: "04", name: "Chandigarh", shortCode: "CH" },
  { code: "05", name: "Uttarakhand", shortCode: "UK" },
  { code: "06", name: "Haryana", shortCode: "HR" },
  { code: "07", name: "Delhi", shortCode: "DL" },
  { code: "08", name: "Rajasthan", shortCode: "RJ" },
  { code: "09", name: "Uttar Pradesh", shortCode: "UP" },
  { code: "10", name: "Bihar", shortCode: "BR" },
  { code: "11", name: "Sikkim", shortCode: "SK" },
  { code: "12", name: "Arunachal Pradesh", shortCode: "AR" },
  { code: "13", name: "Nagaland", shortCode: "NL" },
  { code: "14", name: "Manipur", shortCode: "MN" },
  { code: "15", name: "Mizoram", shortCode: "MZ" },
  { code: "16", name: "Tripura", shortCode: "TR" },
  { code: "17", name: "Meghalaya", shortCode: "ML" },
  { code: "18", name: "Assam", shortCode: "AS" },
  { code: "19", name: "West Bengal", shortCode: "WB" },
  { code: "20", name: "Jharkhand", shortCode: "JH" },
  { code: "21", name: "Odisha", shortCode: "OD" },
  { code: "22", name: "Chhattisgarh", shortCode: "CG" },
  { code: "23", name: "Madhya Pradesh", shortCode: "MP" },
  { code: "24", name: "Gujarat", shortCode: "GJ" },
  { code: "25", name: "Daman and Diu", shortCode: "DD" },
  { code: "26", name: "Dadra and Nagar Haveli", shortCode: "DN" },
  { code: "27", name: "Maharashtra", shortCode: "MH" },
  { code: "28", name: "Andhra Pradesh (Old)", shortCode: "AP" },
  { code: "29", name: "Karnataka", shortCode: "KA" },
  { code: "30", name: "Goa", shortCode: "GA" },
  { code: "31", name: "Lakshadweep", shortCode: "LD" },
  { code: "32", name: "Kerala", shortCode: "KL" },
  { code: "33", name: "Tamil Nadu", shortCode: "TN" },
  { code: "34", name: "Puducherry", shortCode: "PY" },
  { code: "35", name: "Andaman and Nicobar", shortCode: "AN" },
  { code: "36", name: "Telangana", shortCode: "TS" },
  { code: "37", name: "Andhra Pradesh (New)", shortCode: "AP" },
  { code: "38", name: "Ladakh", shortCode: "LA" },
] as const;

/** Get state code from state name */
export function getStateCode(stateName: string): string | undefined {
  const state = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase()
  );
  return state?.code;
}

/** Get state name from state code */
export function getStateName(stateCode: string): string | undefined {
  const state = INDIAN_STATES.find((s) => s.code === stateCode);
  return state?.name;
}
