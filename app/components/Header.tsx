import { Link, useLocation, Form } from "@remix-run/react";

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

  const isActiveLink = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="px-6 py-4 border-b border-amber-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* 左侧Logo和标题 */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="text-2xl transition-transform group-hover:scale-110">
            🐿️
          </div>
          <h1 className="text-xl font-bold text-amber-900">松鼠随记</h1>
          <div className="text-sm text-amber-600 font-medium">勤奋收集知识</div>
        </Link>

        {/* 右侧内容 */}
        <div className="flex items-center space-x-4">
          {/* Demo提示 */}
          {isDemo && (
            <div className="hidden sm:flex items-center bg-amber-200/50 px-3 py-1 rounded-full text-xs text-amber-700">
              <span className="mr-1">👀</span>
              正在浏览示例内容
            </div>
          )}

          {/* 导航链接 */}
          <Link
            to="/"
            className={`font-medium flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
              isActiveLink("/")
                ? "bg-amber-100 text-amber-900"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
            }`}
          >
            <span>📝</span>
            <span>记录</span>
          </Link>

          <Link
            to="/knowledge"
            className={`font-medium flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
              isActiveLink("/knowledge")
                ? "bg-amber-100 text-amber-900"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
            }`}
          >
            <span>🌰</span>
            <span>我的收藏</span>
          </Link>

          <Link
            to="/topics"
            className={`font-medium flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
              isActiveLink("/topics")
                ? "bg-amber-100 text-amber-900"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
            }`}
          >
            <span>🌳</span>
            <span>知识树</span>
          </Link>

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
                <div className="hidden sm:block">
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
                  注销
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
      </div>
    </nav>
  );
}
