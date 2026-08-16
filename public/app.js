document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  let allUsers = [];
  let currentTasks = [];
  let activeTask = null;

  // DOM Elements
  const userSelect = document.getElementById('userSelect');
  const activeUserBadge = document.getElementById('activeUserBadge');
  const searchInput = document.getElementById('searchInput');
  const filterPriority = document.getElementById('filterPriority');
  const filterAssignee = document.getElementById('filterAssignee');
  const btnResetFilters = document.getElementById('btnResetFilters');

  const btnNewTask = document.getElementById('btnNewTask');
  const modalTask = document.getElementById('modalTask');
  const btnCloseTaskModal = document.getElementById('btnCloseTaskModal');
  const btnCancelTaskModal = document.getElementById('btnCancelTaskModal');
  const createTaskForm = document.getElementById('createTaskForm');
  const taskAssigneeInput = document.getElementById('taskAssigneeInput');

  const modalDetail = document.getElementById('modalDetail');
  const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
  const detailKey = document.getElementById('detailKey');
  const detailTitle = document.getElementById('detailTitle');
  const detailDesc = document.getElementById('detailDesc');
  const detailStatus = document.getElementById('detailStatus');
  const detailPriority = document.getElementById('detailPriority');
  const detailAssignee = document.getElementById('detailAssignee');
  const detailReporter = document.getElementById('detailReporter');
  const detailDeadline = document.getElementById('detailDeadline');
  const statusActionButtons = document.getElementById('statusActionButtons');
  const commentsList = document.getElementById('commentsList');
  const commentInput = document.getElementById('commentInput');
  const btnPostComment = document.getElementById('btnPostComment');
  const historyTimeline = document.getElementById('historyTimeline');

  const btnNotifications = document.getElementById('btnNotifications');
  const notifBadge = document.getElementById('notifBadge');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');

  // Initialize
  init();

  async function init() {
    await fetchUsers();
    await fetchTasks();
    setupEventListeners();
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success) {
        allUsers = json.data;
        populateUserDropdowns();
        if (allUsers.length > 0) {
          currentUser = allUsers[0]; // Default Admin
          updateActiveUserUI();
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }

  function populateUserDropdowns() {
    userSelect.innerHTML = '';
    filterAssignee.innerHTML = '<option value="">All Assignees</option>';
    taskAssigneeInput.innerHTML = '<option value="">Unassigned</option>';

    allUsers.forEach((u) => {
      // Role Context Switcher
      const opt1 = document.createElement('option');
      opt1.value = u.id;
      opt1.textContent = `${u.name} [Role: ${u.role}]`;
      userSelect.appendChild(opt1);

      // Filters & Task Forms
      const opt2 = document.createElement('option');
      opt2.value = u.id;
      opt2.textContent = u.name;
      filterAssignee.appendChild(opt2);

      const opt3 = document.createElement('option');
      opt3.value = u.id;
      opt3.textContent = u.name;
      taskAssigneeInput.appendChild(opt3);
    });
  }

  function updateActiveUserUI() {
    if (!currentUser) return;
    activeUserBadge.innerHTML = `Active Role: <strong>${currentUser.role}</strong> (${currentUser.name})`;
    fetchNotifications();
  }

  async function fetchTasks() {
    try {
      const query = searchInput.value.trim();
      const priority = filterPriority.value;
      const assigneeId = filterAssignee.value;

      let url = '/api/search?';
      if (query) url += `query=${encodeURIComponent(query)}&`;
      if (priority) url += `priority=${priority}&`;
      if (assigneeId) url += `assigneeId=${assigneeId}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        currentTasks = json.data;
        renderBoard(currentTasks);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }

  function renderBoard(tasks) {
    const columns = {
      TODO: document.getElementById('list-TODO'),
      IN_PROGRESS: document.getElementById('list-IN_PROGRESS'),
      REVIEW: document.getElementById('list-REVIEW'),
      DONE: document.getElementById('list-DONE')
    };

    const counts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };

    Object.values(columns).forEach((col) => (col.innerHTML = ''));

    tasks.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
      const card = createTaskCard(task);
      if (columns[task.status]) {
        columns[task.status].appendChild(card);
      }
    });

    Object.keys(counts).forEach((status) => {
      const el = document.getElementById(`count-${status}`);
      if (el) el.textContent = counts[status];
    });
  }

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-task-id', task.id);

    const deadlineText = task.deadline
      ? new Date(task.deadline).toLocaleDateString()
      : 'No deadline';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="task-key-badge">${task.taskKey}</span>
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
      </div>
      <div class="task-card-title">${escapeHtml(task.title)}</div>
      <div class="task-card-desc">${escapeHtml(task.description || '')}</div>
      <div class="task-card-footer">
        <span class="assignee-badge">👤 ${escapeHtml(task.assigneeName || 'Unassigned')}</span>
        <span>📅 ${deadlineText}</span>
      </div>
    `;

    card.addEventListener('click', () => openDetailModal(task.id));
    return card;
  }

  async function openDetailModal(taskId) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const json = await res.json();
      if (!json.success) return alert(json.error);

      activeTask = json.data;
      detailKey.textContent = activeTask.taskKey;
      detailTitle.textContent = activeTask.title;
      detailDesc.textContent = activeTask.description || 'No description provided.';
      detailStatus.textContent = activeTask.status;
      detailPriority.textContent = activeTask.priority;
      detailAssignee.textContent = activeTask.assigneeName || 'Unassigned';
      detailReporter.textContent = activeTask.reporterName || 'Unknown';
      detailDeadline.textContent = activeTask.deadline
        ? new Date(activeTask.deadline).toLocaleDateString()
        : 'None';

      renderStatusActionButtons(activeTask.status);
      renderComments(activeTask.comments || []);
      renderHistory(activeTask.history || []);

      modalDetail.classList.remove('hidden');
    } catch (err) {
      console.error('Failed to load task details:', err);
    }
  }

  function renderStatusActionButtons(currentStatus) {
    statusActionButtons.innerHTML = '';
    const statusMap = {
      TODO: ['IN_PROGRESS'],
      IN_PROGRESS: ['TODO', 'REVIEW'],
      REVIEW: ['IN_PROGRESS', 'DONE'],
      DONE: ['IN_PROGRESS', 'TODO']
    };

    let allowed = statusMap[currentStatus] || [];
    if (currentUser.role === 'ADMIN') {
      allowed = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].filter((s) => s !== currentStatus);
    }

    allowed.forEach((targetStatus) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = `Move to ${targetStatus}`;
      btn.addEventListener('click', () => changeTaskStatus(activeTask.id, targetStatus));
      statusActionButtons.appendChild(btn);
    });
  }

  async function changeTaskStatus(taskId, newStatus) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (!json.success) {
        return alert(`RBAC / State Error: ${json.error}`);
      }

      await openDetailModal(taskId);
      await fetchTasks();
      fetchNotifications();
    } catch (err) {
      alert(err.message);
    }
  }

  function renderComments(comments) {
    commentsList.innerHTML = '';
    if (comments.length === 0) {
      commentsList.innerHTML = '<p class="empty-text">No comments yet.</p>';
      return;
    }
    comments.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'comment-card';
      div.innerHTML = `
        <div class="comment-author">${escapeHtml(c.authorName)} <span style="font-weight:normal; font-size:10px; color:#94a3b8;">${new Date(c.createdAt).toLocaleTimeString()}</span></div>
        <div>${escapeHtml(c.content)}</div>
      `;
      commentsList.appendChild(div);
    });
  }

  function renderHistory(history) {
    historyTimeline.innerHTML = '';
    if (history.length === 0) {
      historyTimeline.innerHTML = '<p class="empty-text">No audit logs recorded.</p>';
      return;
    }
    history.slice().reverse().forEach((h) => {
      const div = document.createElement('div');
      div.className = 'timeline-item';
      div.innerHTML = `
        <div><strong>${escapeHtml(h.performedByUserName)}</strong> updated <em>${h.fieldChanged}</em></div>
        <div style="color:#a5b4fc;">${h.oldValue ? h.oldValue + ' → ' : ''}<strong>${h.newValue}</strong></div>
        <div class="timeline-time">${new Date(h.timestamp).toLocaleString()}</div>
      `;
      historyTimeline.appendChild(div);
    });
  }

  async function postComment() {
    const text = commentInput.value.trim();
    if (!text || !activeTask) return;

    try {
      const res = await fetch(`/api/tasks/${activeTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ content: text })
      });
      const json = await res.json();
      if (!json.success) return alert(json.error);

      commentInput.value = '';
      await openDetailModal(activeTask.id);
      fetchNotifications();
    } catch (err) {
      alert(err.message);
    }
  }

  async function fetchNotifications() {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications/user/${currentUser.id}`);
      const json = await res.json();
      if (json.success) {
        const notifs = json.data;
        const unread = notifs.filter((n) => !n.isRead);
        notifBadge.textContent = unread.length;

        if (notifs.length === 0) {
          notifList.innerHTML = '<p class="empty-text">No notifications</p>';
          return;
        }

        notifList.innerHTML = '';
        notifs.forEach((n) => {
          const div = document.createElement('div');
          div.className = 'notif-item';
          div.style.opacity = n.isRead ? '0.6' : '1';
          div.innerHTML = `
            <div>${escapeHtml(n.message)}</div>
            <div class="notif-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
          `;
          notifList.appendChild(div);
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }

  function setupEventListeners() {
    userSelect.addEventListener('change', (e) => {
      currentUser = allUsers.find((u) => u.id === e.target.value);
      updateActiveUserUI();
    });

    searchInput.addEventListener('input', fetchTasks);
    filterPriority.addEventListener('change', fetchTasks);
    filterAssignee.addEventListener('change', fetchTasks);

    btnResetFilters.addEventListener('click', () => {
      searchInput.value = '';
      filterPriority.value = '';
      filterAssignee.value = '';
      fetchTasks();
    });

    btnNewTask.addEventListener('click', () => {
      modalTask.classList.remove('hidden');
    });

    btnCloseTaskModal.addEventListener('click', () => modalTask.classList.add('hidden'));
    btnCancelTaskModal.addEventListener('click', () => modalTask.classList.add('hidden'));

    createTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const title = document.getElementById('taskTitleInput').value.trim();
        const description = document.getElementById('taskDescInput').value.trim();
        const priority = document.getElementById('taskPriorityInput').value;
        const assigneeId = document.getElementById('taskAssigneeInput').value || null;
        const deadline = document.getElementById('taskDeadlineInput').value || null;

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id
          },
          body: JSON.stringify({
            projectId: 'proj-core-1',
            title,
            description,
            priority,
            assigneeId,
            deadline: deadline ? new Date(deadline).toISOString() : null
          })
        });

        const json = await res.json();
        if (!json.success) return alert(`RBAC Error: ${json.error}`);

        modalTask.classList.add('hidden');
        createTaskForm.reset();
        await fetchTasks();
        fetchNotifications();
      } catch (err) {
        alert(err.message);
      }
    });

    btnCloseDetailModal.addEventListener('click', () => modalDetail.classList.add('hidden'));
    btnPostComment.addEventListener('click', postComment);

    btnNotifications.addEventListener('click', () => {
      notifDropdown.classList.toggle('hidden');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
});
