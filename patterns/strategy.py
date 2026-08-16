from abc import ABC, abstractmethod
from typing import List, Optional
from models import Task, TaskPriority, TaskStatus


class SearchFilterStrategy(ABC):
    @abstractmethod
    def filter(self, tasks: List[Task]) -> List[Task]:
        pass


class StatusFilterStrategy(SearchFilterStrategy):
    def __init__(self, status: TaskStatus):
        self.status = status

    def filter(self, tasks: List[Task]) -> List[Task]:
        target_val = self.status.value if hasattr(self.status, 'value') else str(self.status)
        return [
            t for t in tasks
            if (t.status.value if hasattr(t.status, 'value') else str(t.status)) == target_val
        ]


class PriorityFilterStrategy(SearchFilterStrategy):
    def __init__(self, priority: TaskPriority):
        self.priority = priority

    def filter(self, tasks: List[Task]) -> List[Task]:
        target_val = self.priority.value if hasattr(self.priority, 'value') else str(self.priority)
        return [
            t for t in tasks
            if (t.priority.value if hasattr(t.priority, 'value') else str(t.priority)) == target_val
        ]


class AssigneeFilterStrategy(SearchFilterStrategy):
    def __init__(self, assignee_id: str):
        self.assignee_id = assignee_id

    def filter(self, tasks: List[Task]) -> List[Task]:
        return [t for t in tasks if t.assignee_id == self.assignee_id]


class KeywordSearchStrategy(SearchFilterStrategy):
    def __init__(self, query: str):
        self.query = query.strip().lower()

    def filter(self, tasks: List[Task]) -> List[Task]:
        if not self.query:
            return tasks
        return [
            t for t in tasks
            if self.query in t.title.lower()
            or self.query in t.description.lower()
            or self.query in t.task_key.lower()
        ]


class CompositeFilterStrategy(SearchFilterStrategy):
    def __init__(self):
        self.strategies: List[SearchFilterStrategy] = []

    def add_strategy(self, strategy: SearchFilterStrategy):
        self.strategies.append(strategy)
        return self

    def filter(self, tasks: List[Task]) -> List[Task]:
        result = tasks
        for strategy in self.strategies:
            result = strategy.filter(result)
        return result
