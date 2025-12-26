// Admin interface with Nostr NIP-07 authentication
import { finalizeEvent, verifyEvent, getPublicKey } from 'https://cdn.jsdelivr.net/npm/nostr-tools@2.17.2/+esm';

let authToken = null;
let currentPubkey = null;
let editingPostId = null;
let editingProjectId = null;
let editingTaskId = null;
let allTasks = [];
let allProjects = [];

// Check for existing session on load
window.addEventListener('load', async () => {
    const savedAuth = localStorage.getItem('plebone_auth');
    const savedPubkey = localStorage.getItem('plebone_pubkey');
    
    if (savedAuth && savedPubkey) {
        authToken = savedAuth;
        currentPubkey = savedPubkey;
        
        // Show admin section
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('admin-pubkey').textContent = `npub: ${savedPubkey.substring(0, 8)}...`;
        
        // Load admin data
        loadBlogPosts();
        loadProjects();
        loadTasks();
        loadNostrSettings();
    }
});

// Check for NIP-07 extension
function checkNostrExtension() {
    if (!window.nostr) {
        alert('No Nostr extension detected. Please install a NIP-07 compatible extension like nos2x or Alby.');
        return false;
    }
    return true;
}

// Sign in with Nostr
document.getElementById('login-btn').addEventListener('click', async () => {
    if (!checkNostrExtension()) return;
    
    const statusEl = document.getElementById('login-status');
    statusEl.textContent = 'Requesting signature...';
    
    try {
        // Get public key
        const pubkey = await window.nostr.getPublicKey();
        currentPubkey = pubkey;
        
        // Create an auth event
        const event = {
            kind: 22242, // Custom kind for auth
            created_at: Math.floor(Date.now() / 1000),
            tags: [['challenge', 'admin-login']],
            content: 'Authenticate to PlebOne admin',
            pubkey: pubkey
        };
        
        // Sign the event
        const signedEvent = await window.nostr.signEvent(event);
        
        // Store the signed event as auth token
        authToken = JSON.stringify(signedEvent);
        
        // Save to localStorage
        localStorage.setItem('plebone_auth', authToken);
        localStorage.setItem('plebone_pubkey', pubkey);
        
        // Show admin section
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('admin-pubkey').textContent = `npub: ${pubkey.substring(0, 8)}...`;
        
        // Load admin data
        loadBlogPosts();
        loadProjects();
        loadTasks();
        loadNostrSettings();
        
    } catch (error) {
        console.error('Login error:', error);
        statusEl.textContent = 'Authentication failed: ' + error.message;
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    authToken = null;
    currentPubkey = null;
    localStorage.removeItem('plebone_auth');
    localStorage.removeItem('plebone_pubkey');
    document.getElementById('admin-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('login-status').textContent = '';
});

// API helper with auth
async function apiRequest(url, options = {}) {
    if (!authToken) {
        throw new Error('Not authenticated');
    }
    
    // Check if token is expired (older than 4 minutes)
    try {
        const event = JSON.parse(authToken);
        const now = Math.floor(Date.now() / 1000);
        if (now - event.created_at > 240) { // 4 minutes
            console.log('Auth token expired, refreshing...');
            if (window.nostr) {
                const newEvent = {
                    kind: 22242,
                    created_at: now,
                    tags: [['challenge', 'admin-login']],
                    content: 'Authenticate to PlebOne admin',
                    pubkey: currentPubkey
                };
                const signedEvent = await window.nostr.signEvent(newEvent);
                authToken = JSON.stringify(signedEvent);
                localStorage.setItem('plebone_auth', authToken);
            }
        }
    } catch (e) {
        console.error('Error checking/refreshing token:', e);
    }
    
    const headers = {
        'Authorization': `Nostr ${authToken}`,
        ...options.headers
    };

    // Don't set Content-Type if body is FormData (for file uploads)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
}

// Blog Posts Management
async function loadBlogPosts() {
    const listEl = document.getElementById('posts-list');
    
    try {
        const posts = await apiRequest('/api/admin/blog');
        
        if (posts.length === 0) {
            listEl.innerHTML = '<p class="text-muted">No posts yet.</p>';
            return;
        }
        
        listEl.innerHTML = posts.map(post => {
            const date = new Date(post.createdAt).toISOString().split('T')[0];
            const status = post.published ? 
                '<span class="status-badge status-published">PUBLISHED</span>' :
                '<span class="status-badge status-draft">DRAFT</span>';
            const tags = post.tags && post.tags.length > 0 ? 
                `<div class="admin-item-meta" style="margin-top: 0.25rem;">Tags: ${post.tags.join(', ')}</div>` : '';
            
            return `
                <div class="admin-item">
                    <div class="admin-item-content">
                        <div class="admin-item-title">${escapeHtml(post.title)} ${status}</div>
                        <div class="admin-item-meta">${date} | ID: ${post.id.substring(0, 8)}...</div>
                        ${tags}
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn btn-secondary" onclick="editPost('${post.id}')">EDIT</button>
                        <button class="btn btn-danger" onclick="deletePost('${post.id}')">DELETE</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading posts:', error);
        listEl.innerHTML = '<p class="error">Failed to load posts: ' + error.message + '</p>';
    }
}

// Projects Management
async function loadProjects() {
    const listEl = document.getElementById('admin-projects-list');
    
    try {
        const projects = await apiRequest('/api/admin/projects');
        
        if (projects.length === 0) {
            listEl.innerHTML = '<p class="text-muted">No projects yet.</p>';
            return;
        }
        
        listEl.innerHTML = projects.map(project => {
            const status = project.active ? 
                '<span class="status-badge status-published">ACTIVE</span>' :
                '<span class="status-badge status-draft">INACTIVE</span>';
            
            return `
                <div class="admin-item">
                    <div class="admin-item-content">
                        <div class="admin-item-title">${escapeHtml(project.name)} ${status}</div>
                        <div class="admin-item-meta">${escapeHtml(project.description.substring(0, 100))}...</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn btn-secondary" onclick="editProject('${project.id}')">EDIT</button>
                        <button class="btn btn-danger" onclick="deleteProject('${project.id}')">DELETE</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        listEl.innerHTML = '<p class="error">Failed to load projects: ' + error.message + '</p>';
    }
}

// Post Modal Management
document.getElementById('new-post-btn').addEventListener('click', () => {
    editingPostId = null;
    document.getElementById('post-modal-title').textContent = 'NEW POST';
    document.getElementById('post-form').reset();
    document.getElementById('post-modal').classList.add('active');
});

document.getElementById('close-post-modal').addEventListener('click', closePostModal);
document.getElementById('cancel-post-btn').addEventListener('click', closePostModal);

function closePostModal() {
    document.getElementById('post-modal').classList.remove('active');
    editingPostId = null;
}

window.editPost = async function(id) {
    try {
        const posts = await apiRequest('/api/admin/blog');
        const post = posts.find(p => p.id === id);
        
        if (!post) return;
        
        editingPostId = id;
        document.getElementById('post-modal-title').textContent = 'EDIT POST';
        document.getElementById('post-title').value = post.title;
        document.getElementById('post-tags').value = post.tags ? post.tags.join(', ') : '';
        document.getElementById('post-content').value = post.content;
        document.getElementById('post-published').checked = post.published;
        document.getElementById('post-modal').classList.add('active');
    } catch (error) {
        alert('Failed to load post: ' + error.message);
    }
};

window.deletePost = async function(id) {
    if (!confirm('Delete this post?')) return;
    
    try {
        await apiRequest(`/api/admin/blog/${id}`, { method: 'DELETE' });
        loadBlogPosts();
    } catch (error) {
        alert('Failed to delete post: ' + error.message);
    }
};

document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tagsInput = document.getElementById('post-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    
    const data = {
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        tags: tags.length > 0 ? tags : undefined,
        published: document.getElementById('post-published').checked
    };
    
    try {
        let savedPost;
        const isUpdate = !!editingPostId;
        
        if (editingPostId) {
            savedPost = await apiRequest(`/api/admin/blog/${editingPostId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            savedPost = await apiRequest('/api/admin/blog', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        // Publish to Nostr if published
        if (data.published && window.nostr) {
            try {
                await publishToNostr(savedPost, isUpdate);
            } catch (error) {
                console.error('Failed to publish to Nostr:', error);
                // Don't fail the whole operation if Nostr publishing fails
            }
        }
        
        closePostModal();
        loadBlogPosts();
    } catch (error) {
        alert('Failed to save post: ' + error.message);
    }
});

// Image Upload
document.getElementById('upload-image-btn').addEventListener('click', () => {
    document.getElementById('post-image-upload').click();
});

document.getElementById('post-image-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    const btn = document.getElementById('upload-image-btn');
    const originalText = btn.textContent;
    btn.textContent = 'UPLOADING...';
    btn.disabled = true;
    
    try {
        const result = await apiRequest('/api/admin/upload', {
            method: 'POST',
            body: formData
        });
        
        const textarea = document.getElementById('post-content');
        const imageMarkdown = `\n![Image description](${result.url})\n`;
        
        // Insert at cursor position
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, startPos)
            + imageMarkdown
            + textarea.value.substring(endPos, textarea.value.length);
            
        // Reset file input
        e.target.value = '';
    } catch (error) {
        alert('Failed to upload image: ' + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Project Modal Management
document.getElementById('new-project-btn').addEventListener('click', () => {
    editingProjectId = null;
    document.getElementById('project-modal-title').textContent = 'NEW PROJECT';
    document.getElementById('project-form').reset();
    document.getElementById('project-modal').classList.add('active');
});

document.getElementById('close-project-modal').addEventListener('click', closeProjectModal);
document.getElementById('cancel-project-btn').addEventListener('click', closeProjectModal);

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
    editingProjectId = null;
}

window.editProject = async function(id) {
    try {
        const projects = await apiRequest('/api/admin/projects');
        const project = projects.find(p => p.id === id);
        
        if (!project) return;
        
        editingProjectId = id;
        document.getElementById('project-modal-title').textContent = 'EDIT PROJECT';
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-description').value = project.description;
        document.getElementById('project-url').value = project.url || '';
        document.getElementById('project-repository').value = project.repository || '';
        document.getElementById('project-active').checked = project.active;
        document.getElementById('project-modal').classList.add('active');
    } catch (error) {
        alert('Failed to load project: ' + error.message);
    }
};

window.deleteProject = async function(id) {
    if (!confirm('Delete this project?')) return;
    
    try {
        await apiRequest(`/api/admin/projects/${id}`, { method: 'DELETE' });
        loadProjects();
    } catch (error) {
        alert('Failed to delete project: ' + error.message);
    }
};

document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('project-name').value,
        description: document.getElementById('project-description').value,
        url: document.getElementById('project-url').value || undefined,
        repository: document.getElementById('project-repository').value || undefined,
        active: document.getElementById('project-active').checked
    };
    
    try {
        if (editingProjectId) {
            await apiRequest(`/api/admin/projects/${editingProjectId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            await apiRequest('/api/admin/projects', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        closeProjectModal();
        loadProjects();
    } catch (error) {
        alert('Failed to save project: ' + error.message);
    }
});

// Task Management
async function loadTasks() {
    const listEl = document.getElementById('admin-tasks-list');
    const projectFilter = document.getElementById('task-project-filter');
    
    try {
        // Load tasks
        allTasks = await apiRequest('/api/admin/tasks');
        
        // Populate project filter if not already done
        if (projectFilter.options.length <= 1) {
            const projects = await apiRequest('/api/admin/projects');
            allProjects = projects;
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                projectFilter.appendChild(opt);
            });
        }
        
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        listEl.innerHTML = '<p class="error">Failed to load tasks: ' + error.message + '</p>';
    }
}

function renderTasks() {
    const listEl = document.getElementById('admin-tasks-list');
    const projectFilterValue = document.getElementById('task-project-filter').value;
    const statusFilterValue = document.getElementById('task-status-filter').value;
    
    let filteredTasks = allTasks;
    
    if (projectFilterValue) {
        filteredTasks = filteredTasks.filter(t => t.projectId === projectFilterValue);
    }
    
    if (statusFilterValue) {
        filteredTasks = filteredTasks.filter(t => t.status === statusFilterValue);
    }
    
    if (filteredTasks.length === 0) {
        listEl.innerHTML = '<p class="text-muted">No tasks found.</p>';
        return;
    }
    
    listEl.innerHTML = filteredTasks.map(task => {
        const date = new Date(task.createdAt).toISOString().split('T')[0];
        const typeIcon = task.type === 'bug' ? '🐛' : task.type === 'feature' ? '✨' : '📋';
        const statusClass = `status-${task.status}`;
        const statusLabel = task.status.replace('_', ' ').toUpperCase();
        const nostrBadge = task.nostrEventId ? '<span class="nostr-indicator" title="Has Nostr event">⚡</span>' : '';
        
        return `
            <div class="admin-item task-item-admin ${statusClass}">
                <div class="admin-item-content">
                    <div class="admin-item-title">
                        ${typeIcon} ${escapeHtml(task.title)} ${nostrBadge}
                        <span class="status-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="admin-item-meta">
                        ${task.projectName || 'Unknown Project'} | ${date} | 
                        ${task.authorPubkey ? `Author: ${task.authorPubkey.substring(0, 8)}...` : 'Anonymous'}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn btn-secondary" onclick="editTask('${task.id}')">MANAGE</button>
                </div>
            </div>
        `;
    }).join('');
}

// Task filter event listeners
document.getElementById('task-project-filter')?.addEventListener('change', renderTasks);
document.getElementById('task-status-filter')?.addEventListener('change', renderTasks);

// Task Modal
document.getElementById('close-task-modal')?.addEventListener('click', closeTaskModal);
document.getElementById('cancel-task-btn')?.addEventListener('click', closeTaskModal);

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
    editingTaskId = null;
}

window.editTask = async function(id) {
    try {
        const task = allTasks.find(t => t.id === id);
        if (!task) return;
        
        editingTaskId = id;
        document.getElementById('task-modal-title').textContent = 'MANAGE TASK';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-project-name').value = task.projectName || 'Unknown';
        document.getElementById('task-type-display').value = task.type.toUpperCase();
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description;
        document.getElementById('task-author').value = task.authorPubkey || 'Anonymous';
        document.getElementById('task-nostr-event').value = task.nostrEventId || 'None';
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-admin-notes').value = task.adminNotes || '';
        document.getElementById('task-reply-nostr').checked = false;
        
        // Show/hide Nostr reply option based on whether task has event
        const nostrCheckbox = document.getElementById('task-reply-nostr').parentElement;
        nostrCheckbox.style.display = task.nostrEventId ? 'block' : 'none';
        
        document.getElementById('task-modal').classList.add('active');
    } catch (error) {
        alert('Failed to load task: ' + error.message);
    }
};

document.getElementById('delete-task-btn')?.addEventListener('click', async () => {
    if (!editingTaskId) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await apiRequest(`/api/admin/tasks/${editingTaskId}`, { method: 'DELETE' });
        closeTaskModal();
        loadTasks();
    } catch (error) {
        alert('Failed to delete task: ' + error.message);
    }
});

document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!editingTaskId) return;
    
    const status = document.getElementById('task-status').value;
    const adminNotes = document.getElementById('task-admin-notes').value;
    const shouldReplyNostr = document.getElementById('task-reply-nostr').checked;
    
    try {
        // Update task status
        await apiRequest(`/api/admin/tasks/${editingTaskId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, adminNotes })
        });
        
        // If should reply to Nostr, create and sign a reply event
        if (shouldReplyNostr) {
            const task = allTasks.find(t => t.id === editingTaskId);
            if (task && task.nostrEventId && task.authorPubkey && window.nostr) {
                await publishTaskReplyToNostr(task, status, adminNotes);
            }
        }
        
        closeTaskModal();
        loadTasks();
        alert('Task updated successfully!');
    } catch (error) {
        alert('Failed to update task: ' + error.message);
    }
});

async function publishTaskReplyToNostr(task, status, adminNotes) {
    if (!window.nostr || !currentPubkey) return;
    
    try {
        const statusLabel = status.replace('_', ' ');
        let content = `📋 Task Update: ${task.title}\n\nStatus: ${statusLabel.toUpperCase()}`;
        
        if (adminNotes) {
            content += `\n\nNotes: ${adminNotes}`;
        }
        
        content += `\n\n🔗 https://pleb.one/projects.html?id=${task.projectId}`;
        
        // Create reply event with proper tags
        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['e', task.nostrEventId, '', 'reply'], // Reply to original event
                ['p', task.authorPubkey], // Tag the original author
                ['t', 'plebone'],
                ['t', 'task-update'],
            ],
            content: content,
        };
        
        // Sign with NIP-07
        const signedEvent = await window.nostr.signEvent(eventTemplate);
        
        // Publish via server
        await apiRequest(`/api/admin/tasks/${task.id}/reply-nostr`, {
            method: 'POST',
            body: JSON.stringify({ signedEvent })
        });
        
        console.log('Task reply published to Nostr');
    } catch (error) {
        console.error('Error publishing task reply to Nostr:', error);
        // Don't throw - this is optional functionality
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Nostr Settings Management
async function loadNostrSettings() {
    try {
        // Load relays
        const relaysResponse = await apiRequest('/api/admin/settings/nostr-relays');
        if (relaysResponse.relays) {
            document.getElementById('nostr-relays').value = relaysResponse.relays.join('\n');
        }
    } catch (error) {
        console.error('Error loading Nostr settings:', error);
    }
}

document.getElementById('save-relays-btn').addEventListener('click', async () => {
    const relaysText = document.getElementById('nostr-relays').value;
    const relays = relaysText.split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0 && r.startsWith('wss://'));

    if (relays.length === 0) {
        alert('Please enter at least one valid relay URL (wss://...)');
        return;
    }

    try {
        await apiRequest('/api/admin/settings/nostr-relays', {
            method: 'POST',
            body: JSON.stringify({ relays }),
        });
        alert('Relays saved successfully!');
    } catch (error) {
        alert('Failed to save relays: ' + error.message);
    }
});

// Publish blog post to Nostr
async function publishToNostr(post, isUpdate = false) {
    if (!window.nostr) {
        console.log('No Nostr extension available, skipping Nostr publishing');
        return;
    }

    try {
        // Generate identifier from title
        const identifier = post.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const title = isUpdate ? `${post.title} - Updated` : post.title;
        const publishedAt = Math.floor(new Date(post.createdAt).getTime() / 1000);

        // Create NIP-23 long-form content event template
        const eventTemplate = {
            kind: 30023,
            created_at: publishedAt,
            tags: [
                ['d', identifier],
                ['title', title],
                ['published_at', String(publishedAt)],
                ['summary', post.content.substring(0, 200) + '...'],
                ...(post.tags || []).map(tag => ['t', tag.toLowerCase()]),
            ],
            content: post.content,
        };

        // Sign with NIP-07
        const signedEvent = await window.nostr.signEvent(eventTemplate);

        // Send to server to publish to relays
        await apiRequest(`/api/admin/blog/${post.id}/publish-nostr`, {
            method: 'POST',
            body: JSON.stringify({ signedEvent }),
        });

        console.log('Published to Nostr successfully');
    } catch (error) {
        console.error('Error publishing to Nostr:', error);
        throw error;
    }
}

