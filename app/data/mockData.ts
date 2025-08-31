// Mock数据 - 匿名用户演示用
export const mockTopics = [
  {
    id: "mock-topic-1",
    name: "网球技能",
    description: "网球技能学习记录，包含发球、击球、战术等技巧",
    created_at: new Date("2024-01-15").toISOString(),
    updated_at: new Date("2024-01-20").toISOString(),
    ai_summary: JSON.stringify({
      confidence: 0.85,
      learning_progress: "基础阶段",
      key_concepts: ["正手击球", "发球技巧", "站位要领"],
      difficulty_level: "初级到中级",
      estimated_hours: 20,
      summary:
        "网球技能学习涵盖了基础击球技术、发球要领和战术运用。通过系统练习，可以逐步掌握网球的核心技能。",
      key_insights: [
        "正手击球是网球的基础技术，需要掌握正确的站位和握拍",
        "发球技术直接影响比赛节奏，抛球稳定性是关键",
        "身体协调性和腰部转动是发力的重要因素",
      ],
      practical_points: [
        "练习时注意保持身体平衡，避免过度用力",
        "发球时抛球要稳定，击球时机要准确",
        "多进行实战练习，提高比赛应变能力",
      ],
      learning_steps: [
        "第一步：掌握基本站位和握拍方法",
        "第二步：练习正手击球的基本动作",
        "第三步：学习发球技术和战术运用",
      ],
    }),
    knowledgePointsCount: 2,
  },
  {
    id: "mock-topic-2",
    name: "编程学习",
    description: "编程技能提升笔记，涵盖前端、后端、算法等知识",
    created_at: new Date("2024-01-10").toISOString(),
    updated_at: new Date("2024-01-18").toISOString(),
    ai_summary: JSON.stringify({
      confidence: 0.88,
      learning_progress: "进阶阶段",
      key_concepts: ["React Hooks", "异步编程", "状态管理"],
      difficulty_level: "中级",
      estimated_hours: 40,
      summary:
        "现代前端开发需要掌握React Hooks、异步编程和状态管理等核心技术。这些技能是构建复杂应用的基础。",
      key_insights: [
        "React Hooks改变了组件状态管理的方式，使代码更简洁",
        "异步编程是现代JavaScript开发的核心技能",
        "状态管理是复杂应用架构的重要组成部分",
      ],
      practical_points: [
        "理解Hooks的执行时机和依赖关系很重要",
        "async/await比Promise更易读，是首选方案",
        "合理使用状态管理可以避免props drilling",
      ],
      learning_steps: [
        "第一步：学习React Hooks的基本概念和使用",
        "第二步：掌握JavaScript异步编程的多种方式",
        "第三步：实践状态管理和应用架构设计",
      ],
    }),
    knowledgePointsCount: 2,
  },
];

