/**
 * 主脚本文件
 * 处理主题切换和页面交互逻辑
 */

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题
    initTheme();
    
    // 绑定主题切换按钮事件
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 如果是知识库页面，初始化文章系统
    if (typeof initArticles === 'function') {
        initArticles();
    }
});

/**
 * 初始化主题：从localStorage读取保存的主题设置
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

/**
 * 切换主题：在亮色和暗色之间切换
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

/**
 * 更新主题图标：根据当前主题显示太阳或月亮
 */
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '☀' : '🌙';
    }
}

