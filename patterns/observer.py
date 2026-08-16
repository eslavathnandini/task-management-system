from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
from models import Task, NotificationEventType


@dataclass
class TaskEventPayload:
    event_type: NotificationEventType
    task: Task
    actor_user_id: str
    actor_user_name: str
    recipient_user_id: Optional[str] = None
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    message: str = ""
    timestamp: str = ""


class TaskObserver(ABC):
    @abstractmethod
    def on_task_event(self, payload: TaskEventPayload) -> None:
        pass


class NotificationPublisher:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NotificationPublisher, cls).__new__(cls)
            cls._instance.observers = []
        return cls._instance

    def subscribe(self, observer: TaskObserver) -> None:
        if observer not in self.observers:
            self.observers.append(observer)

    def unsubscribe(self, observer: TaskObserver) -> None:
        if observer in self.observers:
            self.observers.remove(observer)

    def notify(self, payload: TaskEventPayload) -> None:
        for obs in self.observers:
            try:
                obs.on_task_event(payload)
            except Exception as e:
                print(f"Error executing task observer notification listener: {e}")
