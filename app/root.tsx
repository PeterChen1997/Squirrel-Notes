import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { initDatabase } from "~/lib/db.server";

import "./tailwind.css";

// 确保在服务器启动时初始化数据库
let dbInitialized = false;

export async function loader({ request }: LoaderFunctionArgs) {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
      console.log("数据库初始化成功");
    } catch (error) {
      console.error("数据库初始化失败:", error);
    }
  }
  return json({});
}

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "apple-touch-icon", href: "/logo-light.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          defer
          src="https://a.hweb.peterchen97.cn/script.js"
          data-website-id="f6af9655-6fa7-486a-ab80-8689989fe76e"
        ></script>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="松鼠随记" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  // 开发环境提示
                  const isDev = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.port === '5173';
                  
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('SW registered');
                      if (isDev) {
                        console.log('🔥 开发环境：Service Worker 使用 Network First 策略，应该能看到最新内容');
                      }
                    })
                    .catch(error => console.log('SW registration failed', error));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <Outlet />
    </>
  );
}
