import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ResponsiveLayout } from "./components/layout/responsive-layout";
import { WorkflowProvider } from "./contexts/workflow-context";
import { StrategyProvider } from "./contexts/strategy-context";
import { AuthProvider } from "./hooks/use-auth";
import { OrganizationProvider } from "./hooks/use-organization";
import { SimpleErrorBoundary } from "./lib/simple-error-boundary";
import { PageLoadingSpinner } from "./components/ui/loading-spinner";
import { ThemeProvider } from "./components/theme/theme-provider";

// Eager load critical components
import Index from "./pages/Index";  // FIXED - Using full Index with Dashboard
import Auth from "./pages/Auth";

// Lazy load non-critical components for better initial bundle size
const Calendar = lazy(() => import("./pages/Calendar"));
const ContentCreation = lazy(() => import("./pages/ContentCreation"));
const ContentGenerator = lazy(() => import("./pages/ContentGenerator"));
const AIWorkflow = lazy(() => import("./pages/AIWorkflow"));
const VisualCreator = lazy(() => import("./pages/VisualCreator"));
const Strategy = lazy(() => import("./pages/Strategy"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SocialMediaEngagement = lazy(() => import("./pages/SocialMediaEngagement"));
const Team = lazy(() => import("./pages/TeamNew"));
const Settings = lazy(() => import("./pages/Settings"));
const Organizations = lazy(() => import("./pages/Organizations"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Retry network errors but not 4xx client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
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
  <SimpleErrorBoundary>
    <ThemeProvider defaultTheme="system" storageKey="ocma-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrganizationProvider>
            <WorkflowProvider>
              <StrategyProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<ResponsiveLayout />}>
                    <Route index element={<Index />} />
                    <Route path="calendar" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <Calendar />
                      </Suspense>
                    } />
                    <Route path="content-creation" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <ContentCreation />
                      </Suspense>
                    } />
                    <Route path="content-generator" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <ContentGenerator />
                      </Suspense>
                    } />
                    <Route path="ai-workflow" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <AIWorkflow />
                      </Suspense>
                    } />
                    <Route path="visual-creator" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <VisualCreator />
                      </Suspense>
                    } />
                    <Route path="strategy" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <Strategy />
                      </Suspense>
                    } />
                    <Route path="analytics" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <Analytics />
                      </Suspense>
                    } />
                    <Route path="social-engagement" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <SocialMediaEngagement />
                      </Suspense>
                    } />
                    <Route path="team" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <Team />
                      </Suspense>
                    } />
                    <Route path="organizations" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <Organizations />
                      </Suspense>
                    } />
                    <Route path="settings" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <Settings />
                      </Suspense>
                    } />
                    <Route path="*" element={
                      <Suspense fallback={<PageLoadingSpinner />}>
                        <NotFound />
                      </Suspense>
                    } />
                  </Route>
                </Routes>
              </BrowserRouter>
                </TooltipProvider>
              </StrategyProvider>
            </WorkflowProvider>
          </OrganizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </SimpleErrorBoundary>
);

export default App;