window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// ========== 原位换景路由 ==========
// 不新增页面、不重载：四个视图叠在同一个 .stage 上交叉淡入，
// 宣纸／柳树／猫／背景水墨常驻，鱼群继续游（切走时不销毁鱼缸，只是变透明）。
(function () {
    'use strict';

    const VIEWS = [
        { key: 'tank',    title: '观鱼' },
        { key: 'species', title: '鱼谱 · 观鱼' },
        { key: 'cat',     title: '猫说 · 观鱼' },
        { key: 'about',   title: '关于 · 观鱼' }
    ];
    const DEFAULT_KEY = 'tank';
    const INK_IN_MS = 500;
    const INK_OUT_MS = 470;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const overlay = document.getElementById('inkTransition');
    const navItems = Array.prototype.slice.call(document.querySelectorAll('.seal-nav-item'));

    const views = {};
    VIEWS.forEach(function (v) { views[v.key] = document.getElementById('view-' + v.key); });

    let currentKey = null;
    let switching = false;
    let pendingKey = null;

    function keyFromHash() {
        const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0].trim();
        return Object.prototype.hasOwnProperty.call(views, raw) && views[raw] ? raw : DEFAULT_KEY;
    }

    function applyView(key) {
        Object.keys(views).forEach(function (k) {
            if (views[k]) views[k].classList.toggle('is-active', k === key);
        });
        navItems.forEach(function (a) {
            if (a.dataset.view === key) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        for (let i = 0; i < VIEWS.length; i++) {
            if (VIEWS[i].key === key) { document.title = VIEWS[i].title; break; }
        }
        currentKey = key;
    }

    function navigate(key, animate) {
        if (!views[key] || key === currentKey) return;

        // 程序化调用时同步地址栏，保证刷新与前进/后退跟视图一致。
        // 用 pushState 而不是改 location.hash：前者不会触发 hashchange，
        // 免得再绕回 onHashChange 造成一次多余的转场。
        const want = '#/' + key;
        if (location.hash !== want) history.pushState(null, '', want);

        if (switching) { pendingKey = key; return; }

        if (!animate || reduceMotion.matches || !overlay) { applyView(key); return; }

        switching = true;
        overlay.classList.add('spreading');
        window.setTimeout(function () {
            applyView(key);
            overlay.classList.remove('spreading');
            overlay.classList.add('draining');
            window.setTimeout(function () {
                overlay.classList.remove('draining');
                switching = false;
                if (pendingKey !== null) {
                    const next = pendingKey;
                    pendingKey = null;
                    navigate(next, true);
                }
            }, INK_OUT_MS);
        }, INK_IN_MS);
    }

    function onHashChange() {
        navigate(keyFromHash(), true);
    }

    // ---------- 鱼谱：借 Fish 的绘制代码生成静态鱼图 ----------
    function buildSpeciesGallery() {
        const grid = document.getElementById('speciesGrid');
        if (!grid) return;
        if (typeof FISH_SPECIES === 'undefined' || typeof Fish !== 'function' || typeof fishColors === 'undefined') return;
        if (grid.childElementCount > 0) return;

        FISH_SPECIES.forEach(function (sp) {
            // 只借用绘制结果：不进 fishes 数组，也就不会被主循环更新
            const probe = new Fish();
            probe.species = sp;
            probe.colorIndex = sp.palette[0];
            probe.color = fishColors[probe.colorIndex];
            probe.element.remove();                     // createSVGElement 会挂到 fishLayer
            probe.element = probe.createSVGElement();
            probe.element.remove();
            const svg = probe.element.querySelector('svg').cloneNode(true);

            const card = document.createElement('div');
            card.className = 'species-card';
            card.dataset.species = sp.key;

            const fig = document.createElement('div');
            fig.className = 'species-figure';
            fig.appendChild(svg);

            const name = document.createElement('div');
            name.className = 'species-name';
            name.textContent = sp.name;

            const desc = document.createElement('div');
            desc.className = 'species-desc';
            desc.textContent = sp.desc || '';

            const trait = document.createElement('div');
            trait.className = 'species-trait';
            trait.textContent = '长 ' + (sp.rx * 2) + ' · 速 ×' + sp.speedScale + ' · 尾 ×' + sp.tailRate;

            card.appendChild(fig);

            const text = document.createElement('div');
            text.className = 'species-text';
            text.appendChild(name);
            text.appendChild(desc);
            text.appendChild(trait);
            card.appendChild(text);

            grid.appendChild(card);
        });

        refreshSpeciesSeen();
    }

    // ---------- 鱼谱：点过的鱼种点亮 ----------
    // 把鱼谱从"静态介绍"变成"你的记录"：没点过的偏淡，点过就亮起来。
    const SEEN_STORE = 'guanyu-seen-species';

    function getSeenSpecies() {
        try {
            const raw = localStorage.getItem(SEEN_STORE);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    function markSpeciesSeen(key) {
        if (!key) return;
        const seen = getSeenSpecies();
        if (seen.indexOf(key) >= 0) return;
        seen.push(key);
        try { localStorage.setItem(SEEN_STORE, JSON.stringify(seen)); } catch (e) {}
        refreshSpeciesSeen();
    }

    function refreshSpeciesSeen() {
        const seen = getSeenSpecies();
        const cards = document.querySelectorAll('.species-card');
        if (!cards.length) return;

        cards.forEach(function (card) {
            const on = seen.indexOf(card.dataset.species) >= 0;
            card.classList.toggle('species-seen', on);
            card.classList.toggle('species-unseen', !on);
        });

        const prog = document.getElementById('speciesProgress');
        if (prog) {
            prog.textContent = seen.length === 0
                ? '在缸里点一条鱼，它就会记进这里。'
                : '已识 ' + Math.min(seen.length, cards.length) + ' / ' + cards.length;
        }
    }

    // ---------- 初始化 ----------
    function init() {
        buildSpeciesGallery();
        // 首屏直接落到目标视图，不做转场
        applyView(keyFromHash());
        // 把空 hash / 非法 hash 规范化，replaceState 不新增历史记录
        const normalized = '#/' + currentKey;
        if (location.hash !== normalized) history.replaceState(null, '', normalized);
        window.addEventListener('hashchange', onHashChange);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    G.navigate = navigate;
    G.applyView = applyView;
    G.markSpeciesSeen = markSpeciesSeen;
})();
