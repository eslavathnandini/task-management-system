import { Comment } from './Comment';
import { TaskHistory } from './TaskHistory';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

export interface Task {
  id: string;
  projectId: string;
  taskKey: string; // e.g. "JIRA-101"
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName?: string | null;
  reporterId: string;
  reporterName?: string;
  deadline: string | null; // ISO Date String
  comments: Comment[];
  history: TaskHistory[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
