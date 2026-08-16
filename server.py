import json
import os
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from typing import Dict, Any

from models import UserRole, TaskPriority, TaskStatus
from services import UserService, ProjectService, TaskService, SearchService, NotificationService

user_service = UserService()
project_service = ProjectService()
notification_service = NotificationService()
task_service = TaskService(user_service=user_service)
search_service = SearchService()


class RESTRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        public_dir = os.path.join(os.path.dirname(__file__), 'public')
        super().__init__(*args, directory=public_dir, **kwargs)

    def _send_json(self, data: Dict[str, Any], status_code: int = 200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-user-id')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _get_actor_user(self):
        user_id = self.headers.get('x-user-id', 'user-dev-1')
        actor = user_service.get_user_by_id(user_id)
        if not actor:
            raise ValueError(f"Actor user '{user_id}' not found")
        return actor

    def _parse_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode('utf-8')
        return json.loads(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-user-id')
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path.startswith('/api/'):
            try:
                if path == '/api/users':
                    users = [u.to_dict() for u in user_service.get_all_users()]
                    return self._send_json({"success": True, "data": users})

                elif path == '/api/projects':
                    projects = [p.to_dict() for p in project_service.get_all_projects()]
                    return self._send_json({"success": True, "data": projects})

                elif path == '/api/tasks':
                    tasks = [t.to_dict() for t in task_service.get_all_tasks()]
                    return self._send_json({"success": True, "count": len(tasks), "data": tasks})

                elif path.startswith('/api/tasks/') and not path.endswith('/history'):
                    task_id = path.split('/')[3]
                    task = task_service.get_task_by_id(task_id)
                    if not task:
                        return self._send_json({"success": False, "error": "Task not found"}, 404)
                    return self._send_json({"success": True, "data": task.to_dict()})

                elif path == '/api/search':
                    status_param = query.get('status', [None])[0]
                    priority_param = query.get('priority', [None])[0]
                    assignee_param = query.get('assigneeId', [None])[0]
                    query_param = query.get('query', [None])[0]

                    status_enum = TaskStatus(status_param) if status_param else None
                    priority_enum = TaskPriority(priority_param) if priority_param else None

                    all_tasks = task_service.get_all_tasks()
                    filtered = search_service.search_tasks(
                        all_tasks, status=status_enum, priority=priority_enum,
                        assignee_id=assignee_param, query=query_param
                    )
                    return self._send_json({"success": True, "count": len(filtered), "data": [t.to_dict() for t in filtered]})

                elif path.startswith('/api/notifications/user/'):
                    user_id = path.split('/')[4]
                    notifs = [n.to_dict() for n in notification_service.get_user_notifications(user_id)]
                    return self._send_json({"success": True, "data": notifs})

                else:
                    return self._send_json({"success": False, "error": "Endpoint not found"}, 404)

            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, 400)
        else:
            return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self._parse_json_body()

        if path.startswith('/api/'):
            try:
                actor = self._get_actor_user()

                if path == '/api/tasks':
                    task = task_service.create_task(
                        actor=actor,
                        project_id=body.get("projectId", "proj-core-1"),
                        title=body.get("title"),
                        description=body.get("description", ""),
                        priority=TaskPriority(body.get("priority", TaskPriority.MEDIUM)),
                        assignee_id=body.get("assigneeId"),
                        deadline=body.get("deadline")
                    )
                    return self._send_json({"success": True, "data": task.to_dict()}, 201)

                elif path.startswith('/api/tasks/') and path.endswith('/comments'):
                    task_id = path.split('/')[3]
                    comment = task_service.add_comment(actor, task_id, body.get("content", ""))
                    return self._send_json({"success": True, "data": comment.to_dict()}, 201)

                else:
                    return self._send_json({"success": False, "error": "Endpoint not found"}, 404)

            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, 400)

    def do_PATCH(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self._parse_json_body()

        if path.startswith('/api/'):
            try:
                actor = self._get_actor_user()

                if path.startswith('/api/tasks/') and path.endswith('/status'):
                    task_id = path.split('/')[3]
                    new_status = TaskStatus(body.get("status"))
                    updated = task_service.update_task_status(actor, task_id, new_status)
                    return self._send_json({"success": True, "data": updated.to_dict()})

                elif path.startswith('/api/tasks/') and path.endswith('/assign'):
                    task_id = path.split('/')[3]
                    assignee_id = body.get("assigneeId")
                    updated = task_service.assign_task(actor, task_id, assignee_id)
                    return self._send_json({"success": True, "data": updated.to_dict()})

                else:
                    return self._send_json({"success": False, "error": "Endpoint not found"}, 404)

            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, 400)

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith('/api/tasks/'):
            try:
                actor = self._get_actor_user()
                task_id = path.split('/')[3]
                success = task_service.delete_task(actor, task_id)
                if not success:
                    return self._send_json({"success": False, "error": "Task not found"}, 404)
                return self._send_json({"success": True, "message": "Task deleted successfully"})
            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, 400)


def run_server(port: int = 8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RESTRequestHandler)
    print("=======================================================")
    print(f"Task Management System (Mini Jira / Trello LLD)")
    print(f"REST API & Kanban Board running at: http://localhost:{port}")
    print("=======================================================")
    httpd.serve_forever()


if __name__ == '__main__':
    run_server()
