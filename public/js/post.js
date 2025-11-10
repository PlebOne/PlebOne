// Individual blog post page
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@11.1.1/+esm';

async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    const postContent = document.getElementById('post-content');
    
    if (!postId) {
        postContent.innerHTML = '<p class="error">No post ID specified.</p>';
        return;
    }
    
    try {
        const response = await fetch(`/api/blog/${postId}`);
        
        if (!response.ok) {
            throw new Error('Post not found');
        }
        
        const post = await response.json();
        const date = new Date(post.createdAt).toISOString().split('T')[0];
        
        // Render markdown
        const html = marked.parse(post.content);
        
        const tags = post.tags && post.tags.length > 0 ? 
            `<div class="post-tags">${post.tags.map(tag => 
                `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="post-tag">${escapeHtml(tag)}</a>`
            ).join('')}</div>` : '';
        
        postContent.innerHTML = `
            <h1 class="post-title">${escapeHtml(post.title)}</h1>
            <div class="post-meta">${date}</div>
            ${tags}
            <div class="post-body">${html}</div>
        `;
    } catch (error) {
        console.error('Error loading post:', error);
        postContent.innerHTML = '<p class="error">Failed to load blog post.</p>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadPost();
