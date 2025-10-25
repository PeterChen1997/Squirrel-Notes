import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { initDatabase, estimateAllKnowledgePointsDuration, updateAllTopicsLearningTime } from "~/lib/db.server";
import { getCurrentUser } from "~/lib/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await initDatabase();

  // 检查是否为管理员用户（这里简化为检查是否为登录用户）
  const { user } = await getCurrentUser(request);
  if (!user?.email?.includes("admin")) {
    return json({ error: "无权限执行此操作" }, { status: 403 });
  }

  return json({
    message: "数据迁移接口",
    actions: [
      "POST /migrate/estimate-duration - 估算所有知识点的学习时长",
      "POST /migrate/update-topics - 更新所有主题的学习时长统计"
    ]
  });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  await initDatabase();

  // 检查权限
  const { user } = await getCurrentUser(request);
  if (!user?.email?.includes("admin")) {
    return json({ error: "无权限执行此操作" }, { status: 403 });
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    switch (action) {
      case "estimate-duration":
        await estimateAllKnowledgePointsDuration();
        return json({ success: true, message: "已成功估算所有知识点的学习时长" });

      case "update-topics":
        await updateAllTopicsLearningTime();
        return json({ success: true, message: "已成功更新所有主题的学习时长统计" });

      case "full-migration":
        await estimateAllKnowledgePointsDuration();
        await updateAllTopicsLearningTime();
        return json({ success: true, message: "已完成完整数据迁移" });

      default:
        return json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error) {
    console.error("数据迁移失败:", error);
    return json({
      error: "数据迁移失败",
      details: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 });
  }
};