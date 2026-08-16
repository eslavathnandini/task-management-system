export interface TaskHistory {
  id: string;
  taskId: string;
  fieldChanged: string; // e.g. 'status', 'assignee', 'priority', 'title'
  oldValue: string | null;
  newValue: string | null;
  performedByUserId: string;
  performedByUserName: string;
  timestamp: string;
}
