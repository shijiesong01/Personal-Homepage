/**
 * 知识库管理系统
 * 处理知识库文章的加载、解析和显示
 */

/**
 * 加载文章文件列表（从简单的文本文件）
 */
async function loadKnowledgeManifest() {
    try {
        const listPath = './data/knowledge-list.txt';
        const response = await fetch(listPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        // 解析文本文件，每行一个路径，过滤空行和注释行（以#开头）
        const paths = text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        return { knowledge: paths };
    } catch (error) {
        console.error('加载知识库列表失败:', error);
        return null;
    }
}

/**
 * 从文章文件加载元信息
 * @param {string} path - 文章路径
 */
async function loadKnowledgeMeta(path) {
    try {
        const articlePath = path.startsWith('/') ? path.substring(1) : path;
        const response = await fetch(articlePath);
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
        console.error('加载知识库元信息失败:', path, error);
        return null;
    }
}

/**
 * 加载所有知识库文章的元信息
 */
async function loadAllKnowledgeMeta() {
    const manifest = await loadKnowledgeManifest();
    if (!manifest) return null;
    
    const knowledgePromises = manifest.knowledge.map(path => loadKnowledgeMeta(path));
    const knowledgeResults = await Promise.all(knowledgePromises);
    
    return knowledgeResults.filter(meta => meta !== null);
}

/**
 * 加载知识库文章内容
 * @param {string} path - 文章路径
 */
async function loadKnowledgeArticle(path) {
    try {
        const articlePath = path.startsWith('/') ? path.substring(1) : path;
        const response = await fetch(articlePath);
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
        console.error('加载知识库文章失败:', error);
        return null;
    }
}

/**
 * 构建左侧导航栏（支持文件夹层级）
 * @param {Array} articles - 文章列表
 */
function buildKnowledgeSidebarNavigation(articles) {
    const navigation = {};
    
    articles.forEach(article => {
        const pathParts = article.path.split('/');
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
                title: article.title,
                path: article.path
            });
        } else {
            if (!navigation['root']) {
                navigation['root'] = [];
            }
            navigation['root'].push({
                type: 'file',
                title: article.title,
                path: article.path
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
function renderKnowledgeSidebar(navigation, containerId) {
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
                loadAndDisplayKnowledgeArticle(item.path);
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
                loadAndDisplayKnowledgeArticle(item.path);
            });
            container.appendChild(link);
        });
    });
}

/**
 * 渲染文章列表（元信息）
 * @param {Array} articles - 文章列表
 * @param {string} containerId - 容器ID
 */
function renderKnowledgeArticleList(articles, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!articles || articles.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">暂无文章</div>';
        return;
    }
    
    // 按分类分组显示
    const groupedArticles = {};
    articles.forEach(article => {
        const category = article.category || '未分类';
        if (!groupedArticles[category]) {
            groupedArticles[category] = [];
        }
        groupedArticles[category].push(article);
    });
    
    Object.keys(groupedArticles).forEach(category => {
        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'article-list-category';
        categoryTitle.textContent = category;
        container.appendChild(categoryTitle);
        
        groupedArticles[category].forEach(article => {
            const card = document.createElement('div');
            card.className = 'article-list-card';
            card.addEventListener('click', function() {
                loadAndDisplayKnowledgeArticle(article.path);
            });
            
            card.innerHTML = `
                <div class="article-list-title">${escapeHtmlForKnowledge(article.title)}</div>
                <div class="article-list-meta">
                    <span class="article-list-time">${escapeHtmlForKnowledge(article.updateTime)}</span>
                    ${article.tags && article.tags.length > 0 ? `<div class="article-list-tags">${article.tags.map(tag => `<span class="tag">${escapeHtmlForKnowledge(tag)}</span>`).join('')}</div>` : ''}
                </div>
                <div class="article-list-intro">${escapeHtmlForKnowledge(article.intro)}</div>
            `;
            
            container.appendChild(card);
        });
    });
}

/**
 * 加载并显示知识库文章（在同一页面更新内容）
 * @param {string} path - 文章路径
 */
async function loadAndDisplayKnowledgeArticle(path) {
    const article = await loadKnowledgeArticle(path);
    if (!article) {
        console.error('文章加载失败');
        return;
    }
    
    // 更新URL（不刷新页面）
    const url = new URL(window.location);
    url.searchParams.set('path', encodeURIComponent(path));
    window.history.pushState({ path: path }, '', url);
    
    // 渲染文章内容
    const contentContainer = document.getElementById('contentContainer');
    if (contentContainer) {
        contentContainer.innerHTML = article.content;
        document.title = article.meta.题目 || '知识库';
    }
    
    // 渲染目录
    renderKnowledgeTOC(article.headings, 'tocContainer');
}

/**
 * 渲染右侧目录
 * @param {Array} headings - 标题数组
 * @param {string} containerId - 容器ID
 */
function renderKnowledgeTOC(headings, containerId) {
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

/**
 * HTML转义辅助函数
 */
function escapeHtmlForKnowledge(text) {
    if (!text) return '';
    // 如果 markdown.js 中已定义 escapeHtml，使用它
    if (typeof window.escapeHtml === 'function') {
        return window.escapeHtml(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

