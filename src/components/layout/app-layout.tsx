import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useOrganization } from "@/hooks/use-organization";
import { OrganizationSelector } from "@/components/organization/organization-selector";

export function AppLayout() {
  const { currentOrganization, userOrganizations, loading } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to organizations page if no organization is selected and not already there
  useEffect(() => {
    if (!loading && userOrganizations.length > 0 && !currentOrganization && location.pathname !== '/organizations') {
      navigate('/organizations');
    }
  }, [currentOrganization, userOrganizations, loading, location.pathname, navigate]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-subtle">
              <div className="container mx-auto px-6 py-8">
                {!loading && userOrganizations.length === 0 && location.pathname !== '/organizations' ? (
                  <OrganizationSelector />
                ) : (
                  <Outlet />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}