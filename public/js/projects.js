// Projects Portal with Nostr Integration
// Allows users to browse projects, submit bugs/features, and track tasks

let currentProject = null;
let currentPubkey = null;
let isAdmin = false;
let authToken = null;
let allTasks = [];
let currentFilter = 'all';
let editingTaskId = null;
let viewingTaskId = null;

// DOM Elements
const projectSelect = document.getElementById('project-select');
const projectDetails = document.getElementById('project-details');
const noProjectSection = document.getElementById('no-project');
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');
const nostrLoginBtn = document.getElementById('nostr-login-btn');
const nostrLogoutBtn = document.getElementById('nostr-logout-btn');
const userInfo = document.getElementById('user-info');
const userPubkey = document.getElementById('user-pubkey');
const nostrNotice = document.getElementById('nostr-notice');

// Initialize
async function init() {
    await loadProjects();
    setupEventListeners();
    checkUrlParams();
}

// Load projects into dropdown
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        projectSelect.innerHTML = '<option value="">-- Choose a project --</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Project selection
    projectSelect.addEventListener('change', handleProjectChange);
    
    // Nostr auth
    nostrLoginBtn.addEventListener('click', handleNostrLogin);
    nostrLogoutBtn.addEventListener('click', handleNostrLogout);
    
    // Task form
    taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
}

// Check URL params for project ID
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    
    if (projectId) {
        projectSelect.value = projectId;
        handleProjectChange();
    }
}

// Handle project selection
async function handleProjectChange() {
    const projectId = projectSelect.value;
    
    if (!projectId) {
        projectDetails.style.display = 'none';
        noProjectSection.style.display = 'block';
        currentProject = null;
        updateUrl(null);
        return;
    }
    
    try {
        // Load project details
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error('Project not found');
        
        currentProject = await response.json();
        
        // Update URL
        updateUrl(projectId);
        
        // Display project info
        displayProjectInfo();
        
        // Load tasks and stats
        await Promise.all([loadTasks(), loadStats()]);
        
        // Show project details
        projectDetails.style.display = 'block';
        noProjectSection.style.display = 'none';
    } catch (error) {
        console.error('Error loading project:', error);
        projectDetails.style.display = 'none';
        noProjectSection.style.display = 'block';
    }
}

// Update URL without page reload
function updateUrl(projectId) {
    const url = projectId 
        ? `${window.location.pathname}?id=${projectId}`
        : window.location.pathname;
    history.pushState({}, '', url);
}

// Display project information
function displayProjectInfo() {
    document.getElementById('project-name').textContent = currentProject.name;
    document.getElementById('project-description').textContent = currentProject.description;
    
    const linksContainer = document.getElementById('project-links');
    let linksHtml = '';
    
    if (currentProject.url) {
        linksHtml += `<a href="${escapeHtml(currentProject.url)}" target="_blank" class="project-link">🌐 Live Site</a>`;
    }
    if (currentProject.repository) {
        linksHtml += `<a href="${escapeHtml(currentProject.repository)}" target="_blank" class="project-link">📂 GitHub</a>`;
    }
    
    linksContainer.innerHTML = linksHtml;
}

