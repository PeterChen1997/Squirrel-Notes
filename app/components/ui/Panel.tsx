import React from "react";
import Text from "./Text";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: string;
  theme?: "default" | "blue" | "green" | "amber" | "purple" | "red";
  size?: "sm" | "md" | "lg";
  padding?: "sm" | "md" | "lg";
}

export default function Panel({
  children,
  className = "",
  title,
  icon,
  theme = "default",
  padding = "md"
}: PanelProps) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const themeClasses = {
    default: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg",
    blue: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg",
    green: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow-lg",
    amber: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl shadow-lg",
    purple: "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl shadow-lg",
    red: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-lg"
  };

  const titleColorClasses = {
    default: "text-gray-900 dark:text-gray-100",
    blue: "text-blue-900 dark:text-blue-200",
    green: "text-green-900 dark:text-green-200",
    amber: "text-amber-900 dark:text-amber-200",
    purple: "text-purple-900 dark:text-purple-200",
    red: "text-red-900 dark:text-red-200"
  };

  const textColorClasses = {
    default: "text-gray-700 dark:text-gray-300",
    blue: "text-blue-800 dark:text-blue-200",
    green: "text-green-800 dark:text-green-200",
    amber: "text-amber-800 dark:text-amber-200",
    purple: "text-purple-800 dark:text-purple-200",
    red: "text-red-800 dark:text-red-200"
  };

  return (
    <div className={`${themeClasses[theme]} ${paddingClasses[padding]} ${className}`}>
      {title && (
        <div className="mb-4">
          <Text
            size="lg"
            weight="semibold"
            color="inherit"
            className={`${titleColorClasses[theme]} flex items-center`}
          >
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </Text>
        </div>
      )}
      <div className={textColorClasses[theme]}>
        {children}
      </div>
    </div>
  );
}