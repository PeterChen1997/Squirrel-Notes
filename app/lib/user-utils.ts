// 用户状态判断工具函数

export interface UserState {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
  anonymousId?: string;
  isDemo: boolean;
}

export interface ContentState {
  topics: any[];
  knowledgePoints: any[];
  tags: any[];
}

/**
 * 判断是否为匿名用户且没有任何内容
 */
export function isNoContentAnonymousUser(
  userState: UserState,
  contentState: ContentState
): boolean {
  return (
    userState.isDemo &&
    contentState.topics.length === 0 &&
    contentState.knowledgePoints.length === 0
  );
}

/**
 * 判断是否为匿名用户且正在查看mock数据
 */
export function isViewingMockData(
  userState: UserState,
  itemId?: string
): boolean {
  return userState.isDemo && itemId?.startsWith("mock-") === true;
}

/**
 * 判断是否为匿名用户且正在查看mock主题
 */
export function isViewingMockTopic(
  userState: UserState,
  topicId?: string
): boolean {
  return isViewingMockData(userState, topicId);
}

/**
 * 判断是否为匿名用户且正在查看mock知识点
 */
export function isViewingMockKnowledgePoint(
  userState: UserState,
  pointId?: string
): boolean {
  return isViewingMockData(userState, pointId);
}

/**
 * 判断是否应该显示演示模式提示
 */
export function shouldShowDemoNotice(
  userState: UserState,
  contentState?: ContentState,
  itemId?: string
): boolean {
  if (!userState.isDemo) return false;

  // 如果提供了内容状态，检查是否没有内容
  if (contentState) {
    return isNoContentAnonymousUser(userState, contentState);
  }

  // 如果提供了项目ID，检查是否为mock数据
  if (itemId) {
    return isViewingMockData(userState, itemId);
  }

  return false;
}

/**
 * 判断是否应该禁用编辑功能
 */
export function shouldDisableEditing(
  userState: UserState,
  itemId?: string
): boolean {
  return isViewingMockData(userState, itemId);
}

/**
 * 获取用户显示名称
 */
export function getUserDisplayName(userState: UserState): string {
  if (userState.user?.name) {
    return userState.user.name;
  }
  if (userState.user?.email) {
    return userState.user.email.split("@")[0];
  }
  return "匿名用户";
}

/**
 * 判断是否为已登录用户
 */
export function isAuthenticatedUser(userState: UserState): boolean {
  return !userState.isDemo && !!userState.user?.id;
}

/**
 * 判断是否为匿名用户
 */
export function isAnonymousUser(userState: UserState): boolean {
  return userState.isDemo;
}
