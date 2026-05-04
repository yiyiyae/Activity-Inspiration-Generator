export type ProfilePartyMode = "独处" | "双人" | "朋友" | "UNKNOWN";
export type ProfileEnergyLevel = "low" | "medium" | "high";
export type ProfileDeparturePreset = "now" | "plus30" | "plus60" | "tonight" | "custom";
export type ProfileMoodIntent = "治愈" | "新鲜感" | "随便走走" | "热闹一点";

export type LastIntentSnapshot = {
  moodIntent: ProfileMoodIntent;
  partyMode: ProfilePartyMode;
  energyLevel: ProfileEnergyLevel;
  departurePreset: ProfileDeparturePreset;
  customDepartureTime?: string;
};

export type PatientProfile = {
  profileVersion: 1;
  patientId: string;
  mbti: string;
  mbtiLabel?: string;
  lastIntent?: LastIntentSnapshot;
  updatedAt: string;
};

const PROFILE_KEY = "weekend_prescription_patient_profile_v1";

function createPatientId() {
  return `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadPatientProfile(): PatientProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatientProfile;
    if (!parsed || parsed.profileVersion !== 1 || !parsed.patientId || !parsed.mbti) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePatientProfile(profile: PatientProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore write failures
  }
}

export function clearPatientProfile() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore clear failures
  }
}

export function upsertPatientProfile(partial: {
  mbti: string;
  mbtiLabel?: string;
  lastIntent?: LastIntentSnapshot;
}): PatientProfile {
  const current = loadPatientProfile();
  const next: PatientProfile = {
    profileVersion: 1,
    patientId: current?.patientId ?? createPatientId(),
    mbti: partial.mbti,
    mbtiLabel: partial.mbtiLabel ?? current?.mbtiLabel,
    lastIntent: partial.lastIntent ?? current?.lastIntent,
    updatedAt: new Date().toISOString(),
  };
  savePatientProfile(next);
  return next;
}
