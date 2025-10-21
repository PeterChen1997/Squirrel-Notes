import { Link, useLocation, Form } from "@remix-run/react";
import { useState } from "react";
import { Dialog, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import ThemeToggle from "./ThemeToggle";

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

  // 处理注销
  const handleLogout = async () => {
    try {

      // 发送注销请求
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.ok) {
        // 强制刷新页面
        window.location.href = "/";
      } else {
        console.error("注销失败");
        // 即使失败也重定向到首页
        window.location.href = "/";
      }
    } catch (error) {
      console.error("注销请求失败:", error);
      // 出错时也重定向到首页
      window.location.href = "/";
    }
  };

  const isActiveLink = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  // 获取当前页面标题
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "记录";
    if (path.startsWith("/knowledge")) {
      if (path.includes("knowledge/")) return "笔记详情";
      return "我的收藏";
    }
    if (path.startsWith("/analyze")) return "编辑笔记";
    if (path.startsWith("/progress")) return "AI分析中";
    if (path.startsWith("/auth/login")) return "登录";
    if (path.startsWith("/auth/register")) return "注册";
    return "松鼠随记";
  };

  const navigationLinks = [
    { to: "/", icon: "📝", label: "记录" },
    { to: "/knowledge", icon: "🌰", label: "我的收藏" },
  ];

  return (
    <nav className="px-3 sm:px-6 py-3 sm:py-4 border-b border-amber-100 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* 左侧Logo和标题 */}
        <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
          <div className="text-xl sm:text-2xl transition-transform group-hover:scale-110">
            🐿️
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
            <h1 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-100">
              松鼠随记
            </h1>
            <div className="hidden sm:block text-sm text-amber-600 dark:text-amber-400 font-medium">
              勤奋收集知识
            </div>
          </div>
        </Link>

        {/* 移动端页面标题 */}
        {/* <div className="md:hidden flex-1 px-4">
          <h2 className="text-sm font-medium text-amber-800 dark:text-amber-200 truncate">
            {getPageTitle()}
          </h2>
        </div> */}

        {/* 桌面端导航 */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Demo提示 */}
          {/* {isDemo && (
            <div className="flex items-center bg-amber-200/50 px-3 py-1 rounded-full text-xs text-amber-700">
              <span className="mr-1">👀</span>
              正在浏览示例内容
            </div>
          )} */}

          {/* 导航链接 */}
          {navigationLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
                isActiveLink(link.to)
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100"
                  : "text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          {/* 用户菜单 */}
          {user ? (
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-amber-200">
              {/* 主题切换 */}
              <ThemeToggle />

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
                  <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {user.name || "用户"}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-sm font-medium flex items-center transition-colors px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <span className="mr-1">👋</span>
                <span className="hidden lg:inline">注销</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-amber-200">
              {/* 主题切换 */}
              <ThemeToggle />

              <Link
                to="/auth/login"
                className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
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
          {/* 主题切换 - 移动端 */}
          <ThemeToggle />

          {/* Demo提示 - 移动端简化 */}
          {/* {isDemo && (
            <div className="flex items-center bg-amber-200/50 px-2 py-1 rounded-full text-xs text-amber-700">
              <span>👀</span>
            </div>
          )} */}

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

          {/* 移动端菜单 */}
          <Menu as="div" className="relative">
            <MenuButton
              className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20 transition-colors"
              aria-label="打开菜单"
            >
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
            </MenuButton>

            <MenuItems className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <div className="p-2 space-y-1">
                {navigationLinks.map((link) => (
                  <MenuItem key={link.to}>
                    <Link
                      to={link.to}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all w-full text-left ${
                        isActiveLink(link.to)
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100"
                          : "text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      }`}
                    >
                      <span className="text-lg">{link.icon}</span>
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </MenuItem>
                ))}

                {/* 用户相关链接 - 移动端 */}
                {user ? (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    <MenuItem disabled>
                      <div className="flex items-center space-x-3 px-3 py-2 text-amber-900 dark:text-amber-100 opacity-75">
                        <span className="text-lg">👤</span>
                        <div>
                          <div className="font-medium text-sm">
                            {user.name || "用户"}
                          </div>
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </MenuItem>
                    <MenuItem>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-3 py-3 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors text-left"
                      >
                        <span className="text-lg">👋</span>
                        <span className="font-medium">注销</span>
                      </button>
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    <MenuItem>
                      <Link
                        to="/auth/login"
                        className="flex items-center space-x-3 px-3 py-3 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors w-full text-left"
                      >
                        <span className="text-lg">🔑</span>
                        <span className="font-medium">登录</span>
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <Link
                        to="/auth/register"
                        className="flex items-center space-x-3 px-3 py-3 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-lg transition-colors w-full text-left"
                      >
                        <span className="text-lg">✨</span>
                        <span className="font-medium">注册</span>
                      </Link>
                    </MenuItem>
                  </>
                )}
              </div>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </nav>
  );
}
