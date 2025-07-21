export default function Calendar() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your scheduled content across all platforms.
        </p>
      </div>
      
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h3 className="text-xl font-semibold text-foreground mb-2">Calendar Coming Soon</h3>
        <p className="text-muted-foreground">
          Interactive calendar with drag-and-drop functionality will be available here.
        </p>
      </div>
    </div>
  );
}