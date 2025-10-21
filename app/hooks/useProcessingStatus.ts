import { useState, useCallback } from "react";
import toast from "react-hot-toast";

interface ProcessingItem {
  knowledgeId: string;
  content: string;
  status: "processing" | "completed" | "failed";
  startTime: number;
}

export function useProcessingStatus() {
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);

  const addProcessingItem = useCallback((knowledgeId: string, content: string) => {
    const newItem: ProcessingItem = {
      knowledgeId,
      content,
      status: "processing",
      startTime: Date.now(),
    };

    setProcessingItems((prev) => [...prev, newItem]);

    // Set up status polling
    const pollInterval = setInterval(async () => {
      try {
        // Check processing status (simplified version)
        const elapsed = Date.now() - newItem.startTime;

        // Simulate processing completion after 5 seconds
        if (elapsed >= 5000) {
          clearInterval(pollInterval);

          setProcessingItems((prev) =>
            prev.map((item) =>
              item.knowledgeId === knowledgeId
                ? { ...item, status: "completed" }
                : item
            )
          );

          // Show success notification
          toast.success("🎉 知识点分析完成！", {
            id: `processing-${knowledgeId}`,
          });

          // Remove from processing list after showing completion
          setTimeout(() => {
            setProcessingItems((prev) =>
              prev.filter((item) => item.knowledgeId !== knowledgeId)
            );
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking processing status:", error);
        clearInterval(pollInterval);

        setProcessingItems((prev) =>
          prev.map((item) =>
            item.knowledgeId === knowledgeId
              ? { ...item, status: "failed" }
              : item
          )
        );

        toast.error("❌ 分析失败，请重试", {
          id: `processing-${knowledgeId}`,
        });
      }
    }, 1000);

    // Cleanup function
    return () => clearInterval(pollInterval);
  }, []);

  const removeProcessingItem = useCallback((knowledgeId: string) => {
    setProcessingItems((prev) =>
      prev.filter((item) => item.knowledgeId !== knowledgeId)
    );
    toast.dismiss(`processing-${knowledgeId}`);
  }, []);

  const getProcessingItem = useCallback((knowledgeId: string) => {
    return processingItems.find((item) => item.knowledgeId === knowledgeId);
  }, [processingItems]);

  return {
    processingItems,
    addProcessingItem,
    removeProcessingItem,
    getProcessingItem,
  };
}