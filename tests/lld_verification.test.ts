import { UserService } from '../src/services/UserService';
import { TaskService } from '../src/services/TaskService';
import { SearchService } from '../src/services/SearchService';
import { NotificationService } from '../src/services/NotificationService';
import { UserRole } from '../src/models/User';
import { TaskPriority, TaskStatus } from '../src/models/Task';
import { InMemoryRepository } from '../src/repository/InMemoryRepository';
import { User } from '../src/models/User';
import { Task } from '../src/models/Task';

async function runLLDVerificationTests() {
  console.log('=================================================================');
  console.log('🧪 RUNNING LOW LEVEL DESIGN (LLD) AUTOMATED VERIFICATION SUITE');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName} - ${errorDetail || 'Assertion failed'}`);
      failed++;
    }
  }

  // Setup Clean In-Memory Instances
  const userRepo = new InMemoryRepository<User>();
  const taskRepo = new InMemoryRepository<Task>();
  const userService = new UserService(userRepo);
  const taskService = new TaskService(taskRepo, userService);
  const searchService = new SearchService();
  const notificationService = new NotificationService();

  const admin = userService.createUser('Admin Alice', 'alice@admin.com', UserRole.ADMIN);
  const manager = userService.createUser('Manager Bob', 'bob@mgr.com', UserRole.MANAGER);
  const dev = userService.createUser('Developer Charlie', 'charlie@dev.com', UserRole.MEMBER);
  const guest = userService.createUser('Guest Dave', 'dave@guest.com', UserRole.GUEST);

  // TEST 1: Task Creation & Key Generation
  console.log('📌 Test Group 1: Task Creation & RBAC');
  let task1: Task | null = null;
  try {
    task1 = taskService.createTask(manager, {
      projectId: 'proj-1',
      title: 'Implement Observer Pattern',
      description: 'Notify users on status change.',
      priority: TaskPriority.HIGH,
      assigneeId: dev.id
    });
    assert(task1 !== null && task1.status === TaskStatus.TODO, 'Task created with initial status TODO');
    assert(task1.assigneeId === dev.id, 'Task assigned to Developer Charlie');
  } catch (err: any) {
    assert(false, 'Task creation', err.message);
  }

  // TEST 2: RBAC Enforcement - Guest creating task should fail
  try {
    taskService.createTask(guest, {
      projectId: 'proj-1',
      title: 'Malicious Guest Task',
      description: '',
      priority: TaskPriority.LOW
    });
    assert(false, 'Guest blocked from creating task', 'Guest was incorrectly allowed');
  } catch (err: any) {
    assert(err.message.includes('Forbidden'), 'Guest correctly blocked from creating task');
  }

  // TEST 3: State Pattern - Valid State Transition (TODO -> IN_PROGRESS)
  console.log('\n📌 Test Group 2: State Pattern Lifecycle & Guard Rules');
  try {
    const updated = taskService.updateTaskStatus(dev, task1!.id, TaskStatus.IN_PROGRESS);
    assert(updated.status === TaskStatus.IN_PROGRESS, 'Transition TODO -> IN_PROGRESS succeeded for MEMBER');
  } catch (err: any) {
    assert(false, 'Transition TODO -> IN_PROGRESS', err.message);
  }

  // TEST 4: State Pattern - Invalid Jump Transition (IN_PROGRESS -> DONE directly for MEMBER)
  try {
    taskService.updateTaskStatus(dev, task1!.id, TaskStatus.DONE);
    assert(false, 'Illegal transition IN_PROGRESS -> DONE blocked for MEMBER', 'MEMBER bypassed REVIEW stage');
  } catch (err: any) {
    assert(err.message.includes('Invalid Status Transition'), 'Illegal transition IN_PROGRESS -> DONE correctly blocked');
  }

  // TEST 5: State Pattern - ADMIN Override
  try {
    const adminUpdated = taskService.updateTaskStatus(admin, task1!.id, TaskStatus.DONE);
    assert(adminUpdated.status === TaskStatus.DONE, 'ADMIN override allowed direct jump to DONE');
  } catch (err: any) {
    assert(false, 'ADMIN status override', err.message);
  }

  // TEST 6: Strategy Pattern - Task Search & Filtering
  console.log('\n📌 Test Group 3: Strategy Pattern Search Engine');
  taskService.createTask(manager, {
    projectId: 'proj-1',
    title: 'Fix High Priority Bug in Cache',
    description: 'Critical eviction bug',
    priority: TaskPriority.URGENT,
    assigneeId: dev.id
  });

  taskService.createTask(manager, {
    projectId: 'proj-1',
    title: 'Write Documentation',
    description: 'Documentation for LLD',
    priority: TaskPriority.LOW
  });

  const allTasks = taskService.getAllTasks();
  const searchResultUrgent = searchService.searchTasks(allTasks, { priority: TaskPriority.URGENT });
  assert(searchResultUrgent.length === 1 && searchResultUrgent[0].title.includes('Fix High Priority Bug'), 'PriorityFilterStrategy matched URGENT task');

  const searchResultKeyword = searchService.searchTasks(allTasks, { query: 'cache' });
  assert(searchResultKeyword.length === 1 && searchResultKeyword[0].priority === TaskPriority.URGENT, 'KeywordSearchStrategy matched keyword query');

  // TEST 7: Observer Pattern - Notifications Received
  console.log('\n📌 Test Group 4: Observer Pattern Notification Engine');
  const charlieNotifs = notificationService.getUserNotifications(dev.id);
  assert(charlieNotifs.length >= 1, `Developer Charlie received ${charlieNotifs.length} event notifications`);

  // TEST 8: Audit Log History
  console.log('\n📌 Test Group 5: Audit Trail History');
  const history = task1!.history;
  assert(history.length >= 3, `Audit history recorded ${history.length} field updates for task`);

  console.log('\n=================================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLLDVerificationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
