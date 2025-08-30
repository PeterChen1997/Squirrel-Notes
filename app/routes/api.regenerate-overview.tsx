import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  updateTopicOverviewAsync,
  getLearningTopic,
  getAllKnowledgePoints,
} from "~/lib/db.server";
import { getCurrentUser } from "~/lib/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { user, anonymousId } = await getCurrentUser(request);
    const userId = user?.id || anonymousId;

    const { topicId } = await request.json();

    if (!topicId) {
      return json({ error: "Topic ID is required" }, { status: 400 });
    }

    // 验证主题是否存在且属于当前用户
    const topic = await getLearningTopic(topicId);
    if (!topic || topic.user_id !== userId) {
      return json({ error: "Topic not found" }, { status: 404 });
    }

    // 重新生成概览
    await updateTopicOverviewAsync(topicId);

    return json({ success: true });
  } catch (error) {
    console.error("重新生成概览失败:", error);
    return json({ error: "Failed to regenerate overview" }, { status: 500 });
  }
};
