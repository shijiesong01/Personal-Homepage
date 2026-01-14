# Personal-Homepage

## 项目实现原理

### 整体架构

本项目采用纯静态架构，所有功能都在浏览器端通过原生 JavaScript 实现，无需服务器端处理。

### 页面加载流程

#### 1. 知识库页面（knowledge.html）加载流程

```
页面加载
  ↓
初始化主题（从 localStorage 读取）
  ↓
加载文章路径列表（data/knowledge-list.txt）
  ↓
并行加载所有文章的元信息（从每个 .md 文件的 front matter 读取）
  ↓
构建左侧导航栏（按文件夹层级组织：一级标题/二级标题）
  ↓
检查 URL 参数
  ├─ 有 path 参数 → 加载并显示指定文章
  └─ 无 path 参数 → 显示文章列表（元信息卡片）
```

#### 2. 点击文章后的处理流程

```
用户点击文章（左侧导航或中间列表）
  ↓
调用 loadAndDisplayKnowledgeArticle(path)
  ↓
使用 fetch 加载 .md 文件内容
  ↓
解析 Front Matter（提取元信息：题目、更新时间、分类、标签、引言）
  ↓
解析 Markdown 正文（转换为 HTML）
  ↓
提取标题（h1 和 h2）并添加 ID
  ↓
更新中间内容区（显示文章 HTML）
  ↓
更新右侧目录（显示 h1/h2 标题列表）
  ↓
更新 URL（使用 history.pushState，不刷新页面）
  ↓
更新页面标题
```

### 核心功能实现

#### 1. 文章列表加载（`loadAllKnowledgeMeta`）

```javascript
// 步骤1：从文本文件读取路径列表
loadKnowledgeManifest() 
  → 读取 data/knowledge-list.txt
  → 解析每行路径，过滤注释

// 步骤2：并行加载所有文章的元信息
Promise.all(路径列表.map(loadKnowledgeMeta))
  → 对每个路径：fetch 加载 .md 文件
  → 解析 Front Matter（YAML 格式）
  → 提取：题目、更新时间、分类、标签、引言

// 步骤3：返回文章元信息数组
```

#### 2. 导航栏构建（`buildKnowledgeSidebarNavigation`）

```javascript
// 分析文章路径，构建层级结构
文章路径: "知识库/前端开发/React基础.md"
  ↓
路径分割: ["知识库", "前端开发", "React基础.md"]
  ↓
判断层级:
  - 路径长度 = 2 → 一级标题（直接显示）
  - 路径长度 > 2 → 二级标题（归类到文件夹下）
  ↓
构建导航对象:
{
  "root": [一级标题文章],
  "前端开发": {
    name: "前端开发",
    children: [二级标题文章]
  }
}
```

#### 3. Markdown 解析（`parseMarkdown`）

```javascript
// 解析流程：
1. 保护代码块（避免被其他规则误解析）
2. 解析行内代码
3. 解析标题（h1, h2, h3）
4. 解析粗体、斜体
5. 解析链接、图片
6. 解析列表
7. 解析段落
8. 恢复代码块
```

#### 4. Front Matter 解析（`parseFrontMatter`）

```javascript
// 解析 YAML 格式的元数据
文件内容:
---
题目: 文章标题
更新时间: 2024-01-01
分类: 技术文档
标签: 示例, 教程
引言: 文章简介
---

# 正文内容...

  ↓
提取:
{
  frontMatter: {
    题目: "文章标题",
    更新时间: "2024-01-01",
    ...
  },
  body: "# 正文内容..."
}
```

#### 5. 标题提取和目录生成（`extractHeadings`）

```javascript
// 从解析后的 HTML 中提取标题
1. 创建临时 DOM 元素
2. 查找所有 h1 和 h2 元素
3. 为每个标题添加唯一 ID（heading-1-0, heading-2-0...）
4. 返回标题数组和更新后的 HTML
  ↓
生成右侧目录:
- h1 → 一级目录项（toc-level-1）
- h2 → 二级目录项（toc-level-2）
```

### 数据流向

```
用户操作
  ↓
事件处理（点击、导航）
  ↓
JavaScript 函数调用
  ↓
fetch API 加载文件
  ↓
解析和转换（Markdown → HTML）
  ↓
DOM 更新（innerHTML）
  ↓
页面显示
```

### 关键技术点

1. **异步加载**：使用 `async/await` 和 `Promise.all` 并行加载多个文件
2. **Front Matter 解析**：使用正则表达式解析 YAML 格式的元数据
3. **Markdown 解析**：纯 JavaScript 实现，支持基本 Markdown 语法
4. **URL 管理**：使用 `history.pushState` 更新 URL 而不刷新页面
5. **浏览器导航**：监听 `popstate` 事件支持前进后退
6. **路径处理**：自动处理相对路径，兼容 GitHub Pages 子路径

### 文件说明

#### JavaScript 文件

