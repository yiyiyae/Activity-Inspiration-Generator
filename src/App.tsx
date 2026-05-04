// 页面编排入口：根据 currentStep 在 Page1/2/3/4 之间切换。
import OnboardingPage from "./pages/OnboardingPage";
import MbtiQuizPage from "./pages/MbtiQuizPage";
import ReturningPatientPage from "./pages/ReturningPatientPage";
import ModeSelectPage from "./pages/ModeSelectPage";
import InteractionPage from "./pages/InteractionPage";
import ResultCardPage from "./pages/ResultCardPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import { useTheme } from "./context/ThemeContext";

function App() {
  const { currentStep, isBootstrapping } = useTheme();
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;

  if (pathname.startsWith("/admin/analytics")) {
    return <AdminAnalyticsPage />;
  }

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-skin-bg text-skin-text">
        <p className="text-sm opacity-70">正在读取你的就诊档案...</p>
      </main>
    );
  }

  if (currentStep === "onboarding-returning") {
    return <ReturningPatientPage />;
  }

  if (currentStep === "mbti-quiz") {
    return <MbtiQuizPage />;
  }

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

