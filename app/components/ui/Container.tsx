import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "default" | "card" | "glass" | "gradient";
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Container({
  children,
  className = "",
  size = "md",
  variant = "default",
  padding = "md"
}: ContainerProps) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full"
  };

  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const variantClasses = {
    default: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg",
    card: "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg",
    glass: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-amber-200 dark:border-gray-700 rounded-2xl shadow-lg",
    gradient: "bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-amber-200 dark:border-gray-700 rounded-2xl shadow-lg"
  };

  const classes = `${sizeClasses[size]} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
}