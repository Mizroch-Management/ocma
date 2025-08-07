import { memo } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// Generic loading spinner
export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = "default", 
  className 
}: { 
  size?: "sm" | "default" | "lg"; 
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
});

// Page loading with message
export const PageLoadingSpinner = memo(function PageLoadingSpinner({
  message = "Loading..."
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
});

// Inline loading for buttons
export const ButtonLoading = memo(function ButtonLoading({
  size = "sm",
  className
}: {
  size?: "sm" | "default";
  className?: string;
}) {
  return <LoadingSpinner size={size} className={cn("mr-2", className)} />;
});

// Refresh loading indicator
export const RefreshLoading = memo(function RefreshLoading({
  isLoading,
  size = "default",
  className
}: {
  isLoading: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-5 w-5"
  };

  return (
    <RefreshCw 
      className={cn(
        sizeClasses[size], 
        isLoading && "animate-spin",
        className
      )} 
    />
  );
});

// Skeleton components for better loading UX
export const SkeletonLine = memo(function SkeletonLine({
  width = "100%",
  height = "1rem",
  className
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div 
      className={cn("animate-pulse bg-muted rounded", className)}
      style={{ width, height }}
    />
  );
});

export const SkeletonCard = memo(function SkeletonCard({
  lines = 3,
  showAvatar = false,
  className
}: {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("p-4 border rounded-lg space-y-3", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <div className="animate-pulse bg-muted rounded-full h-10 w-10" />
          <div className="space-y-2 flex-1">
            <SkeletonLine width="30%" />
            <SkeletonLine width="50%" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine 
            key={i}
            width={i === lines - 1 ? "70%" : "100%"}
          />
        ))}
      </div>
    </div>
  );
});

// Dashboard metrics skeleton
export const MetricsCardSkeleton = memo(function MetricsCardSkeleton() {
  return (
    <div className="p-6 border rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonLine width="40%" height="1.25rem" />
        <div className="animate-pulse bg-muted rounded h-6 w-6" />
      </div>
      <SkeletonLine width="60%" height="2rem" />
      <SkeletonLine width="30%" height="0.875rem" />
    </div>
  );
});

// Activity list skeleton
export const ActivityListSkeleton = memo(function ActivityListSkeleton({
  items = 5
}: {
  items?: number;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start space-x-3 py-3">
          <div className="animate-pulse bg-muted rounded-full h-8 w-8" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <SkeletonLine width="40%" />
              <SkeletonLine width="20%" />
            </div>
            <SkeletonLine width="80%" />
            <div className="flex items-center space-x-2">
              <div className="animate-pulse bg-muted rounded-full h-5 w-5" />
              <SkeletonLine width="25%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// Calendar day skeleton
export const CalendarDaySkeleton = memo(function CalendarDaySkeleton() {
  return (
    <div className="min-h-[100px] p-2 border border-border">
      <SkeletonLine width="1rem" height="1rem" className="mb-2" />
      <div className="space-y-1">
        <SkeletonLine width="100%" height="1.5rem" />
        <SkeletonLine width="80%" height="1.5rem" />
      </div>
    </div>
  );
});

// Table row skeleton
export const TableRowSkeleton = memo(function TableRowSkeleton({
  columns = 4
}: {
  columns?: number;
}) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonLine width="100%" />
        </td>
      ))}
    </tr>
  );
});

// Content card skeleton for generated content
export const ContentCardSkeleton = memo(function ContentCardSkeleton() {
  return (
    <div className="p-3 border rounded-lg space-y-3">
      <div className="flex justify-between items-start">
        <SkeletonLine width="60%" height="1.25rem" />
        <SkeletonLine width="20%" height="1.25rem" />
      </div>
      <SkeletonLine width="100%" />
      <SkeletonLine width="80%" />
      <div className="flex items-center gap-1">
        <div className="animate-pulse bg-muted rounded h-6 w-6" />
        <div className="animate-pulse bg-muted rounded h-6 w-6" />
        <div className="animate-pulse bg-muted rounded h-6 w-6" />
      </div>
    </div>
  );
});

// Loading states for different data scenarios
export const EmptyState = memo(function EmptyState({
  title,
  description,
  action,
  icon: Icon
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="text-center py-8">
      {Icon && <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  );
});

// Error state component
export const ErrorState = memo(function ErrorState({
  title = "Something went wrong",
  description = "There was an error loading this content",
  retry,
  className
}: {
  title?: string;
  description?: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("text-center py-8", className)}>
      <div className="text-destructive mb-4">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {retry && (
        <button 
          onClick={retry}
          className="text-primary hover:text-primary/80 underline"
        >
          Try again
        </button>
      )}
    </div>
  );
});

// Loading wrapper component that handles different states
export const LoadingWrapper = memo(function LoadingWrapper({
  isLoading,
  error,
  isEmpty,
  emptyTitle = "No data found",
  emptyDescription = "There is no data to display",
  children,
  skeleton,
  retry,
  className
}: {
  isLoading: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  retry?: () => void;
  className?: string;
}) {
  if (isLoading) {
    return skeleton ? (
      <div className={className}>{skeleton}</div>
    ) : (
      <PageLoadingSpinner />
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <ErrorState 
        description={errorMessage}
        retry={retry}
        className={className}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState 
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <div className={className}>{children}</div>;
});