import { Link, useLocation, Form } from "@remix-run/react";
import { useState } from "react";

interface User {
  id?: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface HeaderProps {
  user?: User;
  isDemo?: boolean;
}

export default function Header({ user, isDemo = false }: HeaderProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActiveLink = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navigationLinks = [
    { to: "/", icon: "📝", label: "记录" },
    { to: "/knowledge", icon: "🌰", label: "我的收藏" },
    { to: "/topics", icon: "🌳", label: "知识树" },
  ];

  return (
    <nav className="px-3 sm:px-6 py-3 sm:py-4 border-b border-amber-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* 左侧Logo和标题 */}
        <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
          <div className="text-xl sm:text-2xl transition-transform group-hover:scale-110">
            🐿️
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
            <h1 className="text-lg sm:text-xl font-bold text-amber-900">
              松鼠随记
            </h1>
            <div className="hidden sm:block text-sm text-amber-600 font-medium">
              勤奋收集知识
            </div>
          </div>
        </Link>

        {/* 桌面端导航 */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Demo提示 */}
          {isDemo && (
            <div className="flex items-center bg-amber-200/50 px-3 py-1 rounded-full text-xs text-amber-700">
              <span className="mr-1">👀</span>
              正在浏览示例内容
            </div>
          )}

          {/* 导航链接 */}
          {navigationLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
                isActiveLink(link.to)
                  ? "bg-amber-100 text-amber-900"
                  : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          {/* 用户菜单 */}
          {user ? (
            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-amber-200">
              <div className="flex items-center space-x-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full border border-amber-300"
                  />
                ) : (
                  <div className="w-8 h-8 bg-amber-300 rounded-full flex items-center justify-center text-amber-800 text-sm font-medium">
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block">
                  <div className="text-sm font-medium text-amber-900">
                    {user.name || "用户"}
                  </div>
                  <div className="text-xs text-amber-600">{user.email}</div>
                </div>
              </div>
              <Form method="post" action="/auth/logout">
                <button
                  type="submit"
                  className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center transition-colors px-2 py-1 rounded hover:bg-amber-50"
                >
                  <span className="mr-1">👋</span>
                  <span className="hidden lg:inline">注销</span>
                </button>
              </Form>
            </div>
          ) : (
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-amber-200">
              <Link
                to="/auth/login"
                className="text-amber-700 hover:text-amber-900 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-amber-50"
              >
                登录
              </Link>
              <Link
                to="/auth/register"
                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                注册
              </Link>
            </div>
          )}
        </div>

        {/* 移动端菜单按钮 */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Demo提示 - 移动端简化 */}
          {isDemo && (
            <div className="flex items-center bg-amber-200/50 px-2 py-1 rounded-full text-xs text-amber-700">
              <span>👀</span>
            </div>
          )}

          {/* 用户头像 - 移动端 */}
          {user && (
            <div className="w-7 h-7">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || user.email}
                  className="w-7 h-7 rounded-full border border-amber-300"
                />
              ) : (
                <div className="w-7 h-7 bg-amber-300 rounded-full flex items-center justify-center text-amber-800 text-xs font-medium">
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
              )}
            </div>
          )}

          {/* 汉堡菜单按钮 */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
            aria-label="打开菜单"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-3 py-3 border-t border-amber-100 bg-white/95 backdrop-blur-sm">
          <div className="space-y-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg mx-2 transition-all ${
                  isActiveLink(link.to)
                    ? "bg-amber-100 text-amber-900"
                    : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}

            {/* 用户相关链接 - 移动端 */}
            {user ? (
              <div className="border-t border-amber-100 mt-3 pt-3 mx-2">
                <div className="flex items-center space-x-3 px-3 py-2 text-amber-900">
                  <span className="text-lg">👤</span>
                  <div>
                    <div className="font-medium text-sm">
                      {user.name || "用户"}
                    </div>
                    <div className="text-xs text-amber-600">{user.email}</div>
                  </div>
                </div>
                <Form method="post" action="/auth/logout">
                  <button
                    type="submit"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <span className="text-lg">👋</span>
                    <span className="font-medium">注销</span>
                  </button>
                </Form>
              </div>
            ) : (
              <div className="border-t border-amber-100 mt-3 pt-3 mx-2 space-y-1">
                <Link
                  to="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <span className="text-lg">🔑</span>
                  <span className="font-medium">登录</span>
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  <span className="text-lg">✨</span>
                  <span className="font-medium">注册</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
