import { InMemoryRepository } from '../repository/InMemoryRepository';
import { Notification, NotificationEventType } from '../models/Notification';
import { ITaskObserver, TaskEventPayload, NotificationPublisher } from '../patterns/observer/NotificationPublisher';

export class NotificationService implements ITaskObserver {
  private notificationRepo: InMemoryRepository<Notification>;

  constructor(notificationRepo?: InMemoryRepository<Notification>) {
    this.notificationRepo =
      notificationRepo || new InMemoryRepository<Notification>('notifications.json');
    // Register self with the singleton publisher
    NotificationPublisher.getInstance().subscribe(this);
  }

  public onTaskEvent(payload: TaskEventPayload): void {
    const { eventType, task, actorUserId, recipientUserId, message, timestamp } = payload;

    // Target recipient: either explicit recipient, or assignee, or reporter
    const targetUserId = recipientUserId || task.assigneeId || task.reporterId;

    // Don't notify actor if they performed action on their own task
    if (targetUserId && targetUserId !== actorUserId) {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientUserId: targetUserId,
        senderUserId: actorUserId,
        taskId: task.id,
        taskTitle: task.title,
        eventType,
        message,
        isRead: false,
        timestamp
      };

      this.notificationRepo.save(notification);
    }
  }

  public getUserNotifications(userId: string): Notification[] {
    return this.notificationRepo
      .query((n) => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public markAsRead(notificationId: string): Notification {
    return this.notificationRepo.update(notificationId, { isRead: true });
  }

  public getAllNotifications(): Notification[] {
    return this.notificationRepo.findAll();
  }
}
