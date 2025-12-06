// Projects Portal with Nostr Integration
// Allows users to browse projects, submit bugs/features, and track tasks

let currentProject = null;
let currentPubkey = null;
let allTasks = [];
let currentFilter = 'all';

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
    
    tasksList.innerHTML = filteredTasks.map(task => {
        const typeIcon = getTypeIcon(task.type);
        const statusClass = `status-${task.status}`;
        const statusLabel = task.status.replace('_', ' ');
        const date = new Date(task.createdAt).toLocaleDateString();
        const hasNostr = task.nostrEventId ? '<span class="nostr-indicator" title="Posted to Nostr">⚡</span>' : '';
        
        return `
            <div class="task-item ${statusClass}">
                <div class="task-header">
                    <span class="task-type">${typeIcon}</span>
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    ${hasNostr}
                </div>
                <p class="task-description">${escapeHtml(task.description)}</p>
                <div class="task-meta">
                    <span class="task-status ${statusClass}">${statusLabel}</span>
                    <span class="task-date">${date}</span>
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
        
        // Update UI
        nostrLoginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userPubkey.textContent = `${currentPubkey.substring(0, 8)}...${currentPubkey.substring(currentPubkey.length - 4)}`;
        nostrNotice.innerHTML = '<span class="nostr-badge active">⚡ Nostr</span> Your submission will be posted to Nostr';
        
    } catch (error) {
        console.error('Nostr login error:', error);
        alert('Failed to connect to Nostr extension: ' + error.message);
    }
}

// Handle Nostr logout
function handleNostrLogout() {
    currentPubkey = null;
    nostrLoginBtn.style.display = 'block';
    userInfo.style.display = 'none';
    nostrNotice.innerHTML = '<span class="nostr-badge">⚡ Nostr</span> Sign in to post this to Nostr';
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
        
        // Build content with project reference
        const content = `[${typeLabel}] ${taskData.title}\n\n${taskData.description}\n\n🔗 Project: ${currentProject.name}\n${currentProject.url || currentProject.repository || 'https://pleb.one/projects.html?id=' + currentProject.id}`;
        
        const event = {
            kind: 1, // Regular note
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'plebone'],
                ['t', taskData.type],
                ['t', currentProject.name.toLowerCase().replace(/\s+/g, '-')],
                ['r', currentProject.url || currentProject.repository || `https://pleb.one/projects.html?id=${currentProject.id}`],
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

// Initialize on load
init();
