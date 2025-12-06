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

        // Build a plain-text excerpt for metadata
    const excerpt = buildExcerpt(html) || 'Read the latest article from Pleb.One.';
        updatePageMetadata(post.title, excerpt);
        
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

function buildExcerpt(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const plainText = temp.textContent || temp.innerText || '';
    const collapsed = plainText.trim().replace(/\s+/g, ' ');
    if (collapsed.length <= 180) {
        return collapsed;
    }
    return `${collapsed.slice(0, 177)}...`;
}

function updatePageMetadata(title, description) {
    const pageTitle = `${title} - Pleb.One`;
    document.title = pageTitle;

    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:url"]', window.location.href);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
}

function setMetaContent(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        element.setAttribute('content', value);
    }
}

loadPost();