// Load tasks for current project
async function loadTasks() {
    if (!currentProject) return;
    
    tasksList.innerHTML = '<p class="loading">Loading tasks...</p>';
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/tasks`);
        allTasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksList.innerHTML = '<p class="error">Failed to load tasks.</p>';
    }
}

// Load task stats
async function loadStats() {
    if (!currentProject) return;
    
    try {
        const response = await fetch(`/api/projects/${currentProject.id}/tasks/stats`);
        const stats = await response.json();
        
        document.getElementById('stat-open').textContent = stats.open;
        document.getElementById('stat-in-progress').textContent = stats.inProgress;
        document.getElementById('stat-completed').textContent = stats.completed;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render tasks based on current filter
function renderTasks() {
    let filteredTasks = allTasks;
    
    if (currentFilter !== 'all') {
        filteredTasks = allTasks.filter(task => task.status === currentFilter);
    }
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `<p class="text-muted">No ${currentFilter === 'all' ? '' : currentFilter.replace('_', ' ')} tasks yet.</p>`;
        return;
    }
    
    // Sort tasks: priority first, then normal (by updatedAt), then completed, then ignored
    filteredTasks = [...filteredTasks].sort((a, b) => {
        // Priority tasks first
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        
        // Completed tasks near bottom
        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        
        // Ignored tasks at the very bottom
        if (a.ignored && !b.ignored) return 1;
        if (!a.ignored && b.ignored) return -1;
        
        // Sort by updatedAt (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    tasksList.innerHTML = filteredTasks.map(task => {
        const typeIcon = getTypeIcon(task.type);
        const statusClass = `status-${task.status}`;
        const statusLabel = task.status.replace('_', ' ');
        const date = new Date(task.updatedAt || task.createdAt).toLocaleDateString();
        const hasNostr = task.nostrEventId ? '<span class="nostr-indicator" title="Posted to Nostr">⚡</span>' : '';
        
        // Priority and ignored styling
        const priorityClass = task.priority ? 'task-priority' : '';
        const ignoredClass = task.ignored ? 'task-ignored' : '';
        const completedClass = task.status === 'completed' ? 'task-completed' : '';
        
        // Priority/ignored badges
        const priorityBadge = task.priority ? '<span class="priority-badge">🔥 PRIORITY</span>' : '';
        const ignoredBadge = task.ignored ? '<span class="ignored-badge">🚫 IGNORED</span>' : '';
        
        // Admin quick action buttons
        const adminQuickActions = isAdmin ? `
            <div class="task-quick-actions">
                <button class="quick-btn ${task.priority ? 'active' : ''}" onclick="event.stopPropagation(); togglePriority('${task.id}')" title="Toggle Priority">🔥</button>
                <button class="quick-btn ${task.status === 'completed' ? 'active' : ''}" onclick="event.stopPropagation(); markComplete('${task.id}')" title="Mark Completed">✅</button>
                <button class="quick-btn ${task.ignored ? 'active' : ''}" onclick="event.stopPropagation(); toggleIgnored('${task.id}')" title="Toggle Ignored">🚫</button>
                <button class="quick-btn" onclick="event.stopPropagation(); openTaskModal('${task.id}')" title="Manage">⚙️</button>
            </div>
        ` : '';
        
        return `
            <div class="task-item ${statusClass} ${priorityClass} ${ignoredClass} ${completedClass}" onclick="openTaskDetail('${task.id}')" style="cursor: pointer;">
                <div class="task-header">
                    <span class="task-type">${typeIcon}</span>
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    ${priorityBadge}
                    ${ignoredBadge}
                    ${hasNostr}
                    ${adminQuickActions}
                </div>
                <p class="task-description">${escapeHtml(task.description)}</p>
                <div class="task-meta">
                    <span class="task-status ${statusClass}">${statusLabel}</span>
                    <span class="task-date">Updated: ${date}</span>
                    ${task.authorPubkey ? `<span class="task-author" title="${task.authorPubkey}">by ${task.authorPubkey.substring(0, 8)}...</span>` : '<span class="task-author">Anonymous</span>'}
                </div>
                ${task.adminNotes ? `<div class="task-notes"><strong>Admin notes:</strong> ${escapeHtml(task.adminNotes)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Get icon for task type
function getTypeIcon(type) {
    switch (type) {
        case 'bug': return '🐛';
        case 'feature': return '✨';
        case 'task': return '📋';
        default: return '📝';
    }
}

// Handle Nostr login
async function handleNostrLogin() {
    if (!window.nostr) {
        alert('No Nostr extension detected. Please install a NIP-07 compatible extension like nos2x or Alby.');
        return;
    }
    
    try {
        currentPubkey = await window.nostr.getPublicKey();
        
        // Check if user is admin
        const adminCheck = await fetch('/api/auth/check-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pubkey: currentPubkey })
        });
        const { isAdmin: adminStatus } = await adminCheck.json();
        isAdmin = adminStatus;
        
        // If admin, create auth token for API calls
        if (isAdmin) {
            const event = {
                kind: 22242,
                created_at: Math.floor(Date.now() / 1000),
                tags: [['challenge', 'admin-login']],
                content: 'Authenticate to PlebOne admin',
                pubkey: currentPubkey
            };
            const signedEvent = await window.nostr.signEvent(event);
            authToken = JSON.stringify(signedEvent);
        }
        
        // Update UI
        nostrLoginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        
        const adminBadge = isAdmin ? ' <span class="admin-badge">ADMIN</span>' : '';
        userPubkey.innerHTML = `${currentPubkey.substring(0, 8)}...${currentPubkey.substring(currentPubkey.length - 4)}${adminBadge}`;
        nostrNotice.innerHTML = '<span class="nostr-badge active">⚡ Nostr</span> Your submission will be posted to Nostr';
        
        // Re-render tasks to show admin controls
        if (isAdmin && allTasks.length > 0) {
            renderTasks();
        }
        
    } catch (error) {
        console.error('Nostr login error:', error);
        alert('Failed to connect to Nostr extension: ' + error.message);
    }
}

// Handle Nostr logout
function handleNostrLogout() {
    currentPubkey = null;
    isAdmin = false;
    authToken = null;
    nostrLoginBtn.style.display = 'block';
    userInfo.style.display = 'none';
    nostrNotice.innerHTML = '<span class="nostr-badge">⚡ Nostr</span> Sign in to post this to Nostr';
    
    // Re-render tasks to hide admin controls
    if (allTasks.length > 0) {
        renderTasks();
    }
}

// Handle task submission
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    if (!currentProject) {
        alert('Please select a project first.');
        return;
    }
    
    const submitBtn = document.getElementById('submit-task-btn');
    const submitBtnText = document.getElementById('submit-btn-text');
    
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Submitting...';
    
    const taskData = {
        type: document.getElementById('task-type').value,
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-description').value.trim(),
    };
    
    try {
        let body = { task: taskData };
        
        // If logged in with Nostr, create and sign an event
        if (currentPubkey && window.nostr) {
            const signedEvent = await createAndSignNostrEvent(taskData);
            if (signedEvent) {
                body.signedEvent = signedEvent;
            }
        }
        
        const response = await fetch(`/api/projects/${currentProject.id}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit task');
        }
        
        const newTask = await response.json();
        
        // Reset form
        taskForm.reset();
        
        // Reload tasks and stats
        await Promise.all([loadTasks(), loadStats()]);
        
        // Show success message
        const successMsg = newTask.nostrEventId 
            ? 'Your request has been submitted and posted to Nostr!'
            : 'Your request has been submitted!';
        alert(successMsg);
        
    } catch (error) {
        console.error('Error submitting task:', error);
        alert('Failed to submit: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Submit';
    }
}

