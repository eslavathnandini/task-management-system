import { Task, TaskPriority, TaskStatus } from '../../models/Task';

export interface ISearchFilterStrategy {
  filter(tasks: Task[]): Task[];
}

export class StatusFilterStrategy implements ISearchFilterStrategy {
  constructor(private status: TaskStatus) {}

  filter(tasks: Task[]): Task[] {
    return tasks.filter((t) => t.status === this.status);
  }
}

export class PriorityFilterStrategy implements ISearchFilterStrategy {
  constructor(private priority: TaskPriority) {}

  filter(tasks: Task[]): Task[] {
    return tasks.filter((t) => t.priority === this.priority);
  }
}

export class AssigneeFilterStrategy implements ISearchFilterStrategy {
  constructor(private assigneeId: string) {}

  filter(tasks: Task[]): Task[] {
    return tasks.filter((t) => t.assigneeId === this.assigneeId);
  }
}

export class KeywordSearchStrategy implements ISearchFilterStrategy {
  constructor(private query: string) {}

  filter(tasks: Task[]): Task[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.taskKey.toLowerCase().includes(q)
    );
  }
}

export class DeadlineBeforeStrategy implements ISearchFilterStrategy {
  constructor(private beforeDateISO: string) {}

  filter(tasks: Task[]): Task[] {
    const target = new Date(this.beforeDateISO).getTime();
    return tasks.filter((t) => {
      if (!t.deadline) return false;
      return new Date(t.deadline).getTime() <= target;
    });
  }
}

export class CompositeFilterStrategy implements ISearchFilterStrategy {
  private strategies: ISearchFilterStrategy[] = [];

  addStrategy(strategy: ISearchFilterStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  filter(tasks: Task[]): Task[] {
    let result = tasks;
    for (const strategy of this.strategies) {
      result = strategy.filter(result);
    }
    return result;
  }
}
