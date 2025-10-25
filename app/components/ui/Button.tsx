import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  type = "button",
  onClick
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-all",
    outline: "border-2 border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300 font-medium rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:border-gray-300 disabled:text-gray-400 dark:disabled:border-gray-600 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-all",
    ghost: "text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-all",
    success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100",
    warning: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100",
    error: "bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium rounded-lg hover:from-red-600 hover:to-rose-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100"
  };

  const classes = `${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
      )}
      {children}
    </button>
  );
}