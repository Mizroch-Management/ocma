import { useOrganization } from "@/hooks/use-organization";

function Dashboard() {
  const { currentOrganization } = useOrganization();
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard - Minimal Test</h1>
      <p>Organization: {currentOrganization?.name}</p>
      <p className="text-sm text-muted-foreground mt-4">
        If you see this, the error was in the Dashboard's data loading or child components.
      </p>
    </div>
  );
}

export default Dashboard;
