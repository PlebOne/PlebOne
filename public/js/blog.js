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
            const tagsHtml = post.tags && post.tags.length > 0 ? 
                post.tags.map(tag => 
                    `<a href="/blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag" onclick="event.stopPropagation()">${escapeHtml(tag)}</a>`
                ).join('') : '';

            // Prefer the new `content` field; fall back to any legacy `body`
            const rawContent = post.content ?? post.body ?? '';
            let excerpt = '';
            if (rawContent) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = rawContent;
                const plainText = tempDiv.textContent || tempDiv.innerText || '';
                excerpt = plainText.trim().length > 0 ? plainText.trim().slice(0, 220) : '';
                if (excerpt.length === 220) {
                    excerpt = `${excerpt}...`;
                }
            }
            
            return `
                <article class="blog-post-card">
                    <h2 class="blog-post-title">
                        <a href="/post.html?id=${post.id}">${escapeHtml(post.title)}</a>
                    </h2>
                    <div class="blog-post-meta">
                        <span class="blog-post-date">${date}</span>
                        ${tagsHtml ? `<div class="blog-post-tags">${tagsHtml}</div>` : ''}
                    </div>
                    ${excerpt ? `<p class="blog-post-excerpt">${escapeHtml(excerpt)}</p>` : ''}
                    <a href="/post.html?id=${post.id}" class="blog-read-more">Read More →</a>
                </article>
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
