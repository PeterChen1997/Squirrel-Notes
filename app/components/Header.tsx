import { Link, useLocation } from "@remix-run/react";

export default function Header() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="text-2xl">🐈</div>
            <span className="text-lg font-bold text-gray-900">倾听小猫</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {!isHomePage && (
              <Link
                to="/"
                className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-xl font-medium hover:from-pink-500 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-md text-sm"
              >
                🐱 新对话
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