- **`js/markdown.js`**：
  - `parseMarkdown(markdown)` - 将 Markdown 文本转换为 HTML
  - `parseFrontMatter(content)` - 解析文件头部的 YAML 元数据
  - `extractHeadings(html)` - 从 HTML 中提取 h1/h2 标题并添加 ID
  - `escapeHtml(text)` - HTML 转义函数

- **`js/knowledge.js`**：
  - `loadKnowledgeManifest()` - 从 `data/knowledge-list.txt` 读取文章路径列表
  - `loadKnowledgeMeta(path)` - 加载单个文章的元信息
  - `loadAllKnowledgeMeta()` - 并行加载所有文章的元信息
  - `loadKnowledgeArticle(path)` - 加载完整文章内容（元信息 + 正文）
  - `buildKnowledgeSidebarNavigation(articles)` - 构建左侧导航栏结构
  - `renderKnowledgeSidebar(navigation, containerId)` - 渲染左侧导航栏
  - `renderKnowledgeArticleList(articles, containerId)` - 渲染文章列表（元信息卡片）
  - `loadAndDisplayKnowledgeArticle(path)` - 加载并显示文章（更新中间内容区）

- **`js/projects.js`**：
  - 与 `knowledge.js` 类似，但处理项目集相关功能

- **`js/main.js`**：
  - `initTheme()` - 初始化主题（从 localStorage 读取）
  - `toggleTheme()` - 切换亮色/暗色主题
  - `updateThemeIcon(theme)` - 更新主题图标

### 完整示例：从点击到显示

假设用户点击了文章 "React基础.md"：

```javascript
// 1. 用户点击左侧导航链接
<a href="#" data-path="知识库/前端开发/React基础.md">React基础教程</a>
  ↓
// 2. 触发点击事件
link.addEventListener('click', function(e) {
    e.preventDefault();
    loadAndDisplayKnowledgeArticle('知识库/前端开发/React基础.md');
});
  ↓
// 3. 加载文章内容
async function loadAndDisplayKnowledgeArticle(path) {
    // 3.1 使用 fetch 加载 .md 文件
    const response = await fetch('知识库/前端开发/React基础.md');
    const content = await response.text();
    
    // 3.2 解析 Front Matter 和正文
    const { frontMatter, body } = parseFrontMatter(content);
    // frontMatter = { 题目: "React基础教程", 更新时间: "2024-01-02", ... }
    // body = "# React基础教程\n\nReact是一个..."
    
    // 3.3 将 Markdown 转换为 HTML
    const html = parseMarkdown(body);
    // html = "<h1>React基础教程</h1><p>React是一个...</p>"
    
    // 3.4 提取标题并添加 ID
    const { html: htmlWithIds, headings } = extractHeadings(html);
    // htmlWithIds = "<h1 id='heading-1-0'>React基础教程</h1>..."
    // headings = [{ level: 1, text: "React基础教程", id: "heading-1-0" }, ...]
    
    // 3.5 更新中间内容区
    document.getElementById('contentContainer').innerHTML = htmlWithIds;
    
    // 3.6 更新右侧目录
    renderKnowledgeTOC(headings, 'tocContainer');
    
    // 3.7 更新 URL（不刷新页面）
    window.history.pushState({ path: path }, '', 'knowledge.html?path=知识库/前端开发/React基础.md');
    
    // 3.8 更新页面标题
    document.title = frontMatter.题目 || '知识库';
}
```

### 状态管理

- **主题状态**：存储在 `localStorage` 中，键名为 `theme`
- **当前文章路径**：通过 URL 参数 `?path=...` 传递
- **文章内容**：动态加载，不存储在内存中（每次点击重新加载）

### 项目结构

```
Personal-Homepage/
├── index.html              # 主页
├── knowledge.html          # 知识库页面
├── projects.html           # 项目集页面
├── data/
│   ├── knowledge-list.txt      # 知识库文章路径列表（每行一个路径）
│   └── projects-list.txt       # 项目路径列表（每行一个路径）
├── 知识库/                 # 知识库文章文件夹
│   ├── 示例文章.md
│   └── 前端开发/
│       ├── React基础.md
│       └── Vue入门.md
├── 项目集/                 # 项目集文件夹
└── js/                     # JavaScript 文件
    ├── knowledge.js        # 知识库管理
    ├── projects.js         # 项目集管理
    ├── markdown.js         # Markdown 解析
    └── main.js             # 主题切换等通用功能
```

### 添加新文章

1. 在 `知识库/` 或 `项目集/` 文件夹中创建 `.md` 文件
2. 在对应的列表文件中添加文件路径：
   - 知识库文章：在 `data/knowledge-list.txt` 中添加一行路径
   - 项目：在 `data/projects-list.txt` 中添加一行路径
3. 文章格式：

```markdown
---
题目: 文章标题
更新时间: 2024-01-01
分类: 分类名称
标签: 标签1, 标签2
引言: 文章简介
---

# 文章标题
正文内容...
```