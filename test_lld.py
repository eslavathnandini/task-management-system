import unittest
from models import User, UserRole, TaskPriority, TaskStatus, NotificationEventType, Task, Notification
from repository import InMemoryRepository
from services import UserService, TaskService, SearchService, NotificationService
from patterns.observer import NotificationPublisher


class TestTaskManagementLLD(unittest.TestCase):
    def setUp(self):
        # Reset Singleton Observers for clean test isolation
        NotificationPublisher().observers.clear()

        # Instantiate empty repositories without disk files for tests
        self.user_repo = InMemoryRepository[User]()
        self.task_repo = InMemoryRepository[Task]()
        self.notif_repo = InMemoryRepository[Notification]()

        self.user_service = UserService(self.user_repo)
        self.notification_service = NotificationService(self.notif_repo)
        self.task_service = TaskService(self.task_repo, self.user_service)
        self.search_service = SearchService()

        # Clear any default seeded data
        self.user_repo.clear()
        self.task_repo.clear()
        self.notif_repo.clear()

        # Create fresh test users
        self.admin = self.user_service.create_user("Admin Alice", "alice@admin.com", UserRole.ADMIN)
        self.manager = self.user_service.create_user("Manager Bob", "bob@mgr.com", UserRole.MANAGER)
        self.dev = self.user_service.create_user("Developer Charlie", "charlie@dev.com", UserRole.MEMBER)
        self.guest = self.user_service.create_user("Guest Dave", "dave@guest.com", UserRole.GUEST)

    def test_1_task_creation_and_key_generation(self):
        task = self.task_service.create_task(
            actor=self.manager,
            project_id="proj-1",
            title="Implement Observer Pattern",
            description="Notify users on status change.",
            priority=TaskPriority.HIGH,
            assignee_id=self.dev.id
        )
        self.assertIsNotNone(task)
        self.assertEqual(task.status, TaskStatus.TODO)
        self.assertEqual(task.assignee_id, self.dev.id)
        self.assertTrue(task.task_key.startswith("ALPHA-"))

    def test_2_rbac_guest_blocked(self):
        with self.assertRaises(PermissionError):
            self.task_service.create_task(
                actor=self.guest,
                project_id="proj-1",
                title="Unauthorized Task",
                description=""
            )

    def test_3_state_pattern_valid_transition(self):
        task = self.task_service.create_task(
            actor=self.manager,
            project_id="proj-1",
            title="State Machine Test",
            priority=TaskPriority.MEDIUM
        )
        updated = self.task_service.update_task_status(self.dev, task.id, TaskStatus.IN_PROGRESS)
        self.assertEqual(updated.status, TaskStatus.IN_PROGRESS)

    def test_4_state_pattern_illegal_transition_blocked(self):
        task = self.task_service.create_task(
            actor=self.manager,
            project_id="proj-1",
            title="State Guard Test",
            priority=TaskPriority.MEDIUM
        )
        self.task_service.update_task_status(self.dev, task.id, TaskStatus.IN_PROGRESS)
        with self.assertRaises(ValueError) as ctx:
            self.task_service.update_task_status(self.dev, task.id, TaskStatus.DONE)
        self.assertIn("Invalid Status Transition", str(ctx.exception))

    def test_5_state_pattern_admin_override(self):
        task = self.task_service.create_task(
            actor=self.manager,
            project_id="proj-1",
            title="Admin Jump Test",
            priority=TaskPriority.LOW
        )
        updated = self.task_service.update_task_status(self.admin, task.id, TaskStatus.DONE)
        self.assertEqual(updated.status, TaskStatus.DONE)

    def test_6_strategy_pattern_search(self):
        t1 = self.task_service.create_task(
            actor=self.manager, project_id="proj-1",
            title="Urgent Memory Cache Fix", description="Fix eviction bug",
            priority=TaskPriority.URGENT, assignee_id=self.dev.id
        )
        t2 = self.task_service.create_task(
            actor=self.manager, project_id="proj-1",
            title="Write Documentation", description="Docs for system",
            priority=TaskPriority.LOW
        )

        all_tasks = self.task_service.get_all_tasks()
        urgent_tasks = self.search_service.search_tasks(all_tasks, priority=TaskPriority.URGENT)
        self.assertEqual(len(urgent_tasks), 1)
        self.assertEqual(urgent_tasks[0].id, t1.id)

        keyword_tasks = self.search_service.search_tasks(all_tasks, query="cache")
        self.assertEqual(len(keyword_tasks), 1)
        self.assertEqual(keyword_tasks[0].id, t1.id)

    def test_7_observer_notifications(self):
        task = self.task_service.create_task(
            actor=self.manager, project_id="proj-1",
            title="Notification Test Task", priority=TaskPriority.HIGH,
            assignee_id=self.dev.id
        )
        notifs = self.notification_service.get_user_notifications(self.dev.id)
        self.assertEqual(len(notifs), 1)
        self.assertEqual(notifs[0].event_type, NotificationEventType.TASK_CREATED)

    def test_8_audit_history(self):
        task = self.task_service.create_task(
            actor=self.manager, project_id="proj-1",
            title="Audit Test Task", priority=TaskPriority.LOW
        )
        self.task_service.update_task_status(self.dev, task.id, TaskStatus.IN_PROGRESS)
        self.task_service.assign_task(self.admin, task.id, self.dev.id)

        history = task.history
        self.assertEqual(len(history), 3)
        field_changes = [h.field_changed for h in history]
        self.assertEqual(field_changes, ["created", "status", "assignee"])


if __name__ == '__main__':
    unittest.main()
