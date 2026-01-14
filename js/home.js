/**
 * 主页（index.html）逻辑
 * - 从 data/knowledge-show.txt 与 data/projects-show.txt 读取“展示卡片”配置
 * - 渲染为紧凑卡片：题目一行 / 元信息一行 / 引言一行
 *
 * show.txt 格式（每个卡片一个块，块之间空行分隔；支持 # 注释）：
 * 题目: xxx
 * 更新时间: 2026-01-14
 * 类别: xxx
 * 标签: a, b, c   (可选)
 * 内容: xxx
 * 链接: 知识库/xxx.md   (也可直接写完整URL，如 knowledge.html?path=...)
 */

(function() {
    function safeEscape(text) {
        if (!text) return '';
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function splitTags(raw) {
        if (!raw) return [];
        return String(raw)
            .split(/[,，、;；]/g)
            .map(s => s.trim())
            .filter(Boolean);
    }

    function parseShowText(text) {
        const lines = String(text || '').replace(/\r/g, '').split('\n');
        const cards = [];
        let current = {};

        function flush() {
            if (!current || Object.keys(current).length === 0) return;
            // 兼容字段：内容/引言都可作为卡片第三行
            const intro = current.内容 || current.引言 || '';
            cards.push({
                title: current.题目 || '',
                updateTime: current.更新时间 || '',
                category: current.类别 || current.分类 || '',
                tags: splitTags(current.标签 || ''),
                intro,
                link: current.链接 || ''
            });
            current = {};
        }

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
                flush();
                continue;
            }
            if (line.startsWith('#')) continue;

            const idx = line.indexOf(':');
            if (idx <= 0) continue;

            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            current[key] = value;
        }
        flush();

        return cards.filter(c => c.title || c.link);
    }

    async function loadShowCards(filePath) {
        const res = await fetch(filePath);
        if (!res.ok) return [];
        const text = await res.text();
        return parseShowText(text);
    }

    function buildHref(type, link) {
        const raw = String(link || '').trim();
        if (!raw) return '#';

        // 如果已经是完整链接（指向页面），直接用
        if (raw.includes('.html')) return raw;

        // 否则认为是 md 文件路径
        const encoded = encodeURIComponent(raw);
        return type === 'knowledge'
            ? `knowledge.html?path=${encoded}`
            : `projects.html?path=${encoded}`;
    }

    function metaLinePieces(card) {
        const pieces = [];
        if (card.updateTime) pieces.push(card.updateTime);
        if (card.category) pieces.push(card.category);
        if (card.tags && card.tags.length > 0) pieces.push(card.tags.join('、'));
        return pieces;
    }

    function renderCards(containerId, cards, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (!cards || cards.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: #999;">暂无内容</div>';
            return;
        }

        cards.forEach(card => {
            const a = document.createElement('a');
            a.className = 'article-card';
            a.href = buildHref(type, card.link);

            const metaPieces = metaLinePieces(card).map(safeEscape);
            const metaHtml = metaPieces.length > 0
                ? `<div class="article-card-meta">${metaPieces.join('<span class="meta-sep">·</span>')}</div>`
                : `<div class="article-card-meta"></div>`;

            a.innerHTML = `
                <div class="article-card-title">${safeEscape(card.title)}</div>
                ${metaHtml}
                <div class="article-card-intro">${safeEscape(card.intro || '')}</div>
            `;

            container.appendChild(a);
        });
    }

    async function initIndexPage() {
        try {
            const [knowledgeCards, projectCards] = await Promise.all([
                loadShowCards('./data/knowledge-show.txt'),
                loadShowCards('./data/projects-show.txt')
            ]);

            renderCards('knowledgeArticles', knowledgeCards, 'knowledge');
            renderCards('projectsArticles', projectCards, 'projects');
        } catch (e) {
            console.error('主页卡片加载失败:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        // 仅在 index.html 需要：存在这两个容器时才初始化
        const hasHome = document.getElementById('knowledgeArticles') && document.getElementById('projectsArticles');
        if (hasHome) initIndexPage();
    });
})();


