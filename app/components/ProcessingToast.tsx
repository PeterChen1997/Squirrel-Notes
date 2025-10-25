import { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";

interface ProcessingToastProps {
  knowledgeId: string;
  content: string;
  t: {
    (message: string | JSX.Element, options?: { id?: string; duration?: number }): string | void;
    success: (message: string, options?: { id?: string; duration?: number }) => string | void;
    error: (message: string, options?: { id?: string; duration?: number }) => string | void;
    dismiss: (id?: string) => void;
  };
}

export function ProcessingToast({ knowledgeId, content, t }: ProcessingToastProps) {
  const [countdown, setCountdown] = useState(5);
  const [status, setStatus] = useState<"processing" | "completed" | "failed">("processing");
  const [progress, setProgress] = useState(0);
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
        console.log("Checking knowledge status for:", knowledgeId);
        const response = await fetch(`/api/knowledge/${knowledgeId}/status`);
        console.log("API response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("Knowledge status data:", data);

          if (data.status === "completed") {
            setStatus("completed");
            setProgress(100);
          } else if (data.status === "failed") {
            setStatus("failed");
          }
          // 如果还在处理中，继续当前状态
        } else {
          console.warn("API call failed with status:", response.status);
          // 如果API调用失败，暂时不改变状态，继续检查
        }
      } catch (error) {
        console.error("Error checking knowledge status:", error);
        // 出错时暂时不改变状态，继续检查
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
      }, 500); // 减少延迟从1秒到0.5秒
      return () => clearTimeout(dismissTimer);
    } else if (status === "failed") {
      const dismissTimer = setTimeout(() => {
        t.error("❌ 分析失败，请重试", {
          id: `processing-${knowledgeId}`,
          duration: 5000,
        });
      }, 500); // 减少延迟从1秒到0.5秒
      return () => clearTimeout(dismissTimer);
    }
  }, [status, knowledgeId, t]);

  const handleClick = () => {
    console.log("Toast clicked, status:", status);
    // 立即关闭当前 toast，避免重复点击
    t.dismiss(`processing-${knowledgeId}`);

    // 使用微任务确保 DOM 更新后再导航
    setTimeout(() => {
      if (status === "processing") {
        // 跳转到分析进度页面，显示AI分析进度
        navigate(`/progress?knowledgeId=${knowledgeId}&content=${encodeURIComponent(content)}`);
      } else if (status === "completed") {
        // 跳转到分析页面
        navigate(`/analyze?id=${knowledgeId}`);
      } else if (status === "failed") {
        // 分析失败，跳转到首页重试
        navigate("/");
      }
    }, 0);
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
        return "分析完成！点击查看详情";
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      className={`flex items-center p-4 border rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-all max-w-sm min-w-[300px] ${getStatusColor()} hover:scale-105 active:scale-95`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
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
          {status === "processing" ? `${countdown}s` : status === "completed" ? "查看详情" : "重新记录"}
        </div>
      </div>
    </div>
  );
}