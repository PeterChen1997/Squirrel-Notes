import React from "react";

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export default function Label({
  children,
  htmlFor,
  className = "",
  required = false,
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-900 dark:text-gray-100 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
