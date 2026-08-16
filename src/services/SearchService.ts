import { Task, TaskPriority, TaskStatus } from '../models/Task';
import {
  CompositeFilterStrategy,
  StatusFilterStrategy,
  PriorityFilterStrategy,
  AssigneeFilterStrategy,
  KeywordSearchStrategy,
  DeadlineBeforeStrategy
} from '../patterns/strategy/SearchStrategy';

export interface SearchCriteria {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  query?: string;
  deadlineBefore?: string;
}

export class SearchService {
  public searchTasks(tasks: Task[], criteria: SearchCriteria): Task[] {
    const composite = new CompositeFilterStrategy();

    if (criteria.status) {
      composite.addStrategy(new StatusFilterStrategy(criteria.status));
    }
    if (criteria.priority) {
      composite.addStrategy(new PriorityFilterStrategy(criteria.priority));
    }
    if (criteria.assigneeId) {
      composite.addStrategy(new AssigneeFilterStrategy(criteria.assigneeId));
    }
    if (criteria.query) {
      composite.addStrategy(new KeywordSearchStrategy(criteria.query));
    }
    if (criteria.deadlineBefore) {
      composite.addStrategy(new DeadlineBeforeStrategy(criteria.deadlineBefore));
    }

    return composite.filter(tasks);
  }
}
