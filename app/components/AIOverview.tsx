import React from "react";

interface AIOverviewData {
  confidence: number;
  summary: string;
  key_insights?: string[];
  practical_points?: string[];
  experience_summary?: string[];
  next_steps?: string[];
  learning_progress?: string;
}

interface AIOverviewProps {
  aiOverview: AIOverviewData | null;
  topicId?: string;
  knowledgePointsCount?: number;
  onRegenerateOverview?: (topicId: string) => void;
  loadingOverviews?: Set<string>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showRegenerateButton?: boolean;
  variant?: "card" | "collapsible";
}

export default function AIOverview({
  aiOverview,
  topicId,
  knowledgePointsCount = 0,
  onRegenerateOverview,
  loadingOverviews = new Set(),
  isExpanded = true,
  onToggleExpand,
  showRegenerateButton = true,
  variant = "card",
}: AIOverviewProps) {
  if (!aiOverview) {
    if (knowledgePointsCount > 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center">
            <span className="mr-2">⏳</span>
            <span className="text-yellow-800 text-xs sm:text-sm dark:text-gray-100">
              AI 正在生成学习概览...
            </span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center">
            <span className="mr-2">📝</span>
            <span className="text-gray-600 text-xs sm:text-sm leading-tight dark:text-gray-100">
              还没有学习笔记，添加第一条笔记后 AI 将自动生成概览
            </span>
          </div>
        </div>
      );
    }
  }

  const content = (
    <div className="space-y-3">
      {/* 主题摘要 */}
      <div className="mb-3 sm:mb-4">
        <p className="text-blue-800 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3 dark:text-gray-100">
          {aiOverview.summary}
        </p>
      </div>

      {/* 核心洞察 */}
      {aiOverview.key_insights && aiOverview.key_insights.length > 0 && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2 dark:text-gray-100">
            <span className="">💡 核心知识点</span>
          </h5>
          <ul className="space-y-1">
            {aiOverview.key_insights
              .slice(0, 4)
              .map((insight: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1 text-blue-600 text-xs shrink-0 dark:text-gray-100">
                    •
                  </span>
                  <span className="text-blue-800 text-xs leading-tight dark:text-gray-100">
                    {insight}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 实用要点 */}
      {aiOverview.practical_points &&
        aiOverview.practical_points.length > 0 && (
          <div>
            <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2 dark:text-blue-100">
              <span className="">⚡ 实用技巧</span>
            </h5>
            <ul className="space-y-1">
              {aiOverview.practical_points
                .slice(0, 3)
                .map((point: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1 text-green-600 text-xs shrink-0">
                      ▸
                    </span>
                    <span className="text-green-800 text-xs leading-tight dark:text-green-100">
                      {point}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

      {/* 经验总结 */}
      {aiOverview.experience_summary &&
        aiOverview.experience_summary.length > 0 && (
          <div>
            <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">
              <span className="">💭 经验总结</span>
            </h5>
            <ul className="space-y-1">
              {aiOverview.experience_summary
                .slice(0, 2)
                .map((summary: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1 text-purple-600 text-xs shrink-0 dark:text-purple-100">
                      ◈
                    </span>
                    <span className="text-purple-800 text-xs leading-tight dark:text-purple-100">
                      {summary}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

      {/* 下一步建议 */}
      {aiOverview.next_steps && aiOverview.next_steps.length > 0 && (
        <div>
          <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2 dark:text-blue-100">
            <span className="">🎯 进阶方向</span>
          </h5>
          <ul className="space-y-1">
            {aiOverview.next_steps
              .slice(0, 3)
              .map((step: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1 text-orange-600 text-xs shrink-0">
                    →
                  </span>
                  <span className="text-orange-800 text-xs leading-tight dark:text-orange-100">
                    {step}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* 学习进度 */}
      {aiOverview.learning_progress && (
        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-100 rounded-lg dark:bg-gray-800">
          <span className="text-blue-800 text-xs leading-tight dark:text-gray-100">
            <span className="">📊 {aiOverview.learning_progress}</span>
            <span className="sm:hidden">{aiOverview.learning_progress}</span>
          </span>
        </div>
      )}
    </div>
  );

  if (variant === "collapsible") {
    return (
      <div className="bg-gradient-to-r rounded-xl border border-blue-200 mb-6 overflow-hidden">
        {/* 可点击的标题栏 */}
        <button
          onClick={onToggleExpand}
          className="w-full p-4 text-left hover:bg-blue-100/50 transition-colors dark:hover:bg-blue-900/50"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center dark:text-blue-100">
              <span className="mr-2">🤖</span>
              AI 学习概览
            </h3>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full dark:bg-blue-900 dark:text-blue-100">
                置信度 {Math.round(aiOverview.confidence * 100)}%
              </span>
              <svg
                className={`w-5 h-5 text-blue-600 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </button>

        {/* 展开的内容 */}
        {isExpanded && <div className="px-4 pb-4">{content}</div>}
      </div>
    );
  }

  // 默认卡片样式
  return (
    <div className="bg-gradient-to-r rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200 dark:bg-gray-800 dark:border-gray-700">
      <h4 className="text-sm sm:text-md font-semibold text-blue-900 mb-2 sm:mb-3 flex items-center flex-wrap gap-2 dark:text-gray-100">
        <span className="mr-1 sm:mr-2">🤖</span>
        <span className="flex-1">
          <span className="sm:hidden">AI概览</span>
          <span className="hidden sm:inline">AI 学习概览</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
            <span className="sm:hidden">
              {Math.round(aiOverview.confidence * 100)}%
            </span>
            <span className="hidden sm:inline">
              置信度 {Math.round(aiOverview.confidence * 100)}%
            </span>
          </span>
          {showRegenerateButton && topicId && onRegenerateOverview && (
            <button
              onClick={() => onRegenerateOverview(topicId)}
              disabled={loadingOverviews.has(topicId)}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
              title="重新生成AI概览"
            >
              {loadingOverviews.has(topicId) ? (
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="sm:hidden">🔄</span>
              )}
              <span className="hidden sm:inline">重新生成</span>
            </button>
          )}
        </div>
      </h4>

      {content}
    </div>
  );
}
