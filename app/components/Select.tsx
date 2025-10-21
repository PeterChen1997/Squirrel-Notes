import React from "react";
import { Label } from "@headlessui/react";
import LabelComponent from "./Label";

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  variant?: "default" | "amber" | "blue" | "green";
  size?: "sm" | "md" | "lg";
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export default function Select({
  label,
  error,
  variant = "default",
  size = "md",
  className = "",
  options,
  ...props
}: SelectProps) {
  const baseClasses =
    "w-full border rounded-xl focus:outline-none transition-all";

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-4 py-4 text-lg",
  };

  const variantClasses = {
    default:
      "border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    amber:
      "border-amber-200 dark:border-amber-600 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    blue: "border-blue-200 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    green:
      "border-green-200 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <div className="space-y-2">
      {label && (
        <Label
          htmlFor={props.id || props.name}
          className="block text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <select className={classes} {...props}>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
