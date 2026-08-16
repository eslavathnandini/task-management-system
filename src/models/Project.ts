export interface Project {
  id: string;
  name: string;
  key: string; // e.g. "JIRA", "TR"
  description: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
