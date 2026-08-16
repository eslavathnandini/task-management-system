export enum NotificationEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED'
}

export interface Notification {
  id: string;
  recipientUserId: string;
  senderUserId: string;
  taskId: string;
  taskTitle: string;
  eventType: NotificationEventType;
  message: string;
  isRead: boolean;
  timestamp: string;
}
