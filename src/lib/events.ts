/**
 * 内存事件总线 —— 用于 SSE 推送
 * 当有新出库申请创建时，通知所有订阅了的管理员 SSE 连接
 */

type EventData = {
  type: "new_request";
  requestId: number;
  model: string;
  quantity: number;
  requester: string;
};

type Listener = (data: EventData) => void;

const listeners = new Set<Listener>();

export function subscribeToNewRequests(listener: Listener): void {
  listeners.add(listener);
}

export function unsubscribeListener(listener: Listener): void {
  listeners.delete(listener);
}

/** 触发新申请事件，通知所有 SSE 订阅者 */
export function emitNewRequest(data: EventData): void {
  for (const listener of listeners) {
    try {
      listener(data);
    } catch {
      // 调用失败说明 listener 已失效（连接异常断开），立即清理
      listeners.delete(listener);
    }
  }
}

/** 获取当前活跃监听器数量，用于调试和连接数限制 */
export function getListenerCount(): number {
  return listeners.size;
}
