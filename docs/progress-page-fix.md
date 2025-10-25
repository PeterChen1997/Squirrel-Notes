# Progress 页面自动跳转修复

## 问题描述

用户反馈 `/progress` 页面中处理完成后没有自动跳转到 `/analyze` 页面。

## 问题原因

当通过 `knowledgeId` 访问 `/progress` 页面时：
1. 后端返回 `analysis: null`（因为AI分析还没有完成）
2. 前端的自动跳转逻辑依赖于 `analysis` 数据存在
3. 缺少状态轮询机制来检查知识点处理状态

## 修复方案

### 1. 添加状态轮询机制

```typescript
// 检查知识点状态（当通过 knowledgeId 访问时）
useEffect(() => {
  if (isProcessing && knowledgeId) {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/knowledge/${knowledgeId}/status`);
        if (response.ok) {
          const data = await response.json();
          console.log("Knowledge status in progress page:", data);

          if (data.status === "completed") {
            setKnowledgeStatus("completed");
            setProgress(100);
            setStatus("completed");
            // 直接跳转到分析页面
            setTimeout(() => {
              window.location.href = `/analyze?id=${knowledgeId}`;
            }, 1000);
          } else if (data.status === "failed") {
            setKnowledgeStatus("failed");
            setStatus("failed");
          }
        }
      } catch (error) {
        console.error("Error checking knowledge status in progress page:", error);
      }
    };

    // 立即检查一次
    checkStatus();

    // 每2秒检查一次状态
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }
}, [isProcessing, knowledgeId]);
```

### 2. 改进状态管理

添加了新的状态变量：
```typescript
const [knowledgeStatus, setKnowledgeStatus] = useState<"processing" | "completed" | "failed">(isProcessing ? "processing" : "processing");
```

### 3. 优化UI显示

完成状态显示：
```typescript
{(progress >= 100 || knowledgeStatus === "completed") && (
  <div className="text-green-600 text-base font-medium animate-pulse">
    🎉 分析完成！正在跳转到整理页面...
  </div>
)}
```

失败状态显示：
```typescript
{knowledgeStatus === "failed" && (
  <div className="text-red-600 text-base font-medium">
    ❌ 分析失败！
    <div className="mt-2">
      <BackLink to="/" text="返回首页重试" />
    </div>
  </div>
)}
```

## 工作流程

### 访问方式 1：通过 Toast 点击（knowledgeId）
1. 用户点击 Toast 中的"处理中"状态
2. 跳转到 `/progress?knowledgeId=xxx&content=xxx`
3. 页面检测到 `isProcessing=true`
4. 开始轮询检查知识点状态
5. 当状态变为"completed"时，自动跳转到 `/analyze?id=xxx`
6. 当状态变为"failed"时，显示错误信息和重试链接

### 访问方式 2：直接提交内容（原始流程）
1. 用户在首页提交内容
2. 跳转到 `/progress?content=xxx`
3. 后端立即进行AI分析并返回 `analysis` 数据
4. 前端显示进度动画，3秒后自动提交表单跳转到 `/analyze`

## 技术细节

### API 调用
- 使用 `/api/knowledge/:id/status` 检查知识点状态
- 每2秒轮询一次，避免过度请求
- 添加了错误处理和日志记录

### 跳转机制
- 完成时使用 `window.location.href` 直接跳转
- 失败时提供返回首页的链接
- 保持了原有的表单提交机制作为备用

### 用户体验
- 清晰的状态提示
- 失败时提供重试选项
- 平滑的动画过渡

## 测试建议

1. **正常流程测试**：
   - 在首页输入内容并提交
   - 点击 Toast 跳转到 progress 页面
   - 等待处理完成，验证自动跳转

2. **异常情况测试**：
   - 模拟分析失败的情况
   - 验证错误状态显示
   - 测试重试功能

3. **性能测试**：
   - 验证轮询频率合理
   - 检查内存泄漏情况
   - 测试并发访问

---

*修复完成时间：2025年1月*