import React from "react";

interface PageTitleProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  className?: string;
}

export default function PageTitle({
  title,
  subtitle,
  icon = "📄",
  className = "",
}: PageTitleProps) {
  return (
    <div className={`text-center mb-8 animate-fade-in ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <span className="text-3xl sm:text-4xl mr-3">{icon}</span>
        {title && (
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            {title}
          </h1>
        )}
      </div>
      {subtitle && (
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
