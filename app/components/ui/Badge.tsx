import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "blue" | "green" | "amber" | "purple" | "red" | "gray" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: string;
}

export default function Badge({
  children,
  className = "",
  variant = "default",
  size = "md",
  icon
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base"
  };

  const variantClasses = {
    default: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 rounded-full",
    green: "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 rounded-full",
    amber: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200 rounded-full",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 rounded-full",
    red: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 rounded-full",
    gray: "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-600",
    outline: "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-full"
  };

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}