// Create and sign a Nostr event for the task
async function createAndSignNostrEvent(taskData) {
    if (!window.nostr || !currentPubkey) return null;
    
    try {
        const typeLabel = taskData.type === 'bug' ? 'Bug Report' 
            : taskData.type === 'feature' ? 'Feature Request' 
            : 'Task';
        
        // Always use the pleb.one project URL for the link
        const projectUrl = `https://pleb.one/projects.html?id=${currentProject.id}`;
        
        // Build content with project reference
        const content = `[${typeLabel}] ${taskData.title}\n\n${taskData.description}\n\n🔗 Project: ${currentProject.name}\n${projectUrl}`;
        
        const event = {
            kind: 1, // Regular note
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'plebone'],
                ['t', taskData.type],
                ['t', currentProject.name.toLowerCase().replace(/\s+/g, '-')],
                ['r', projectUrl],
            ],
            content: content,
            pubkey: currentPubkey,
        };
        
        // Sign with NIP-07 extension
        const signedEvent = await window.nostr.signEvent(event);
        return signedEvent;
        
    } catch (error) {
        console.error('Error creating Nostr event:', error);
        return null;
    }
}

// Utility: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Admin Task Management (inline on projects page)
// ============================================

// API helper with admin auth
async function adminApiRequest(url, options = {}) {
    if (!authToken) {
        throw new Error('Not authenticated as admin');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Nostr ${authToken}`,
        ...options.headers
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
}

// Open task modal for admin
window.openTaskModal = function(taskId) {
    if (!isAdmin) return;
    
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    
    // Populate modal
    document.getElementById('admin-task-title').textContent = task.title;
    document.getElementById('admin-task-type').textContent = task.type.toUpperCase();
    document.getElementById('admin-task-description').textContent = task.description;
    document.getElementById('admin-task-author').textContent = task.authorPubkey 
        ? `${task.authorPubkey.substring(0, 16)}...` 
        : 'Anonymous';
    document.getElementById('admin-task-nostr').textContent = task.nostrEventId || 'None';
    document.getElementById('admin-task-status').value = task.status;
    document.getElementById('admin-task-notes').value = task.adminNotes || '';
    document.getElementById('admin-task-reply-nostr').checked = false;
    
    // Show/hide Nostr reply option
    const nostrReplyGroup = document.getElementById('nostr-reply-group');
    nostrReplyGroup.style.display = task.nostrEventId ? 'block' : 'none';
    
    // Show modal
    document.getElementById('admin-task-modal').classList.add('active');
};

// Close task modal
window.closeAdminTaskModal = function() {
    document.getElementById('admin-task-modal').classList.remove('active');
    editingTaskId = null;
};

// Save task changes
window.saveTaskChanges = async function() {
    if (!editingTaskId || !isAdmin) return;
    
    const status = document.getElementById('admin-task-status').value;
    const adminNotes = document.getElementById('admin-task-notes').value;
    const shouldReplyNostr = document.getElementById('admin-task-reply-nostr').checked;
    
    try {
        // Update task status
        await adminApiRequest(`/api/admin/tasks/${editingTaskId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, adminNotes })
        });
        
        // If should reply to Nostr
        if (shouldReplyNostr) {
            const task = allTasks.find(t => t.id === editingTaskId);
            if (task && task.nostrEventId && task.authorPubkey && window.nostr) {
                await publishAdminReplyToNostr(task, status, adminNotes);
            }
        }
        
        closeAdminTaskModal();
        await loadTasks();
        alert('Task updated successfully!');
    } catch (error) {
        alert('Failed to update task: ' + error.message);
    }
};

