// 全局状态中心：管理 MBTI 主题、流程步骤、P/J 模式和结果页数据。
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocationItem } from "../data/mockData";

export type SelectedTimeLabel = "上午" | "下午" | "晚上";

export type MbtiType =
  | "INTJ"
  | "INTP"
  | "ENTJ"
  | "ENTP"
  | "INFJ"
  | "INFP"
  | "ENFJ"
  | "ENFP"
  | "ISTJ"
  | "ISFJ"
  | "ESTJ"
  | "ESFJ"
  | "ISTP"
  | "ISFP"
  | "ESTP"
  | "ESFP";

export type ThemeFamily = "theme-neutral" | "theme-nt" | "theme-nf" | "theme-sj" | "theme-sp";
export type AppStep = "onboarding" | "mode-select" | "interaction" | "result";
export type DecisionMode = "P" | "J" | null;
export type DeparturePreset = "now" | "plus30" | "plus60" | "tonight" | "custom";
export type UserIntent = {
  moodIntent: "治愈" | "新鲜感" | "随便走走" | "热闹一点";
  partyMode: "独处" | "双人" | "朋友" | "UNKNOWN";
  energyLevel: "low" | "medium" | "high";
  departurePreset: DeparturePreset;
  customDepartureTime?: string;
};

const mbtiFamilyMap: Record<MbtiType, ThemeFamily> = {
  INTJ: "theme-nt",
  INTP: "theme-nt",
  ENTJ: "theme-nt",
  ENTP: "theme-nt",
  INFJ: "theme-nf",
  INFP: "theme-nf",
  ENFJ: "theme-nf",
  ENFP: "theme-nf",
  ISTJ: "theme-sj",
  ISFJ: "theme-sj",
  ESTJ: "theme-sj",
  ESFJ: "theme-sj",
  ISTP: "theme-sp",
  ISFP: "theme-sp",
  ESTP: "theme-sp",
  ESFP: "theme-sp",
};

type ThemeContextValue = {
  selectedMbti: MbtiType | null;
  activeTheme: ThemeFamily;
  currentStep: AppStep;
  mode: DecisionMode;
  userIntent: UserIntent | null;
  resultLocation: LocationItem | null;
  selectedTimeLabel: SelectedTimeLabel | null;
  recommendationExplain: string[];
  setMbti: (mbti: MbtiType) => void;
  setMode: (mode: Exclude<DecisionMode, null>) => void;
  setUserIntent: (intent: UserIntent) => void;
  setResultLocation: (location: LocationItem, timeLabel?: SelectedTimeLabel | null, explain?: string[]) => void;
  restartDiagnosis: () => void;
  goToStep: (step: AppStep) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const allThemes: ThemeFamily[] = ["theme-neutral", "theme-nt", "theme-nf", "theme-sj", "theme-sp"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selectedMbti, setSelectedMbti] = useState<MbtiType | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>("onboarding");
  const [mode, setModeState] = useState<DecisionMode>(null);
  const [userIntent, setUserIntentState] = useState<UserIntent | null>(null);
  const [resultLocation, setResultLocationState] = useState<LocationItem | null>(null);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState<SelectedTimeLabel | null>(null);
  const [recommendationExplain, setRecommendationExplain] = useState<string[]>([]);

  const activeTheme = selectedMbti ? mbtiFamilyMap[selectedMbti] : "theme-neutral";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...allThemes);
    root.classList.add(activeTheme);
  }, [activeTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      selectedMbti,
      activeTheme,
      currentStep,
      mode,
      userIntent,
      resultLocation,
      selectedTimeLabel,
      recommendationExplain,
      setMbti: (mbti: MbtiType) => {
        setSelectedMbti(mbti);
        setModeState(null);
        setUserIntentState(null);
        setResultLocationState(null);
        setSelectedTimeLabel(null);
        setRecommendationExplain([]);
        setCurrentStep("interaction");
      },
      setMode: (selectedMode: Exclude<DecisionMode, null>) => {
        setModeState(selectedMode);
      },
      setUserIntent: (intent: UserIntent) => {
        setUserIntentState(intent);
      },
      setResultLocation: (location: LocationItem, timeLabel: SelectedTimeLabel | null = null, explain: string[] = []) => {
        setResultLocationState(location);
        setSelectedTimeLabel(timeLabel);
        setRecommendationExplain(explain);
        setCurrentStep("result");
      },
      restartDiagnosis: () => {
        setModeState(null);
        setUserIntentState(null);
        setResultLocationState(null);
        setSelectedTimeLabel(null);
        setRecommendationExplain([]);
        setCurrentStep("interaction");
      },
      goToStep: (step: AppStep) => {
        setCurrentStep(step);
      },
    }),
    [activeTheme, currentStep, mode, recommendationExplain, resultLocation, selectedMbti, selectedTimeLabel, userIntent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

export function getMbtiFamily(mbti: MbtiType): ThemeFamily {
  return mbtiFamilyMap[mbti];
}
