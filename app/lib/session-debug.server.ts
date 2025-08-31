// 会话调试工具 - 仅开发环境使用
import { pool } from "./db.server";

export async function debugSessions() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  try {
    console.log("=== 会话调试信息 ===");

    // 查看当前所有活跃会话
    const activeSessions = await pool.query(
      `SELECT us.id, us.user_id, us.expires_at, u.email,
              CASE 
                WHEN us.expires_at > CURRENT_TIMESTAMP THEN '有效'
                ELSE '已过期'
              END as status
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       ORDER BY us.expires_at DESC
       LIMIT 10`
    );

    console.log("活跃会话列表:", activeSessions.rows);

    // 清理过期会话
    const cleanupResult = await pool.query(
      "DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP"
    );

    if (cleanupResult.rowCount && cleanupResult.rowCount > 0) {
      console.log(`清理了 ${cleanupResult.rowCount} 个过期会话`);
    }

    console.log("=== 调试信息结束 ===");
  } catch (error) {
    console.error("会话调试失败:", error);
  }
}

// 每10分钟自动清理一次过期会话
if (process.env.NODE_ENV !== "production") {
  setInterval(async () => {
    try {
      const result = await pool.query(
        "DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP"
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[自动清理] 删除了 ${result.rowCount} 个过期会话`);
      }
    } catch (error) {
      console.error("[自动清理] 清理过期会话失败:", error);
    }
  }, 10 * 60 * 1000); // 10分钟
}
