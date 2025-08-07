import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 focus-visible:ring-primary active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-primary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:ring-secondary",
        ghost:
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent",
        link:
          "text-primary underline-offset-4 hover:underline focus-visible:ring-primary",
        success:
          "bg-success text-white shadow hover:bg-success/90 focus-visible:ring-success active:scale-[0.98]",
      },
      size: {
        xs: "h-7 px-2 text-xs min-w-[28px]",
        sm: "h-8 px-3 text-sm min-w-[32px]",
        default: "h-10 px-4 py-2 min-w-[40px]",
        lg: "h-12 px-8 text-lg min-w-[48px]",
        xl: "h-14 px-10 text-xl min-w-[56px]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-describedby"?: string;
  "aria-haspopup"?: boolean | "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog";
  tooltip?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      tooltip,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const hasOnlyIcon = !children && (leftIcon || rightIcon);

    // Ensure proper ARIA label for icon-only buttons
    if (hasOnlyIcon && !props["aria-label"]) {
      console.warn(
        "AccessibleButton: Icon-only buttons should have an aria-label for accessibility"
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        title={tooltip}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}

        {/* Left icon */}
        {!loading && leftIcon && (
          <span className="mr-2" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Button content */}
        {loading ? (
          <span>{loadingText || children || "Loading..."}</span>
        ) : (
          children
        )}

        {/* Right icon */}
        {!loading && rightIcon && (
          <span className="ml-2" aria-hidden="true">
            {rightIcon}
          </span>
        )}

        {/* Screen reader only loading announcement */}
        {loading && (
          <span className="sr-only" aria-live="polite">
            Loading, please wait
          </span>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

// Icon button wrapper for better accessibility
interface IconButtonProps extends AccessibleButtonProps {
  "aria-label": string; // Required for icon buttons
  icon: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "icon", ...props }, ref) => {
    return (
      <AccessibleButton ref={ref} size={size} {...props}>
        {icon}
      </AccessibleButton>
    );
  }
);

IconButton.displayName = "IconButton";

// Toggle button with proper ARIA states
interface ToggleButtonProps extends Omit<AccessibleButtonProps, "aria-pressed"> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ pressed, onPressedChange, onClick, ...props }, ref) => {
    return (
      <AccessibleButton
        ref={ref}
        aria-pressed={pressed}
        onClick={(e) => {
          onPressedChange(!pressed);
          onClick?.(e);
        }}
        {...props}
      />
    );
  }
);

ToggleButton.displayName = "ToggleButton";

// Button group for better keyboard navigation
interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  "aria-label": string;
}

export const ButtonGroup = ({ children, orientation = "horizontal", ...props }: ButtonGroupProps) => {
  return (
    <div
      role="group"
      aria-orientation={orientation}
      className={cn(
        "inline-flex",
        orientation === "horizontal" ? "flex-row space-x-1" : "flex-col space-y-1"
      )}
      {...props}
    >
      {children}
    </div>
  );
};