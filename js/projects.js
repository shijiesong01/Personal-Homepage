/**
 * 项目集管理系统
 * 处理项目的加载、解析和显示
 */

/**
 * 加载项目文件列表（从简单的文本文件）
 */
async function loadProjectsManifest() {
    try {
        const listPath = './data/projects-list.txt';
        const response = await fetch(listPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        // 解析文本文件，每行一个路径，过滤空行和注释行（以#开头）
        const paths = text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        return { projects: paths };
    } catch (error) {
        console.error('加载项目列表失败:', error);
        return null;
    }
}

/**
 * 从项目文件加载元信息
 * @param {string} path - 项目路径
 */
async function loadProjectMeta(path) {
    try {
        const projectPath = path.startsWith('/') ? path.substring(1) : path;
        const response = await fetch(projectPath);
        const content = await response.text();
        const { frontMatter } = parseFrontMatter(content);
        
        return {
            path: path,
            title: frontMatter.题目 || path.split('/').pop().replace('.md', ''),
            updateTime: frontMatter.更新时间 || '',
            category: frontMatter.分类 || '',
            tags: Array.isArray(frontMatter.标签) ? frontMatter.标签 : (frontMatter.标签 ? [frontMatter.标签] : []),
            intro: frontMatter.引言 || ''
        };
    } catch (error) {
        console.error('加载项目元信息失败:', path, error);
        return null;
    }
}

/**
 * 加载所有项目的元信息
 */
async function loadAllProjectsMeta() {
    const manifest = await loadProjectsManifest();
    if (!manifest) return null;
    
    const projectsPromises = manifest.projects.map(path => loadProjectMeta(path));
    const projectsResults = await Promise.all(projectsPromises);
    
    return {
        projects: projectsResults.filter(meta => meta !== null)
    };
}

/**
 * 加载项目内容
 * @param {string} path - 项目路径
 */
async function loadProject(path) {
    try {
        const projectPath = path.startsWith('/') ? path.substring(1) : path;
        const response = await fetch(projectPath);
        const content = await response.text();
        const { frontMatter, body } = parseFrontMatter(content);
        const html = parseMarkdown(body);
        const { html: htmlWithIds, headings } = extractHeadings(html);
        
        return {
            meta: frontMatter,
            content: htmlWithIds,
            headings: headings
        };
    } catch (error) {
        console.error('加载项目失败:', error);
        return null;
    }
}

/**
 * 构建左侧导航栏（支持文件夹层级）
 * @param {Array} projects - 项目列表
 */
function buildSidebarNavigation(projects) {
    const navigation = {};
    
    projects.forEach(project => {
        const pathParts = project.path.split('/');
        const folder = pathParts.length > 2 ? pathParts[1] : null;
        
        if (folder) {
            if (!navigation[folder]) {
                navigation[folder] = {
                    type: 'folder',
                    name: folder,
                    children: []
                };
            }
            navigation[folder].children.push({
                type: 'file',
                title: project.title,
                path: project.path
            });
        } else {
            if (!navigation['root']) {
                navigation['root'] = [];
            }
            navigation['root'].push({
                type: 'file',
                title: project.title,
                path: project.path
            });
        }
    });
    
    return navigation;
}

/**
 * 渲染左侧导航栏
 * @param {Object} navigation - 导航结构
 * @param {string} containerId - 容器ID
 */
function renderSidebar(navigation, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (navigation['root']) {
        navigation['root'].forEach(item => {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'nav-item nav-file';
            link.textContent = item.title;
            link.dataset.path = item.path;
            link.addEventListener('click', function(e) {
                e.preventDefault();
                loadAndDisplayProject(item.path);
            });
            container.appendChild(link);
        });
    }
    
    Object.keys(navigation).forEach(key => {
        if (key === 'root') return;
        
        const folder = navigation[key];
        const folderTitle = document.createElement('div');
        folderTitle.className = 'nav-folder-title';
        folderTitle.textContent = folder.name;
        container.appendChild(folderTitle);
        
        folder.children.forEach(item => {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'nav-item nav-file nav-file-level2';
            link.textContent = item.title;
            link.dataset.path = item.path;
            link.addEventListener('click', function(e) {
                e.preventDefault();
                loadAndDisplayProject(item.path);
            });
            container.appendChild(link);
        });
    });
}

/**
 * 渲染项目列表（元信息）
 * @param {Array} projects - 项目列表
 * @param {string} containerId - 容器ID
 */
function renderProjectList(projects, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!projects || projects.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">暂无项目</div>';
        return;
    }
    
    // 按分类分组显示
    const groupedProjects = {};
    projects.forEach(project => {
        const category = project.category || '未分类';
        if (!groupedProjects[category]) {
            groupedProjects[category] = [];
        }
        groupedProjects[category].push(project);
    });
    
    Object.keys(groupedProjects).forEach(category => {
        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'article-list-category';
        categoryTitle.textContent = category;
        container.appendChild(categoryTitle);
        
        groupedProjects[category].forEach(project => {
            const card = document.createElement('div');
            card.className = 'article-list-card';
            card.addEventListener('click', function() {
                loadAndDisplayProject(project.path);
            });
            
            card.innerHTML = `
                <div class="article-list-title">${escapeHtmlForProjects(project.title)}</div>
                <div class="article-list-meta">
                    <span class="article-list-time">${escapeHtmlForProjects(project.updateTime)}</span>
                    ${project.tags && project.tags.length > 0 ? `<div class="article-list-tags">${project.tags.map(tag => `<span class="tag">${escapeHtmlForProjects(tag)}</span>`).join('')}</div>` : ''}
                </div>
                <div class="article-list-intro">${escapeHtmlForProjects(project.intro)}</div>
            `;
            
            container.appendChild(card);
        });
    });
}

/**
 * 加载并显示项目（在同一页面更新内容）
 * @param {string} path - 项目路径
 */
async function loadAndDisplayProject(path) {
    const project = await loadProject(path);
    if (!project) {
        console.error('项目加载失败');
        return;
    }
    
    // 更新URL（不刷新页面）
    const url = new URL(window.location);
    url.searchParams.set('path', encodeURIComponent(path));
    window.history.pushState({ path: path }, '', url);
    
    // 渲染项目内容
    const contentContainer = document.getElementById('contentContainer');
    if (contentContainer) {
        contentContainer.innerHTML = project.content;
        document.title = project.meta.题目 || '项目集';
    }
    
    // 渲染目录
    renderTOC(project.headings, 'tocContainer');
}

/**
 * HTML转义辅助函数
 */
function escapeHtmlForProjects(text) {
    if (!text) return '';
    // 如果 markdown.js 中已定义 escapeHtml，使用它
    if (typeof window.escapeHtml === 'function') {
        return window.escapeHtml(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 渲染右侧目录
 * @param {Array} headings - 标题数组
 * @param {string} containerId - 容器ID
 */
function renderTOC(headings, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!headings || headings.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '';
    
    headings.forEach(heading => {
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.className = 'toc-item toc-level-' + heading.level;
        link.textContent = heading.text;
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.getElementById(heading.id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        container.appendChild(link);
    });
}

