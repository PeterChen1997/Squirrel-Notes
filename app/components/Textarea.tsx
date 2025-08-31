import React from "react";
import Label from "./Label";

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  label?: string;
  error?: string;
  variant?: "default" | "amber" | "blue" | "green";
  size?: "sm" | "md" | "lg";
}

export default function Textarea({
  label,
  error,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: TextareaProps) {
  const baseClasses =
    "w-full border rounded-xl focus:outline-none transition-all resize-none";

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-4 py-4 text-lg",
  };

  const variantClasses = {
    default:
      "border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400",
    amber:
      "border-amber-200 dark:border-amber-600 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400",
    blue: "border-blue-200 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400",
    green:
      "border-green-200 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400",
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={props.id || props.name}>{label}</Label>}
      <textarea className={classes} {...props} />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
