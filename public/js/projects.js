// Projects listing page
async function loadProjects() {
    const projectsList = document.getElementById('projects-list');
    
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        if (projects.length === 0) {
            projectsList.innerHTML = '<p class="text-muted">No projects yet.</p>';
            return;
        }
        
        projectsList.innerHTML = projects.map(project => `
            <div class="project-item">
                <h2 class="project-name">${escapeHtml(project.name)}</h2>
                <p class="project-description">${escapeHtml(project.description)}</p>
                <div class="project-links">
                    ${project.url ? `<a href="${escapeHtml(project.url)}" target="_blank" class="project-link">&gt; Visit Project</a>` : ''}
                    ${project.repository ? `<a href="${escapeHtml(project.repository)}" target="_blank" class="project-link">&gt; Source Code</a>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        projectsList.innerHTML = '<p class="error">Failed to load projects.</p>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadProjects();
