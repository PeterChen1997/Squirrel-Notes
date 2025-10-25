import React from "react";
import { Link } from "@remix-run/react";
import { Container, Text, Badge, Button } from "./ui";
import type { LearningTopic, KnowledgePoint } from "~/lib/db.server";

interface KnowledgeCardProps {
  topic: LearningTopic & {
    knowledgePointsCount: number;
    aiOverview?: any;
  };
  onRegenerateOverview?: (topicId: string) => void;
  isLoadingOverview?: boolean;
  isRecentlyUpdated?: boolean;
}

export function KnowledgeCard({
  topic,
  onRegenerateOverview,
  isLoadingOverview = false,
  isRecentlyUpdated = false,
}: KnowledgeCardProps) {
  // 格式化学习时长显示
  const formatLearningTime = (minutes?: number) => {
    if (!minutes || minutes === 0) return "暂无记录";

    if (minutes < 60) {
      return `${minutes}分钟`;
    } else if (minutes < 1440) {
      // 小于24小时
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}小时${remainingMinutes}分钟`
        : `${hours}小时`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0
        ? `${days}天${remainingHours}小时`
        : `${days}天`;
    }
  };

  // 格式化日期范围
  const formatDateRange = () => {
    if (!topic.first_study_at) return null;

    const firstDate = new Date(topic.first_study_at);
    const lastDate = topic.last_study_at
      ? new Date(topic.last_study_at)
      : firstDate;

    const firstStr = firstDate.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });

    const lastStr = lastDate.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      year:
        lastDate.getFullYear() !== firstDate.getFullYear()
          ? "numeric"
          : undefined,
    });

    return firstStr === lastStr ? firstStr : `${firstStr} - ${lastStr}`;
  };

  return (
    <Container
      variant="card"
      className="group hover:shadow-xl transition-all duration-300"
      size="full"
      padding="none"
    >
      {/* 卡片头部 - 主题信息和学习时长 */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  📖
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <Text
                  size="lg"
                  weight="semibold"
                  color="primary"
                  className="truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                >
                  {topic.name}
                </Text>
                {topic.description && (
                  <Text
                    size="sm"
                    color="secondary"
                    className="mt-1 line-clamp-2"
                  >
                    {topic.description}
                  </Text>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-4">
            {isLoadingOverview && (
              <div className="flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full whitespace-nowrap">
                <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                AI分析中
              </div>
            )}
            {isRecentlyUpdated && (
              <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full whitespace-nowrap">
                <span className="mr-1">✨</span>
                已更新
              </div>
            )}
          </div>
        </div>

        {/* 学习统计信息 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 学习时长 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <Text
                  size="xs"
                  color="secondary"
                  className="uppercase tracking-wide mb-1"
                >
                  学习时长
                </Text>
                <Text
                  size="lg"
                  weight="bold"
                  color="primary"
                  className="text-blue-700 dark:text-blue-300"
                >
                  {formatLearningTime(topic.total_learning_minutes)}
                </Text>
                {formatDateRange() && (
                  <Text size="xs" color="secondary" className="mt-1">
                    {formatDateRange()}
                  </Text>
                )}
              </div>
              <div className="text-2xl opacity-20">⏱️</div>
            </div>
          </div>

          {/* 知识点数量 */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <Text
                  size="xs"
                  color="secondary"
                  className="uppercase tracking-wide mb-1"
                >
                  知识点
                </Text>
                <Text
                  size="lg"
                  weight="bold"
                  color="primary"
                  className="text-purple-700 dark:text-purple-300"
                >
                  {topic.knowledgePointsCount}
                </Text>
                <Text size="xs" color="secondary" className="mt-1">
                  个笔记
                </Text>
              </div>
              <div className="text-2xl opacity-20">📝</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI 概览摘要 */}
      {topic.aiOverview && topic.aiOverview.summary && (
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-100 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-amber-600 dark:text-amber-400 text-lg">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <Text
                size="sm"
                weight="medium"
                color="primary"
                className="mb-2 text-amber-800 dark:text-amber-200"
              >
                AI 学习概览
              </Text>
              <Text
                size="sm"
                color="secondary"
                className="line-clamp-3 text-amber-700 dark:text-amber-300"
              >
                {topic.aiOverview.summary}
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* 卡片底部 - 操作按钮 */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="flex items-center gap-3">
            {onRegenerateOverview && topic.id && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRegenerateOverview(topic.id!)}
                disabled={isLoadingOverview}
                loading={isLoadingOverview}
              >
                🔄 重新分析
              </Button>
            )}

            <Link to={`/knowledge/topic/${topic.id}`}>
              <Button variant="primary" size="sm">
                查看详情 →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
