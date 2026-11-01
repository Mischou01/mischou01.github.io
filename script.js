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

    // Colour transitions would otherwise fade text from the old theme inside the new one
    root.classList.add('theme-switching');
    const done = () => root.classList.remove('theme-switching');

    if (!document.startViewTransition || reduceMotion.matches) {
        apply();
        getComputedStyle(root).color;
        return done();
    }

    const box = toggle.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.style.setProperty('--reveal-at', `${x}px ${y}px`);
    root.style.setProperty('--reveal-r', `${r}px`);

    // The reveal itself lives in CSS: animating from JS after `ready` lets Firefox paint unclipped frames
    document.startViewTransition(apply).finished.finally(done);
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

const search = document.querySelector('.search input');
const homeList = document.querySelector('.list[data-kind="all"]');
const lists = [...document.querySelectorAll('.list[data-kind]')];

// Sort buttons only appear once a list has this many entries
const SORT_MIN = 6;
const sorts = {
    Newest: (a, b) => b.date.localeCompare(a.date),
    Oldest: (a, b) => a.date.localeCompare(b.date),
    'A–Z': (a, b) => a.title.localeCompare(b.title),
};

function render(list, sort) {
    const kind = list.dataset.kind;
    const items = (typeof entries === 'undefined' ? [] : entries)
        .filter(e => kind === 'all' || e.kind === kind)
        .sort(sorts[sort]);
    const byYear = sort !== 'A–Z' && new Set(items.map(e => e.date.slice(0, 4))).size > 1;
    let year;
    list.innerHTML = items.map((e, i) => {
        const y = e.date.slice(0, 4);
        const header = byYear && y !== year ? `<h3 class="year">${year = y}</h3>` : '';
        return header + row(e, kind === 'all', i);
    }).join('') + '<p class="empty"></p>';
    filterList(list, list === homeList && search ? search.value : '');
    return items.length;
}

lists.forEach(list => {
    if (render(list, 'Newest') < SORT_MIN) return;
    const bar = document.createElement('div');
    bar.className = 'sort';
    bar.innerHTML = Object.keys(sorts)
        .map(s => `<button type="button" aria-pressed="${s === 'Newest'}">${s}</button>`).join('');
    bar.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn));
        render(list, btn.textContent);
    });
    list.before(bar);
});

function filterList(list, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0, total = 0, header;
    for (const el of list.children) {
        if (el.matches('.year')) {
            header = el;
            el.hidden = true;
        } else if (el.matches('.row')) {
            total++;
            const hit = terms.every(t => el.dataset.search.includes(t));
            el.hidden = !hit;
            if (!hit) continue;
            if (header?.hidden) {
                header.hidden = false;
                header.style.setProperty('--i', shown);
            }
            el.style.setProperty('--i', shown++);
        }
    }
    const empty = list.querySelector('.empty');
    empty.hidden = shown > 0;
    empty.textContent = total ? `Nothing matches "${query.trim()}".` : 'Nothing here yet.';
}

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

if (document.querySelector('.post')) {
    const bar = document.createElement('div');
    bar.className = 'progress';
    document.body.prepend(bar);
    const update = () => {
        const max = root.scrollHeight - innerHeight;
        bar.hidden = max <= 0;
        bar.style.transform = `scaleX(${scrollY / max})`;
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    addEventListener('load', update);
    update();
}

const postImages = document.querySelectorAll('.post-body img');

if (postImages.length) {
    const lightbox = document.createElement('dialog');
    lightbox.className = 'lightbox';
    const big = new Image();
    lightbox.append(big);
    document.body.append(lightbox);
    let source;

    // Moves the enlarged copy between the original image's spot and its own centred spot
    const zoom = direction => {
        if (reduceMotion.matches) return Promise.resolve();
        const a = source.getBoundingClientRect();
        const b = big.getBoundingClientRect();
        const start = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
        return big.animate(
            { transform: [start, 'none'] },
            { duration: 450, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', direction, fill: 'both' },
        ).finished;
    };

    postImages.forEach(img => img.addEventListener('click', async () => {
        source = img;
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        await big.decode().catch(() => {});
        lightbox.showModal();
        img.style.visibility = 'hidden';
        await zoom('normal');
        big.getAnimations().forEach(a => a.cancel());
    }));

    const close = async () => {
        if (lightbox.classList.contains('closing')) return;
        lightbox.classList.add('closing');
        await zoom('reverse');
        lightbox.close();
        lightbox.classList.remove('closing');
        source.style.visibility = '';
        big.getAnimations().forEach(a => a.cancel());
    };

    lightbox.addEventListener('click', close);
    lightbox.addEventListener('cancel', e => {
        e.preventDefault();
        close();
    });
}
