// Admin interface with Nostr NIP-07 authentication
import { finalizeEvent, verifyEvent, getPublicKey } from 'https://cdn.jsdelivr.net/npm/nostr-tools@2.7.0/+esm';

let authToken = null;
let currentPubkey = null;
let editingPostId = null;
let editingProjectId = null;

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
        
        // Show admin section
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('admin-pubkey').textContent = `npub: ${pubkey.substring(0, 8)}...`;
        
        // Load admin data
        loadBlogPosts();
        loadProjects();
        
    } catch (error) {
        console.error('Login error:', error);
        statusEl.textContent = 'Authentication failed: ' + error.message;
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    authToken = null;
    currentPubkey = null;
    document.getElementById('admin-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('login-status').textContent = '';
});

// API helper with auth
async function apiRequest(url, options = {}) {
    if (!authToken) {
        throw new Error('Not authenticated');
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
        if (editingPostId) {
            await apiRequest(`/api/admin/blog/${editingPostId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            await apiRequest('/api/admin/blog', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        closePostModal();
        loadBlogPosts();
    } catch (error) {
        alert('Failed to save post: ' + error.message);
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