// Delete task
window.deleteTask = async function() {
    if (!editingTaskId || !isAdmin) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await adminApiRequest(`/api/admin/tasks/${editingTaskId}`, { method: 'DELETE' });
        closeAdminTaskModal();
        await loadTasks();
        await loadStats();
    } catch (error) {
        alert('Failed to delete task: ' + error.message);
    }
};

// Publish admin reply to Nostr
async function publishAdminReplyToNostr(task, status, adminNotes) {
    if (!window.nostr || !currentPubkey) return;
    
    try {
        const statusLabel = status.replace('_', ' ');
        let content = `📋 Task Update: ${task.title}\n\nStatus: ${statusLabel.toUpperCase()}`;
        
        if (adminNotes) {
            content += `\n\nNotes: ${adminNotes}`;
        }
        
        content += `\n\n🔗 https://pleb.one/projects.html?id=${task.projectId}`;
        
        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['e', task.nostrEventId, '', 'reply'],
                ['p', task.authorPubkey],
                ['t', 'plebone'],
                ['t', 'task-update'],
            ],
            content: content,
        };
        
        const signedEvent = await window.nostr.signEvent(eventTemplate);
        
        await adminApiRequest(`/api/admin/tasks/${task.id}/reply-nostr`, {
            method: 'POST',
            body: JSON.stringify({ signedEvent })
        });
        
        console.log('Admin reply published to Nostr');
    } catch (error) {
        console.error('Error publishing admin reply to Nostr:', error);
    }
}

