import { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";

interface ProcessingToastProps {
  knowledgeId: string;
  content: string;
  t: any; // toast function from react-hot-toast
}

export function ProcessingToast({ knowledgeId, content, t }: ProcessingToastProps) {
  const [countdown, setCountdown] = useState(5);
  const [status, setStatus] = useState<"processing" | "completed" | "failed">("processing");
  const [progress, setProgress] = useState(0);
  const [finalTopicId, setFinalTopicId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Countdown timer and progress simulation with status checking
  useEffect(() => {
    const timer = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 当倒计时结束时，检查知识点状态
          checkKnowledgeStatus();
          return 0;
        }
        // Update progress based on countdown
        setProgress(((5 - prev + 1) / 5) * 100);
        return prev - 1;
      });
    }, 1000);

    // 检查知识点状态的函数
    const checkKnowledgeStatus = async () => {
      try {
        // 这里应该调用API来检查知识点状态
        // 由于这是客户端组件，我们需要通过API路由来获取状态
        const response = await fetch(`/api/knowledge/${knowledgeId}/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "completed") {
            setStatus("completed");
            setProgress(100);
            if (data.learning_topic_id) {
              setFinalTopicId(data.learning_topic_id);
            }
          } else if (data.status === "failed") {
            setStatus("failed");
          }
        } else {
          // 如果API调用失败，假设完成但不设置topicID
          setStatus("completed");
          setProgress(100);
        }
      } catch (error) {
        console.error("Error checking knowledge status:", error);
        // 出错时也假设完成但不设置topicID
        setStatus("completed");
        setProgress(100);
      }
    };

    // 立即检查一次状态
    checkKnowledgeStatus();

    return () => clearInterval(timer);
  }, [knowledgeId]);

  // Auto-dismiss when completed or failed
  useEffect(() => {
    if (status === "completed") {
      const dismissTimer = setTimeout(() => {
        t.success("🎉 知识点分析完成！点击查看详情", {
          id: `processing-${knowledgeId}`,
          duration: 3000,
        });
      }, 1000);
      return () => clearTimeout(dismissTimer);
    } else if (status === "failed") {
      const dismissTimer = setTimeout(() => {
        t.error("❌ 分析失败，请重试", {
          id: `processing-${knowledgeId}`,
          duration: 5000,
        });
      }, 1000);
      return () => clearTimeout(dismissTimer);
    }
  }, [status, knowledgeId, t]);

  const handleClick = () => {
    if (status === "processing") {
      // 跳转到分析进度页面，显示AI分析进度
      navigate(`/progress?knowledgeId=${knowledgeId}&content=${encodeURIComponent(content)}`);
    } else if (status === "completed") {
      // 跳转到最终的topic详情页面
      if (finalTopicId) {
        navigate(`/knowledge/topic/${finalTopicId}`);
      } else {
        // 如果没有topicID，跳转到知识库首页
        navigate("/knowledge");
      }
    }
    t.dismiss(`processing-${knowledgeId}`);
  };

  const getStatusEmoji = () => {
    switch (status) {
      case "processing":
        return "🐿️";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "🐿️";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "processing":
        return `小松鼠正在分析... ${countdown}s`;
      case "completed":
        return "分析完成！点击查看";
      case "failed":
        return "分析失败！点击重试";
      default:
        return "处理中...";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "processing":
        return "border-amber-200 bg-amber-50";
      case "completed":
        return "border-green-200 bg-green-50";
      case "failed":
        return "border-red-200 bg-red-50";
      default:
        return "border-amber-200 bg-amber-50";
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case "processing":
        return "bg-gradient-to-r from-amber-400 to-orange-500";
      case "completed":
        return "bg-gradient-to-r from-green-400 to-green-500";
      case "failed":
        return "bg-gradient-to-r from-red-400 to-red-500";
      default:
        return "bg-gradient-to-r from-amber-400 to-orange-500";
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center p-4 border rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-all max-w-sm min-w-[300px] ${getStatusColor()}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      aria-label={`${getStatusText()} - ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`}
    >
      <div className="flex-shrink-0 mr-3">
        <div className={`text-2xl ${status === "processing" ? "animate-pulse" : ""}`}>
          {getStatusEmoji()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 mb-1">
          {getStatusText()}
        </div>
        <div className="text-xs text-gray-600 truncate mb-2">
          {content.substring(0, 50)}{content.length > 50 ? "..." : ""}
        </div>

        {status === "processing" && (
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 ml-3">
        <div className="text-xs text-gray-500 font-medium">
          {status === "processing" ? `${countdown}s` : status === "completed" ? "查看" : "重试"}
        </div>
      </div>
    </div>
  );
}