// 页面编排入口：根据 currentStep 在 Page1/2/3/4 之间切换。
import OnboardingPage from "./pages/OnboardingPage";
import ModeSelectPage from "./pages/ModeSelectPage";
import InteractionPage from "./pages/InteractionPage";
import ResultCardPage from "./pages/ResultCardPage";
import { useTheme } from "./context/ThemeContext";

function App() {
  const { currentStep } = useTheme();

  if (currentStep === "mode-select") {
    return <ModeSelectPage />;
  }

  if (currentStep === "interaction") {
    return <InteractionPage />;
  }

  if (currentStep === "result") {
    return <ResultCardPage />;
  }

  return <OnboardingPage />;
}

export default App;

