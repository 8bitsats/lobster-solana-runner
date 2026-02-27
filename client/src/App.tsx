import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import History from "./pages/History";
import Skins from "./pages/Skins";
import Tokens from "./pages/Tokens";
import Arena from "./pages/Arena";
import Agents from "./pages/Agents";
import Predictions from "./pages/Predictions";
import Profile from "./pages/Profile";
import Treasury from "./pages/Treasury";
import { useEffect } from "react";

function ElevenLabsWidget() {
  useEffect(() => {
    // Load ElevenLabs ConvAI widget script
    const existingScript = document.querySelector('script[src*="elevenlabs"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      document.body.appendChild(script);
    }

    // Add the widget element if not present
    if (!document.querySelector("elevenlabs-convai")) {
      const widget = document.createElement("elevenlabs-convai");
      widget.setAttribute("agent-id", "agent_0001kcf3a94bfcm9kj51ss02gnv0");
      document.body.appendChild(widget);
    }
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/play" component={Game} />
      <Route path="/game" component={Game} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/history" component={History} />
      <Route path="/skins" component={Skins} />
      <Route path="/tokens" component={Tokens} />
      <Route path="/arena" component={Arena} />
      <Route path="/agents" component={Agents} />
      <Route path="/predictions" component={Predictions} />
      <Route path="/profile" component={Profile} />
      <Route path="/treasury" component={Treasury} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <ElevenLabsWidget />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
