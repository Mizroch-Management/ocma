import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ProtectedRoute } from "@/components/auth/protected-route";

export function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-subtle">
              <div className="container mx-auto px-6 py-8">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}