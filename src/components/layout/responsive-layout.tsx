import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useOrganization } from "@/hooks/use-organization";
import { OrganizationSelector } from "@/components/organization/organization-selector";
import { cn } from "@/lib/utils";

export function ResponsiveLayout() {
  const { currentOrganization, userOrganizations, loading } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect to organizations page if no organization is selected
  useEffect(() => {
    if (!loading && userOrganizations.length > 0 && !currentOrganization && location.pathname !== '/organizations') {
      navigate('/organizations');
    }
  }, [currentOrganization, userOrganizations, loading, location.pathname, navigate]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="flex flex-col h-screen">
            {/* Mobile Header */}
            <header className="sticky top-0 z-40 bg-background border-b border-border">
              <div className="flex items-center justify-between px-4 py-3">
                <MobileNav />
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">O</span>
                  </div>
                  <h1 className="text-lg font-bold text-foreground">OCMA</h1>
                </div>
                <div className="w-10" /> {/* Spacer for balance */}
              </div>
            </header>

            {/* Mobile Main Content */}
            <main className="flex-1 overflow-y-auto bg-gradient-subtle">
              <div className="container mx-auto px-4 py-6 max-w-7xl">
                {!loading && userOrganizations.length === 0 && location.pathname !== '/organizations' ? (
                  <OrganizationSelector />
                ) : (
                  <Outlet />
                )}
              </div>
            </main>

            {/* Mobile Bottom Navigation (optional) */}
            <nav className="sticky bottom-0 z-40 bg-background border-t border-border md:hidden">
              <div className="grid grid-cols-5 gap-1 px-2 py-2">
                {/* Quick access navigation items can go here */}
              </div>
            </nav>
          </div>
        ) : (
          /* Desktop Layout */
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-subtle">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
                  {!loading && userOrganizations.length === 0 && location.pathname !== '/organizations' ? (
                    <OrganizationSelector />
                  ) : (
                    <Outlet />
                  )}
                </div>
              </main>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}