// Quick action: Toggle Priority
window.togglePriority = async function(taskId) {
    if (!isAdmin) return;
    
    try {
        await adminApiRequest(`/api/admin/tasks/${taskId}/priority`, { method: 'PUT' });
        await loadTasks();
    } catch (error) {
        alert('Failed to toggle priority: ' + error.message);
    }
};

// Quick action: Mark Complete
window.markComplete = async function(taskId) {
    if (!isAdmin) return;
    
    try {
        await adminApiRequest(`/api/admin/tasks/${taskId}/complete`, { method: 'PUT' });
        await loadTasks();
        await loadStats();
    } catch (error) {
        alert('Failed to mark complete: ' + error.message);
    }
};

// Quick action: Toggle Ignored
window.toggleIgnored = async function(taskId) {
    if (!isAdmin) return;
    
    try {
        await adminApiRequest(`/api/admin/tasks/${taskId}/ignored`, { method: 'PUT' });
        await loadTasks();
    } catch (error) {
        alert('Failed to toggle ignored: ' + error.message);
    }
};

// ============================================
// Collapsible Submit Form
// ============================================

window.toggleSubmitForm = function() {
    const container = document.getElementById('submit-form-container');
    const toggle = document.getElementById('submit-toggle');
    
    container.classList.toggle('collapsed');
    toggle.textContent = container.classList.contains('collapsed') ? '▼' : '▲';
};

// ============================================
// Task Detail Modal (viewable by anyone)
// ============================================

window.openTaskDetail = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Type icon and title
    document.getElementById('detail-task-type-icon').textContent = getTypeIcon(task.type);
    document.getElementById('detail-task-title').textContent = task.title;
    
    // Badges
    let badges = `<span class="task-status status-${task.status}">${task.status.replace('_', ' ')}</span>`;
    if (task.priority) badges += '<span class="priority-badge">🔥 PRIORITY</span>';
    if (task.ignored) badges += '<span class="ignored-badge">🚫 IGNORED</span>';
    document.getElementById('detail-task-badges').innerHTML = badges;
    
    // Description
    document.getElementById('detail-task-description').textContent = task.description;
    
    // Meta info
    document.getElementById('detail-task-status').innerHTML = `<span class="task-status status-${task.status}">${task.status.replace('_', ' ')}</span>`;
    document.getElementById('detail-task-created').textContent = new Date(task.createdAt).toLocaleString();
    document.getElementById('detail-task-updated').textContent = new Date(task.updatedAt).toLocaleString();
    document.getElementById('detail-task-author').textContent = task.authorPubkey 
        ? `${task.authorPubkey.substring(0, 8)}...${task.authorPubkey.substring(task.authorPubkey.length - 4)}` 
        : 'Anonymous';
    
    // Nostr info
    const nostrRow = document.getElementById('detail-nostr-row');
    if (task.nostrEventId) {
        nostrRow.style.display = 'flex';
        document.getElementById('detail-task-nostr').innerHTML = `<a href="https://njump.me/${task.nostrEventId}" target="_blank" class="nostr-link">View on Nostr ⚡</a>`;
    } else {
        nostrRow.style.display = 'none';
    }
    
    // Admin notes
    const notesSection = document.getElementById('detail-admin-notes-section');
    if (task.adminNotes) {
        notesSection.style.display = 'block';
        document.getElementById('detail-admin-notes').textContent = task.adminNotes;
    } else {
        notesSection.style.display = 'none';
    }
    
    // Store current viewing task and load comments
    viewingTaskId = taskId;
    loadComments(taskId);
    
    // Update comment Nostr notice
    const commentNotice = document.getElementById('comment-nostr-notice');
    if (currentPubkey) {
        commentNotice.innerHTML = '<span class="nostr-badge active">⚡</span> Will post to Nostr';
    } else {
        commentNotice.innerHTML = '<span class="nostr-badge">⚡</span> Sign in to post to Nostr';
    }
    
    // Show modal
    document.getElementById('task-detail-modal').classList.add('active');
};

