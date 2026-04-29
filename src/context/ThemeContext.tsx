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
  resultLocation: LocationItem | null;
  selectedTimeLabel: SelectedTimeLabel | null;
  setMbti: (mbti: MbtiType) => void;
  setMode: (mode: Exclude<DecisionMode, null>) => void;
  setResultLocation: (location: LocationItem, timeLabel?: SelectedTimeLabel | null) => void;
  restartDiagnosis: () => void;
  goToStep: (step: AppStep) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const allThemes: ThemeFamily[] = ["theme-neutral", "theme-nt", "theme-nf", "theme-sj", "theme-sp"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selectedMbti, setSelectedMbti] = useState<MbtiType | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>("onboarding");
  const [mode, setModeState] = useState<DecisionMode>(null);
  const [resultLocation, setResultLocationState] = useState<LocationItem | null>(null);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState<SelectedTimeLabel | null>(null);

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
      resultLocation,
      selectedTimeLabel,
      setMbti: (mbti: MbtiType) => {
        setSelectedMbti(mbti);
        setModeState(null);
        setResultLocationState(null);
        setSelectedTimeLabel(null);
        setCurrentStep("mode-select");
      },
      setMode: (selectedMode: Exclude<DecisionMode, null>) => {
        setModeState(selectedMode);
        setResultLocationState(null);
        setSelectedTimeLabel(null);
        setCurrentStep("interaction");
      },
      setResultLocation: (location: LocationItem, timeLabel: SelectedTimeLabel | null = null) => {
        setResultLocationState(location);
        setSelectedTimeLabel(timeLabel);
        setCurrentStep("result");
      },
      restartDiagnosis: () => {
        setModeState(null);
        setResultLocationState(null);
        setSelectedTimeLabel(null);
        setCurrentStep("mode-select");
      },
      goToStep: (step: AppStep) => {
        setCurrentStep(step);
      },
    }),
    [activeTheme, currentStep, mode, resultLocation, selectedMbti, selectedTimeLabel]
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
