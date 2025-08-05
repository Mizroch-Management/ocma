
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/app-layout";
import { WorkflowProvider } from "./contexts/workflow-context";
import { AuthProvider } from "./hooks/use-auth";
import { OrganizationProvider } from "./hooks/use-organization";
import { ErrorBoundary } from "./components/error-boundary";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import ContentCreation from "./pages/ContentCreation";
import ContentGenerator from "./pages/ContentGenerator";
import AIWorkflow from "./pages/AIWorkflow";
import VisualCreator from "./pages/VisualCreator";
import Strategy from "./pages/Strategy";
import Analytics from "./pages/Analytics";
import SocialMediaEngagement from "./pages/SocialMediaEngagement";
import Team from "./pages/TeamNew";
import Settings from "./pages/Settings";
import Organizations from "./pages/Organizations";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <WorkflowProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="content-creation" element={<ContentCreation />} />
                <Route path="content-generator" element={<ContentGenerator />} />
                <Route path="ai-workflow" element={<AIWorkflow />} />
                <Route path="visual-creator" element={<VisualCreator />} />
                <Route path="strategy" element={<Strategy />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="social-engagement" element={<SocialMediaEngagement />} />
                <Route path="team" element={<Team />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
          </WorkflowProvider>
        </OrganizationProvider>
      </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