window.closeTaskDetailModal = function() {
    document.getElementById('task-detail-modal').classList.remove('active');
    viewingTaskId = null;
    document.getElementById('comment-input').value = '';
};

// ============================================
// Comments
// ============================================

async function loadComments(taskId) {
    const commentsList = document.getElementById('comments-list');
    const commentCount = document.getElementById('comment-count');
    
    commentsList.innerHTML = '<p class="loading">Loading comments...</p>';
    
    try {
        const response = await fetch(`/api/projects/tasks/${taskId}/comments`);
        const comments = await response.json();
        
        commentCount.textContent = comments.length;
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="text-muted">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => {
            const date = new Date(comment.createdAt).toLocaleString();
            const authorDisplay = comment.authorPubkey 
                ? `${comment.authorPubkey.substring(0, 8)}...` 
                : 'Anonymous';
            const adminBadge = comment.isAdmin ? '<span class="admin-badge-small">ADMIN</span>' : '';
            const nostrIcon = comment.nostrEventId 
                ? `<a href="https://njump.me/${comment.nostrEventId}" target="_blank" class="nostr-indicator" title="View on Nostr">⚡</a>` 
                : '';
            
            return `
                <div class="comment-item ${comment.isAdmin ? 'comment-admin' : ''}">
                    <div class="comment-header">
                        <span class="comment-author">${authorDisplay} ${adminBadge}</span>
                        <span class="comment-date">${date}</span>
                        ${nostrIcon}
                    </div>
                    <p class="comment-content">${escapeHtml(comment.content)}</p>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p class="error">Failed to load comments.</p>';
    }
}

window.submitComment = async function() {
    if (!viewingTaskId) return;
    
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    
    if (!content) {
        alert('Please enter a comment.');
        return;
    }
    
    const btn = document.querySelector('.add-comment-section .btn');
    const btnText = document.getElementById('comment-btn-text');
    
    btn.disabled = true;
    btnText.textContent = 'Posting...';
    
    try {
        let body = { comment: { content } };
        
        // If logged in with Nostr, create and sign an event
        if (currentPubkey && window.nostr) {
            const signedEvent = await createCommentNostrEvent(content);
            if (signedEvent) {
                body.signedEvent = signedEvent;
            }
        }
        
        const response = await fetch(`/api/projects/tasks/${viewingTaskId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to post comment');
        }
        
        // Clear input and reload comments
        input.value = '';
        await loadComments(viewingTaskId);
        
    } catch (error) {
        console.error('Error posting comment:', error);
        alert('Failed to post comment: ' + error.message);
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Post Comment';
    }
};

async function createCommentNostrEvent(content) {
    if (!window.nostr || !currentPubkey || !viewingTaskId) return null;
    
    try {
        const task = allTasks.find(t => t.id === viewingTaskId);
        if (!task) return null;
        
        const projectUrl = `https://pleb.one/projects.html?id=${currentProject.id}`;
        
        // Build content with task reference
        const eventContent = `💬 Comment on: ${task.title}\n\n${content}\n\n🔗 ${projectUrl}`;
        
        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'plebone'],
                ['t', 'comment'],
                ['r', projectUrl],
            ],
            content: eventContent,
            pubkey: currentPubkey,
        };
        
        // If the task has a Nostr event, reply to it
        if (task.nostrEventId) {
            eventTemplate.tags.push(['e', task.nostrEventId, '', 'reply']);
            if (task.authorPubkey) {
                eventTemplate.tags.push(['p', task.authorPubkey]);
            }
        }
        
        const signedEvent = await window.nostr.signEvent(eventTemplate);
        return signedEvent;
        
    } catch (error) {
        console.error('Error creating comment Nostr event:', error);
        return null;
    }
}

// Initialize on load
init();