export const mockKnowledgePoints = [
  {
    id: "mock-kp-1",
    title: "网球正手击球技巧",
    content: `今天网球课学习了正手击球的关键要点：

1. 站位：双脚与肩同宽，侧身对网
2. 握拍：大陆式握拍，拇指和食指形成V字
3. 引拍：拍头指向后场，肘部弯曲
4. 击球点：在身体前方，腰部高度
5. 随挥：击球后拍子继续向前上方挥动

重点是要保持身体平衡，转动腰部带动手臂发力。`,
    summary:
      "正手击球是网球的基础技术，需要掌握正确的站位、握拍和击球动作。关键是要保持身体平衡，通过腰部转动带动手臂发力。",
    tags: [
      { id: "mock-tag-1", name: "正手" },
      { id: "mock-tag-2", name: "击球" },
      { id: "mock-tag-3", name: "技巧" },
    ],
    keywords: ["网球", "正手", "击球", "站位", "握拍"],
    importance: 5,
    confidence: 0.9,
    learning_topic_id: "mock-topic-1",
    created_at: new Date("2024-01-15").toISOString(),
    updated_at: new Date("2024-01-15").toISOString(),
  },
  {
    id: "mock-kp-2",
    title: "网球发球动作要领",
    content: `网球发球是比赛中的关键环节，今天重点练习了：

发球动作分解：
1. 准备姿势：双脚分开，前脚脚尖指向目标
2. 抛球：左手抛球，球要抛到右肩上方
3. 引拍：右手引拍，拍头指向地面
4. 击球：在最高点击球，手腕发力
5. 随挥：击球后拍子继续向前

注意事项：抛球要稳定，击球时机要准确，力量要适中。`,
    summary:
      "发球是网球比赛的重要技术，需要掌握完整的动作流程。关键是抛球要稳定，击球时机要准确。",
    tags: [
      { id: "mock-tag-4", name: "发球" },
      { id: "mock-tag-5", name: "动作" },
      { id: "mock-tag-6", name: "要领" },
    ],
    keywords: ["网球", "发球", "抛球", "击球", "随挥"],
    importance: 4,
    confidence: 0.85,
    learning_topic_id: "mock-topic-1",
    created_at: new Date("2024-01-16").toISOString(),
    updated_at: new Date("2024-01-16").toISOString(),
  },
  {
    id: "mock-kp-3",
    title: "React Hooks 使用技巧",
    content: `今天学习了React Hooks的核心概念和使用技巧：

useState Hook:
- 用于管理组件状态
- 返回当前状态和更新函数
- 每次渲染都会创建新的状态

useEffect Hook:
- 用于处理副作用
- 依赖数组为空时只执行一次
- 可以返回清理函数

useContext Hook:
- 用于跨组件传递数据
- 避免props drilling
- 配合Provider使用

重点是要理解Hooks的执行时机和依赖关系。`,
    summary:
      "React Hooks是现代React开发的核心，包括useState、useEffect、useContext等。理解Hooks的执行时机和依赖关系是关键。",
    tags: [
      { id: "mock-tag-7", name: "React" },
      { id: "mock-tag-8", name: "Hooks" },
      { id: "mock-tag-9", name: "前端" },
    ],
    keywords: ["React", "Hooks", "useState", "useEffect", "useContext"],
    importance: 5,
    confidence: 0.92,
    learning_topic_id: "mock-topic-2",
    created_at: new Date("2024-01-10").toISOString(),
    updated_at: new Date("2024-01-10").toISOString(),
  },
  {
    id: "mock-kp-4",
    title: "JavaScript 异步编程",
    content: `深入学习了JavaScript异步编程的几种方式：

1. Promise:
- 解决回调地狱问题
- 支持链式调用
- 有then、catch、finally方法

2. async/await:
- 基于Promise的语法糖
- 代码更易读
- 错误处理用try-catch

3. Generator函数:
- 可以暂停和恢复执行
- 配合yield使用
- 适合处理复杂异步流程

实际项目中async/await最常用，代码简洁易懂。`,
    summary:
      "JavaScript异步编程有多种方式，包括Promise、async/await、Generator等。实际项目中async/await最常用，代码简洁易懂。",
    tags: [
      { id: "mock-tag-10", name: "JavaScript" },
      { id: "mock-tag-11", name: "异步" },
      { id: "mock-tag-12", name: "编程" },
    ],
    keywords: ["JavaScript", "Promise", "async", "await", "Generator"],
    importance: 4,
    confidence: 0.88,
    learning_topic_id: "mock-topic-2",
    created_at: new Date("2024-01-12").toISOString(),
    updated_at: new Date("2024-01-12").toISOString(),
  },
];

export const mockTags = [
  { id: "mock-tag-1", name: "正手", color: "#3B82F6", usage_count: 1 },
  { id: "mock-tag-2", name: "击球", color: "#10B981", usage_count: 1 },
  { id: "mock-tag-3", name: "技巧", color: "#F59E0B", usage_count: 1 },
  { id: "mock-tag-4", name: "发球", color: "#EF4444", usage_count: 1 },
  { id: "mock-tag-5", name: "动作", color: "#8B5CF6", usage_count: 1 },
  { id: "mock-tag-6", name: "要领", color: "#06B6D4", usage_count: 1 },
  { id: "mock-tag-7", name: "React", color: "#3B82F6", usage_count: 1 },
  { id: "mock-tag-8", name: "Hooks", color: "#10B981", usage_count: 1 },
  { id: "mock-tag-9", name: "前端", color: "#F59E0B", usage_count: 1 },
  { id: "mock-tag-10", name: "JavaScript", color: "#EF4444", usage_count: 1 },
  { id: "mock-tag-11", name: "异步", color: "#8B5CF6", usage_count: 1 },
  { id: "mock-tag-12", name: "编程", color: "#06B6D4", usage_count: 1 },
];
