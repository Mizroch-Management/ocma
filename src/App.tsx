import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/app-layout";
import { WorkflowProvider } from "./contexts/workflow-context";
import { AuthProvider } from "./hooks/use-auth";
import { OrganizationProvider } from "./hooks/use-organization";
import { ErrorBoundary } from "./lib/error-handling/error-boundary";
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
import Index from "./pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Retry network errors but not 4xx client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Only retry 5xx server errors and network errors
        if (error?.status >= 500 || !error?.status) {
          return failureCount < 1;
        }
        return false;
      },
    },
  },
});

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
                    <Route index element={<Index />} />
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
                    <Route path="*" element={<NotFound />} />
                  </Route>
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