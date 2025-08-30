import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import {
  initDatabase,
  createLearningTopic,
  createKnowledgePoint,
} from "~/lib/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  await initDatabase();

  // 创建一些示例学习主题
  const tennisTopic = await createLearningTopic({
    name: "网球",
    description: "网球技术学习和训练记录",
    categories: ["技术动作", "战术", "体能训练", "比赛经验", "装备使用"],
  });

  const programmingTopic = await createLearningTopic({
    name: "编程",
    description: "编程技术学习和项目经验",
    categories: ["语法基础", "框架使用", "算法", "项目实践", "工具使用"],
  });

  const englishTopic = await createLearningTopic({
    name: "英语学习",
    description: "英语语言学习记录",
    categories: ["语法", "词汇", "听力", "口语", "阅读"],
  });

  // 创建一些示例知识点
  await createKnowledgePoint({
    title: "正手击球技术要点",
    content: `今天练习了正手击球，教练强调了几个重要要点：
1. 击球点要在身体前方，不能等球来到身体侧面
2. 挥拍时要转动腰部，用整个身体的力量
3. 击球后要有完整的随挥动作
4. 脚步要跟上，保持身体平衡
需要多练习，目前稳定性还不够好。`,
    category: "技术动作",
    tags: ["正手", "击球", "基础技术"],
    keywords: ["击球点", "转腰", "随挥", "脚步"],

    confidence: 0.9,
    learning_topic_id: tennisTopic.id,
    related_ids: [],
    attachments: [],
    processing_status: "completed",
  });

  await createKnowledgePoint({
    title: "React Hooks 使用心得",
    content: `学习了 React Hooks，主要掌握了以下几点：
1. useState 用于管理组件状态
2. useEffect 用于处理副作用，依赖数组控制执行时机
3. useCallback 和 useMemo 用于性能优化
4. 自定义 Hook 可以复用逻辑

注意事项：
- Hook 只能在函数组件顶层调用
- 依赖数组要包含所有使用的变量
- 避免在 useEffect 中直接修改状态`,
    category: "框架使用",
    tags: ["React", "Hooks", "前端"],
    keywords: ["useState", "useEffect", "性能优化"],

    confidence: 0.95,
    learning_topic_id: programmingTopic.id,
    related_ids: [],
    attachments: [],
    processing_status: "completed",
  });

  await createKnowledgePoint({
    title: "英语发音练习记录",
    content: `今天练习了几个容易搞错的发音：
1. "th" 音 - think, thank, three
   舌尖要轻触上牙，气流从舌头两侧流出
2. "r" 音 - red, right, really  
   舌尖要卷起但不能碰到上颚
3. 重音位置 - today, tomorrow, understand
   重音在第二个音节

需要每天练习15分钟，录音对比标准发音。`,
    category: "口语",
    tags: ["发音", "练习", "音标"],
    keywords: ["th音", "r音", "重音"],

    confidence: 0.8,
    learning_topic_id: englishTopic.id,
    related_ids: [],
    attachments: [],
    processing_status: "completed",
  });

  return redirect("/knowledge");
};

export default function InitDataPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">初始化演示数据</h1>
        <p className="text-gray-600 mb-6">
          点击下面的按钮来创建一些示例学习主题和知识点，方便体验应用功能。
        </p>
        <Form method="post">
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all"
          >
            创建演示数据
          </button>
        </Form>
      </div>
    </div>
  );
}
