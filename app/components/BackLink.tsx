import { Link } from "@remix-run/react";

interface BackLinkProps {
  to: string;
  text?: string;
  className?: string;
  showIcon?: boolean;
}

export default function BackLink({
  to,
  text = "返回",
  className = "",
  showIcon = true,
}: BackLinkProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors ${className}`}
    >
      {showIcon && (
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      )}
      {text}
    </Link>
  );
}
