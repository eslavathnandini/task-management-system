import { Notification, NotificationEventType } from '../../models/Notification';
import { Task } from '../../models/Task';

export interface TaskEventPayload {
  eventType: NotificationEventType;
  task: Task;
  actorUserId: string;
  actorUserName: string;
  recipientUserId?: string;
  fieldChanged?: string;
  oldValue?: string | null;
  newValue?: string | null;
  message: string;
  timestamp: string;
}

export interface ITaskObserver {
  onTaskEvent(payload: TaskEventPayload): void;
}

export class NotificationPublisher {
  private static instance: NotificationPublisher;
  private observers: ITaskObserver[] = [];

  private constructor() {}

  public static getInstance(): NotificationPublisher {
    if (!NotificationPublisher.instance) {
      NotificationPublisher.instance = new NotificationPublisher();
    }
    return NotificationPublisher.instance;
  }

  public subscribe(observer: ITaskObserver): void {
    this.observers.push(observer);
  }

  public unsubscribe(observer: ITaskObserver): void {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  public notify(payload: TaskEventPayload): void {
    for (const observer of this.observers) {
      try {
        observer.onTaskEvent(payload);
      } catch (err) {
        console.error('Error executing task observer notification listener:', err);
      }
    }
  }
}
