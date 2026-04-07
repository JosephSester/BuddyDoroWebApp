import { searchVideos, searchBooks, getWebSearchUrls, saveResource } from '../../api/resourceService.js';

let _panel = null;
let _onSaved = null;
let _currentQuery = '';
let _debounceTimer = null;

export function initDiscoverTab(panel, { onSaved } = {}) {
    _panel = panel;
    _onSaved = onSaved;
    renderEmpty();
}

export function triggerSearch(query) {
    _currentQuery = (query || '').trim();
    clearTimeout(_debounceTimer);
    if (!_currentQuery) { renderEmpty(); return; }
    renderLoading();
    _debounceTimer = setTimeout(() => runSearch(_currentQuery), 300);
}

function renderEmpty() {
    _panel.innerHTML = `
        <div class="resources-empty">
            <span class="resources-empty-icon">🔍</span>
            <p>Search for videos, books, or websites<br>related to what you're studying.</p>
        </div>`;
}

function renderLoading() {
    _panel.innerHTML = `<div class="resources-spinner-wrap"><div class="resources-spinner"></div></div>`;
}

async function runSearch(query) {
    if (query !== _currentQuery) return;

    const [videos, books, webUrls] = await Promise.allSettled([
        searchVideos(query),
        searchBooks(query),
        getWebSearchUrls(query)
    ]);

    if (query !== _currentQuery) return;

    _panel.innerHTML = '';

    appendVideoSection(videos.status === 'fulfilled' ? videos.value : [], query);
    appendBookSection(books.status === 'fulfilled' ? books.value : [], query);
    appendWebSection(webUrls.status === 'fulfilled' ? webUrls.value : null, query);
}

function appendVideoSection(items, query) {
    const wrap = document.createElement('div');
    wrap.className = 'resources-section';
    wrap.innerHTML = `<h3 class="resources-section-label">▶ Videos</h3>`;

    if (!items.length) {
        wrap.insertAdjacentHTML('beforeend', `<p class="resources-section-empty">No videos found.</p>`);
    } else {
        items.forEach(item => {
            wrap.appendChild(buildResourceCard({
                type: 'video',
                title: item.title,
                url: item.url,
                thumbnail: item.thumbnail,
                author: item.channelTitle,
                description: item.description,
                query
            }));
        });
    }
    _panel.appendChild(wrap);
}

function appendBookSection(items, query) {
    const wrap = document.createElement('div');
    wrap.className = 'resources-section';
    wrap.innerHTML = `<h3 class="resources-section-label">📚 Books</h3>`;

    if (!items.length) {
        wrap.insertAdjacentHTML('beforeend', `<p class="resources-section-empty">No books found.</p>`);
    } else {
        items.forEach(item => {
            wrap.appendChild(buildResourceCard({
                type: 'book',
                title: item.title,
                url: item.url,
                thumbnail: item.thumbnail,
                author: item.author,
                description: item.description,
                query
            }));
        });
    }
    _panel.appendChild(wrap);
}

function appendWebSection(urls, query) {
    const wrap = document.createElement('div');
    wrap.className = 'resources-section';
    wrap.innerHTML = `<h3 class="resources-section-label">🌐 Search the Web</h3>`;

    if (!urls) {
        wrap.insertAdjacentHTML('beforeend', `<p class="resources-section-empty">Could not build search links.</p>`);
    } else {
        const links = [
            { label: 'Google', icon: '🔍', url: urls.googleUrl },
            { label: 'DuckDuckGo', icon: '🦆', url: urls.ddgUrl },
            { label: 'Khan Academy', icon: '🎓', url: urls.khanUrl },
            { label: 'YouTube', icon: '▶', url: urls.youtubeUrl }
        ];
        const row = document.createElement('div');
        row.className = 'resources-web-row';
        links.forEach(({ label, icon, url }) => {
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'resources-web-link';
            a.innerHTML = `<span class="resources-web-icon">${icon}</span>${label}`;
            row.appendChild(a);
        });
        wrap.appendChild(row);
    }
    _panel.appendChild(wrap);
}

function buildResourceCard({ type, title, url, thumbnail, author, description, query }) {
    const card = document.createElement('div');
    card.className = 'resource-card';

    const thumbHtml = thumbnail
        ? `<img class="resource-thumb" src="${thumbnail}" alt="" loading="lazy">`
        : `<div class="resource-thumb resource-thumb-placeholder">${type === 'video' ? '▶' : '📖'}</div>`;

    const authorHtml = author ? `<span class="resource-author">${escHtml(author)}</span>` : '';
    const descHtml = description
        ? `<p class="resource-desc">${escHtml(description.slice(0, 120))}${description.length > 120 ? '…' : ''}</p>`
        : '';

    card.innerHTML = `
        ${thumbHtml}
        <div class="resource-info">
            <a class="resource-title" href="${url}" target="_blank" rel="noopener noreferrer">${escHtml(title)}</a>
            ${authorHtml}
            ${descHtml}
        </div>
        <button class="resource-save-btn" type="button" title="Save resource" aria-label="Save ${escHtml(title)}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>`;

    card.querySelector('.resource-save-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.classList.add('is-saved');
        btn.title = 'Saved!';
        try {
            await saveResource({ type, title, url, thumbnail, author, query });
            _onSaved?.();
        } catch {
            btn.disabled = false;
            btn.classList.remove('is-saved');
            btn.title = 'Save resource';
        }
    });

    return card;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
