const PATIENT_AVATAR_PALETTE = [
  '#dbeafe',
  '#dcfce7',
  '#fef3c7',
  '#fae8ff',
  '#fee2e2',
  '#cffafe',
  '#ede9fe',
  '#fce7f3',
  '#e0f2fe',
  '#e2e8f0'
];

export interface PatientAvatarStyle {
  background: string;
  color: string;
}

export function buildPatientAvatarStyle(fullName: string): Record<string, string> {
  const paletteIndex = hashString(fullName) % PATIENT_AVATAR_PALETTE.length;
  return {
    background: PATIENT_AVATAR_PALETTE[paletteIndex],
    color: '#0f172a'
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
