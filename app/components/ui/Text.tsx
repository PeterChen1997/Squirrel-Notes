import React from "react";

interface TextProps {
  children: React.ReactNode;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  color?: "primary" | "secondary" | "muted" | "success" | "warning" | "error" | "inherit";
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export default function Text({
  children,
  className = "",
  size = "md",
  weight = "normal",
  color = "inherit",
  as: Component = "p"
}: TextProps) {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl"
  };

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold"
  };

  const colorClasses = {
    inherit: "text-gray-900 dark:text-gray-100",
    primary: "text-gray-900 dark:text-gray-100",
    secondary: "text-gray-600 dark:text-gray-400",
    muted: "text-gray-500 dark:text-gray-500",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400"
  };

  const classes = `${sizeClasses[size]} ${weightClasses[weight]} ${colorClasses[color]} ${className}`;

  return <Component className={classes}>{children}</Component>;
}