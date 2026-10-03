const root = document.documentElement;
const toggle = document.querySelector('.theme-toggle');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function setTheme(theme) {
    root.dataset.theme = theme;
    toggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

setTheme(root.dataset.theme);

toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
        setTheme(next);
        try { localStorage.setItem('theme', next); } catch {}
    };

    if (!document.startViewTransition || reduceMotion.matches) return apply();

    const box = toggle.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    document.startViewTransition(apply).ready.then(() => {
        root.animate(
            { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 600, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        );
    });
});

const sections = [...document.querySelectorAll('.content section')];
const navLinks = document.querySelectorAll('.nav-links a');

function showSection() {
    const id = location.hash.slice(1);
    const target = sections.find(s => s.id === id) ?? sections[0];
    sections.forEach(s => s.classList.toggle('active-section', s === target));
    navLinks.forEach(a => a.classList.toggle('active', a.hash === '#' + target.id));
}

if (sections.length) {
    window.addEventListener('hashchange', showSection);
    showSection();
}

function row(entry, showKind, i) {
    const kind = entry.kind === 'post' ? 'Post' : 'Project';
    const external = /^https?:/.test(entry.url);
    const haystack = [entry.title, entry.blurb, kind, entry.date].join(' ').toLowerCase();
    return `
        <a class="row" href="${entry.url}" style="--i: ${i}" data-search="${haystack.replaceAll('"', '&quot;')}"${external ? ' target="_blank" rel="noopener"' : ''}>
            <span class="meta">${entry.date}</span>
            <span><span class="title">${entry.title}</span><span class="blurb">${entry.blurb}</span></span>
            ${showKind ? `<span class="kind">${kind}</span>` : ''}
        </a>`;
}

const lists = [...document.querySelectorAll('.list[data-kind]')];

lists.forEach(list => {
    const kind = list.dataset.kind;
    const items = (typeof entries === 'undefined' ? [] : entries)
        .filter(e => kind === 'all' || e.kind === kind)
        .sort((a, b) => b.date.localeCompare(a.date));
    list.innerHTML = items.map((e, i) => row(e, kind === 'all', i)).join('') + '<p class="empty"></p>';
    filterList(list, '');
});

function filterList(list, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = list.querySelectorAll('.row');
    let shown = 0;
    rows.forEach(r => {
        const hit = terms.every(t => r.dataset.search.includes(t));
        r.hidden = !hit;
        if (hit) r.style.setProperty('--i', shown++);
    });
    const empty = list.querySelector('.empty');
    empty.hidden = shown > 0;
    empty.textContent = rows.length ? `Nothing matches "${query.trim()}".` : 'Nothing here yet.';
}

const search = document.querySelector('.search input');
const homeList = document.querySelector('.list[data-kind="all"]');

if (search) {
    search.addEventListener('input', () => {
        // pushState instead of location.hash, which steals focus from the input
        if (!document.querySelector('#home.active-section')) {
            history.pushState(null, '', '#home');
            showSection();
        }
        filterList(homeList, search.value);
    });

    search.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        search.value = '';
        filterList(homeList, '');
        search.blur();
    });

    document.addEventListener('keydown', e => {
        if (e.key !== '/' || e.target.closest('input, textarea')) return;
        e.preventDefault();
        search.focus();
    });
}
