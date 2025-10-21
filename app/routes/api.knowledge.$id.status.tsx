import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { initDatabase, getKnowledgePoint } from "~/lib/db.server";
import { getCurrentUser } from "~/lib/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await initDatabase();

  const { user, anonymousId } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;
  const knowledgeId = params.id;

  if (!knowledgeId) {
    return json({ error: "Knowledge ID is required" }, { status: 400 });
  }

  try {
    const knowledgePoint = await getKnowledgePoint(knowledgeId, userId);

    if (!knowledgePoint) {
      return json({ error: "Knowledge point not found" }, { status: 404 });
    }

    return json({
      status: knowledgePoint.processing_status,
      learning_topic_id: knowledgePoint.learning_topic_id,
      title: knowledgePoint.title,
      summary: knowledgePoint.summary,
      confidence: knowledgePoint.confidence,
    });
  } catch (error) {
    console.error("Error fetching knowledge status:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}