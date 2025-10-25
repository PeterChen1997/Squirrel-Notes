# UI 组件使用指南

## 概述

为了解决暗黑模式样式遗漏问题，我们创建了一套统一的 UI 组件体系。这些组件内置了完整的暗黑模式支持，避免了手动添加暗黑模式类名时可能出现的遗漏。

## 组件列表

### 1. Container 容器组件

用于创建带有统一样式的容器。

```typescript
import { Container } from "~/components/ui";

<Container
  size="md"
  variant="default"
  padding="md"
  className="custom-class"
>
  内容
</Container>
```

**Props**:
- `size`: `"sm" | "md" | "lg" | "xl" | "full"` - 容器最大宽度
- `variant`: `"default" | "card" | "glass" | "gradient"` - 视觉样式
- `padding`: `"none" | "sm" | "md" | "lg"` - 内边距
- `className`: 自定义类名

**变体样式**:
- `default`: 白色背景，灰色边框，圆角阴影
- `card`: 更大的圆角，更轻的边框
- `glass`: 半透明背景，毛玻璃效果
- `gradient`: 渐变背景（琥珀色系）

### 2. Text 文本组件

用于显示各种样式的文本。

```typescript
import { Text } from "~/components/ui";

<Text
  size="md"
  weight="normal"
  color="primary"
  as="p"
  className="custom-class"
>
  文本内容
</Text>
```

**Props**:
- `size`: `"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"` - 文字大小
- `weight`: `"normal" | "medium" | "semibold" | "bold"` - 字体粗细
- `color`: `"primary" | "secondary" | "muted" | "success" | "warning" | "error" | "inherit"` - 文字颜色
- `as`: 渲染的 HTML 标签
- `className`: 自定义类名

**颜色系统**:
- `primary`: 主要文本（深色模式：浅色）
- `secondary`: 次要文本（深色模式：中性灰）
- `muted`: 弱化文本（深色模式：深灰）
- `success/warning/error`: 状态色彩

### 3. Panel 面板组件

用于创建带有标题和主题色彩的内容面板。

```typescript
import { Panel } from "~/components/ui";

<Panel
  title="面板标题"
  icon="🎯"
  theme="blue"
  size="md"
  padding="md"
  className="custom-class"
>
  面板内容
</Panel>
```

**Props**:
- `title`: 面板标题
- `icon`: 标题前的图标
- `theme`: `"default" | "blue" | "green" | "amber" | "purple" | "red"` - 主题色彩
- `size`: `"sm" | "md" | "lg"` - 内边距大小
- `padding`: `"sm" | "md" | "lg"` - 内边距
- `className`: 自定义类名

**主题色彩**:
- 每个主题都包含完整的渐变背景、边框、标题颜色和文本颜色
- 自动适配暗黑模式

### 4. Button 按钮组件

用于创建统一样式的按钮。

```typescript
import { Button } from "~/components/ui";

<Button
  variant="primary"
  size="md"
  disabled={false}
  loading={false}
  type="button"
  onClick={handleClick}
  className="custom-class"
>
  按钮文本
</Button>
```

**Props**:
- `variant`: `"primary" | "secondary" | "outline" | "ghost" | "success" | "warning" | "error"`
- `size`: `"sm" | "md" | "lg"` - 按钮大小
- `disabled`: 是否禁用
- `loading`: 是否显示加载状态
- `type`: 按钮类型
- `onClick`: 点击事件
- `className`: 自定义类名

### 5. Badge 标签组件

用于创建小标签或徽章。

```typescript
import { Badge } from "~/components/ui";

<Badge
  variant="default"
  size="md"
  icon="🏷️"
  className="custom-class"
>
  标签文本
</Badge>
```

**Props**:
- `variant`: `"default" | "blue" | "green" | "amber" | "purple" | "red" | "outline"`
- `size`: `"sm" | "md" | "lg"` - 标签大小
- `icon`: 标签前的图标
- `className`: 自定义类名

## 使用示例

### 分析页面中的使用

```typescript
// AI 摘要面板
<Panel title="AI 智能摘要" icon="🤖" theme="blue" size="sm">
  <Text size="sm" className="leading-relaxed">
    {analysis.summary}
  </Text>
</Panel>

// 原始内容容器
<Container variant="default" padding="sm">
  <Text className="leading-relaxed whitespace-pre-wrap">
    {knowledgePoint.content}
  </Text>
</Container>

// 选择学习主题面板
<Panel
  title={
    <div className="flex items-center">
      <span className="mr-2">🎯</span>
      选择学习主题
      <Badge variant="blue" size="sm" className="ml-2">
        AI 推荐: {analysis.recommended_topic.name}
      </Badge>
    </div>
  }
  theme="blue"
  size="sm"
>
  {/* 表单内容 */}
</Panel>
```

## 暗黑模式支持

所有组件都内置了完整的暗黑模式支持：

### 自动适配的颜色系统
- **背景色**: 白色 → 深灰色
- **文本色**: 深色 → 浅色
- **边框色**: 浅灰 → 深灰
- **主题色**: 自动调整为暗黑模式友好的色调

### 渐变背景适配
```css
/* 浅色模式 */
bg-gradient-to-r from-blue-50 to-indigo-50

/* 暗黑模式 */
dark:from-blue-900/20 dark:to-indigo-900/20
```

## 最佳实践

### 1. 组件选择指南

- **容器布局**: 使用 `Container` 组件
- **文本显示**: 使用 `Text` 组件而不是原生 `<p>` `<span>`
- **内容区块**: 使用 `Panel` 组件创建有主题色彩的区域
- **交互元素**: 使用 `Button` 组件
- **小标签**: 使用 `Badge` 组件

### 2. 避免的模式

❌ **错误示例**:
```typescript
// 手动添加暗黑模式类名，容易遗漏
<div className="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900 dark:border-blue-800 dark:text-blue-200">
  内容
</div>
```

✅ **正确示例**:
```typescript
// 使用组件，自动包含暗黑模式
<Panel theme="blue" size="sm">
  内容
</Panel>
```

### 3. 自定义扩展

如需添加自定义样式，通过 `className` prop：

```typescript
<Panel theme="blue" className="custom-shadow">
  内容
</Panel>
```

### 4. 响应式设计

组件支持响应式，可在不同屏幕尺寸下正常显示：

```typescript
<Container size="lg" className="w-full sm:w-auto">
  响应式内容
</Container>
```

## 迁移指南

### 从传统样式迁移

**之前**:
```typescript
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
    标题
  </h3>
  <p className="text-gray-700 dark:text-gray-300">
    内容
  </p>
</div>
```

**之后**:
```typescript
<Panel title="标题" theme="default">
  <Text>内容</Text>
</Panel>
```

### 优势对比

| 方面 | 传统方式 | 组件方式 |
|------|----------|----------|
| 暗黑模式 | 手动添加，容易遗漏 | 自动支持，完整覆盖 |
| 代码复用 | 重复的类名 | 统一的组件接口 |
| 维护性 | 分散的样式 | 集中的样式管理 |
| 一致性 | 容易出现不一致 | 保证设计一致性 |

## 总结

通过使用这套统一的组件体系：

1. **避免暗黑模式遗漏**: 所有组件内置完整的暗黑模式支持
2. **提高开发效率**: 减少重复的样式代码
3. **保证设计一致性**: 统一的视觉语言
4. **简化维护工作**: 集中的样式管理
5. **响应式友好**: 内置响应式支持

建议在所有新开发中使用这些组件，逐步迁移现有代码，确保整个应用的暗黑模式体验一致性。

---

*创建时间：2025年1月*