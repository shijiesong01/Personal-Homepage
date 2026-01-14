/**
 * 简单的Markdown解析器
 * 纯原生JavaScript实现，支持基本的Markdown语法
 */

/**
 * 解析Markdown文本为HTML
 * @param {string} markdown - Markdown文本
 * @returns {string} HTML字符串
 */
function parseMarkdown(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // 保存代码块
    const codeBlocks = [];
    html = html.replace(/```[\s\S]*?```/g, function(match) {
        const placeholder = '___CODE_BLOCK_' + codeBlocks.length + '___';
        codeBlocks.push(match);
        return placeholder;
    });
    
    // 行内代码（在代码块占位符之外）
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // 恢复代码块
    codeBlocks.forEach(function(codeBlock, index) {
        const code = codeBlock.replace(/```/g, '').trim();
        html = html.replace('___CODE_BLOCK_' + index + '___', '<pre><code>' + escapeHtml(code) + '</code></pre>');
    });
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 粗体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // 斜体
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1">');
    
    // 列表（无序列表）- 在代码块占位符之外处理
    html = html.replace(/^(\*|-) (.+)$/gim, function(match, marker, content) {
        if (match.includes('___CODE_BLOCK_')) return match;
        return '<li>' + content + '</li>';
    });
    html = html.replace(/^\+ (.+)$/gim, function(match, content) {
        if (match.includes('___CODE_BLOCK_')) return match;
        return '<li>' + content + '</li>';
    });
    
    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gim, function(match, content) {
        if (match.includes('___CODE_BLOCK_')) return match;
        return '<li>' + content + '</li>';
    });
    
    // 将连续的li包裹在ul中
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>)/g, function(match, p1, p2) {
        if (!match.includes('<ul>')) {
            return '<ul>' + p1 + p2;
        }
        return match;
    });
    html = html.replace(/(<\/li>)(\s*)(?!<li>|<\/ul>)/g, function(match, p1, p2) {
        if (match.includes('</ul>')) return match;
        return p1 + '</ul>' + p2;
    });
    
    // 段落（将连续的行合并为段落）
    const lines = html.split('\n');
    const paragraphs = [];
    let currentPara = [];
    
    lines.forEach(function(line) {
        line = line.trim();
        if (!line) {
            if (currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [];
            }
            return;
        }
        if (line.match(/^<(h[1-6]|ul|ol|li|pre|code)/)) {
            if (currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [];
            }
            paragraphs.push(line);
            return;
        }
        currentPara.push(line);
    });
    
    if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
    }
    
    html = paragraphs.map(function(para) {
        if (para.match(/^<(h[1-6]|ul|ol|li|pre|code)/)) {
            return para;
        }
        if (!para) return '';
        return '<p>' + para + '</p>';
    }).join('\n');
    
    // 换行
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 将 escapeHtml 暴露到全局作用域，供其他模块使用
window.escapeHtml = escapeHtml;

/**
 * 解析Front Matter（YAML格式的元数据）
 * @param {string} content - 文件内容
 * @returns {Object} {frontMatter: Object, body: string}
 */
function parseFrontMatter(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
        return { frontMatter: {}, body: content };
    }
    
    const frontMatterText = match[1];
    const body = match[2];
    const frontMatter = {};
    
    // 简单解析YAML格式
    frontMatterText.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            // 移除引号
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            // 处理数组（标签）
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
            }
            frontMatter[key] = value;
        }
    });
    
    return { frontMatter, body };
}

/**
 * 提取文章中的标题（h1和h2）并更新HTML中的ID
 * @param {string} html - HTML内容
 * @returns {Object} {html: string, headings: Array}
 */
function extractHeadings(html) {
    const headings = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const h1Elements = tempDiv.querySelectorAll('h1');
    const h2Elements = tempDiv.querySelectorAll('h2');
    
    h1Elements.forEach((h1, index) => {
        const id = 'heading-1-' + index;
        h1.id = id;
        headings.push({
            level: 1,
            text: h1.textContent.trim(),
            id: id
        });
    });
    
    h2Elements.forEach((h2, index) => {
        const id = 'heading-2-' + index;
        h2.id = id;
        headings.push({
            level: 2,
            text: h2.textContent.trim(),
            id: id
        });
    });
    
    return {
        html: tempDiv.innerHTML,
        headings: headings
    };
}

