import { forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, X, AlertCircle, Info, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FormFieldEnhancedProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  validating?: boolean;
  characterLimit?: number;
  showCharacterCount?: boolean;
  icon?: React.ReactNode;
  variant?: "default" | "floating" | "outlined";
  size?: "sm" | "md" | "lg";
}

export const FormFieldEnhanced = forwardRef<HTMLInputElement, FormFieldEnhancedProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      required,
      showPasswordToggle,
      validating,
      characterLimit,
      showCharacterCount,
      icon,
      variant = "default",
      size = "md",
      className,
      type = "text",
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
      if (value) {
        setCharCount(String(value).length);
      }
    }, [value]);

    const inputType = showPasswordToggle && showPassword ? "text" : type;
    const hasValue = Boolean(value);

    const sizeClasses = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-base",
      lg: "h-12 px-5 text-lg",
    };

    const getInputClasses = () => {
      const base = cn(
        "w-full rounded-md transition-all duration-200",
        "border bg-background",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[size],
        icon && "pl-10"
      );

      if (error) {
        return cn(base, "border-destructive focus:ring-destructive/20");
      }

      if (success) {
        return cn(base, "border-success focus:ring-success/20");
      }

      return cn(base, "border-input focus:ring-primary/20 focus:border-primary");
    };

    const renderValidationIcon = () => {
      if (validating) {
        return (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        );
      }

      if (error) {
        return (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        );
      }

      if (success) {
        return (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
        );
      }

      return null;
    };

    return (
      <div className="space-y-2">
        {/* Label */}
        {variant !== "floating" && (
          <label
            htmlFor={props.id}
            className={cn(
              "block text-sm font-medium",
              error && "text-destructive",
              success && "text-success",
              !error && !success && "text-foreground"
            )}
          >
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}

          {/* Floating Label */}
          {variant === "floating" && (
            <label
              htmlFor={props.id}
              className={cn(
                "absolute left-4 transition-all duration-200 pointer-events-none",
                isFocused || hasValue
                  ? "top-0 -translate-y-1/2 text-xs bg-background px-1"
                  : "top-1/2 -translate-y-1/2 text-base",
                error && "text-destructive",
                success && "text-success",
                !error && !success && "text-muted-foreground"
              )}
            >
              {label}
              {required && <span className="ml-1 text-destructive">*</span>}
            </label>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={inputType}
            value={value}
            disabled={disabled}
            className={cn(getInputClasses(), className)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {/* Password Toggle */}
          {showPasswordToggle && type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Validation Icon */}
          {renderValidationIcon()}
        </div>

        {/* Helper Text / Error Message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              id={`${props.id}-error`}
              className="flex items-center gap-1 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="h-3 w-3" />
              <span>{error}</span>
            </motion.div>
          )}

          {!error && helperText && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              id={`${props.id}-helper`}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <Info className="h-3 w-3" />
              <span>{helperText}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character Count */}
        {showCharacterCount && characterLimit && (
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                charCount > characterLimit
                  ? "text-destructive"
                  : charCount > characterLimit * 0.8
                  ? "text-warning"
                  : "text-muted-foreground"
              )}
            >
              {charCount} / {characterLimit}
            </span>
          </div>
        )}
      </div>
    );
  }
);

FormFieldEnhanced.displayName = "FormFieldEnhanced";