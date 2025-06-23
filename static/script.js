// --- Hilfsfunktionen ---
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return document.querySelectorAll(sel); }

// --- API ---
async function fetchTasks() {
    const res = await fetch('/api/tasks');
    return await res.json();
}
async function createTask(task) {
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
    return await res.json();
}
async function updateTask(id, task) {
    await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
}
async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
}

// --- Rendering ---
function renderTasks(tasks) {
    const columns = {
        'To Do': $('#todo-tasks'),
        'In Progress': $('#progress-tasks'),
        'Done': $('#done-tasks')
    };
    Object.values(columns).forEach(col => col.innerHTML = '');
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'kanban-task';
        card.draggable = true;
        card.dataset.id = task.id;
        card.dataset.priority = task.priority || 'normal';
        // Prioritäts-Icon
        let prioIcon = '';
        if (task.priority === 'high') prioIcon = '<span class="priority-icon" title="Hoch">⬆️</span>';
        else if (task.priority === 'low') prioIcon = '<span class="priority-icon" title="Niedrig">⬇️</span>';
        else prioIcon = '<span class="priority-icon" title="Mittel">●</span>';
        // Tags als Badges
        let tags = '';
        if (task.tags) {
            tags = `<div class="task-tags">${escapeHtml(task.tags).split(',').filter(t=>t.trim()).map(t=>`<span class="task-badge">${t.trim()}</span>`).join('')}</div>`;
        }
        card.innerHTML = `
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-desc">${escapeHtml(task.description || '')}</div>
            ${tags}
            ${prioIcon}
            <div class="task-actions">
                <button class="edit-btn" title="Bearbeiten">✏️</button>
                <button class="delete-btn" title="Löschen">🗑️</button>
            </div>
        `;
        // Drag & Drop Events
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
        // Edit/Delete
        card.querySelector('.edit-btn').onclick = () => openTaskModal(task);
        card.querySelector('.delete-btn').onclick = async () => {
            if (confirm('Aufgabe wirklich löschen?')) {
                await deleteTask(task.id);
                loadAndRender();
            }
        };
        columns[task.status]?.appendChild(card);
    });
}

// --- Skeleton Loader ---
function showSkeletons() {
    $all('.kanban-tasks').forEach(col => {
        col.innerHTML = '';
        for (let i = 0; i < 2; i++) {
            const skel = document.createElement('div');
            skel.className = 'skeleton';
            col.appendChild(skel);
        }
    });
}

// --- Drag & Drop ---
let draggedTaskId = null;
function dragStart(e) {
    draggedTaskId = this.dataset.id;
    setTimeout(() => this.style.opacity = '0.5', 0);
}
function dragEnd(e) {
    draggedTaskId = null;
    this.style.opacity = '';
}
$all('.kanban-tasks').forEach(col => {
    col.addEventListener('dragover', e => {
        e.preventDefault();
        col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', e => {
        col.classList.remove('drag-over');
    });
    col.addEventListener('drop', async e => {
        col.classList.remove('drag-over');
        if (draggedTaskId) {
            const status = col.parentElement.dataset.status;
            const task = allTasks.find(t => t.id == draggedTaskId);
            if (task && task.status !== status) {
                await updateTask(task.id, { ...task, status });
                loadAndRender();
            }
        }
    });
});

// --- Task Modal ---
const modal = $('#task-modal');
const form = $('#task-form');
const closeBtn = $('.close-btn');
let editTaskId = null;
function openTaskModal(task = null) {
    modal.classList.remove('hidden');
    if (task) {
        editTaskId = task.id;
        $('#task-id').value = task.id;
        $('#task-title').value = task.title;
        $('#task-desc').value = task.description || '';
        $('#task-status').value = task.status;
        $('#task-priority').value = task.priority || 'normal';
        $('#task-tags').value = task.tags || '';
    } else {
        editTaskId = null;
        form.reset();
        $('#task-status').value = form.dataset.status || 'To Do';
        $('#task-tags').value = '';
    }
    $('#task-title').focus();
}
function closeTaskModal() {
    modal.classList.add('hidden');
    form.reset();
    editTaskId = null;
}
closeBtn.onclick = closeTaskModal;
modal.onclick = e => { if (e.target === modal) closeTaskModal(); };
form.onsubmit = async e => {
    e.preventDefault();
    const task = {
        title: $('#task-title').value,
        description: $('#task-desc').value,
        status: $('#task-status').value,
        priority: $('#task-priority').value,
        tags: $('#task-tags').value
    };
    if (editTaskId) {
        await updateTask(editTaskId, task);
    } else {
        await createTask(task);
    }
    closeTaskModal();
    loadAndRender();
};
$all('.add-task-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation();
        form.dataset.status = btn.dataset.status;
        openTaskModal();
    };
});

// --- Dunkelmodus ---
const darkBtn = $('#darkmode-toggle');
darkBtn.onclick = () => {
    document.body.classList.toggle('darkmode');
    localStorage.setItem('darkmode', document.body.classList.contains('darkmode'));
};
if (localStorage.getItem('darkmode') === 'true') {
    document.body.classList.add('darkmode');
}

// --- Hilfsfunktion für XSS-Schutz ---
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag]));
}

// --- Initiales Laden ---
let allTasks = [];
async function loadAndRender() {
    showSkeletons();
    allTasks = await fetchTasks();
    renderTasks(allTasks);
}
loadAndRender(); 