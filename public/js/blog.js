// Blog listing page
async function loadBlogPosts() {
    const blogList = document.getElementById('blog-list');
    const urlParams = new URLSearchParams(window.location.search);
    const filterTag = urlParams.get('tag');
    
    try {
        const url = filterTag ? `/api/blog?tag=${encodeURIComponent(filterTag)}` : '/api/blog';
        const response = await fetch(url);
        const posts = await response.json();
        
        if (posts.length === 0) {
            blogList.innerHTML = filterTag ? 
                `<p class="text-muted">No posts with tag "${escapeHtml(filterTag)}".</p>` :
                '<p class="text-muted">No posts yet.</p>';
            return;
        }
        
        let html = '';
        
        if (filterTag) {
            html += `<div style="margin-bottom: 2rem;">
                <span class="text-muted">Filtered by tag: ${escapeHtml(filterTag)}</span>
                <a href="/blog.html" style="margin-left: 1rem; color: var(--accent);">Clear filter</a>
            </div>`;
        }
        
        html += posts.map(post => {
            const date = new Date(post.createdAt).toISOString().split('T')[0];
            const tags = post.tags && post.tags.length > 0 ? 
                `<span class="blog-tags">${post.tags.map(tag => 
                    `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag">${escapeHtml(tag)}</a>`
                ).join('')}</span>` : '';
            
            return `
                <a href="/post.html?id=${post.id}" class="blog-item">
                    <span class="blog-date">${date}</span>
                    <span class="blog-title-with-tags">
                        <span class="blog-title">${escapeHtml(post.title)}</span>
                        ${tags}
                    </span>
                </a>
            `;
        }).join('');
        
        blogList.innerHTML = html;
    } catch (error) {
        console.error('Error loading posts:', error);
        blogList.innerHTML = '<p class="error">Failed to load blog posts.</p>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadBlogPosts();
