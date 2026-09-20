window.__GUANYU = window.__GUANYU || {};

// ========== 春日氛围：柳絮与燕子 ==========
// 都是纯 CSS 关键帧驱动，JS 只负责按节奏投放，动画结束后由 animationend 回收。
(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // 减弱动效、或窄屏（手机本来就把柳树藏了）时不投放：省电，也不干扰
    if (reduceMotion.matches || window.innerWidth <= 768) return;

    const layer = document.createElement('div');
    layer.className = 'scenery-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    const SWALLOW_SVG =
        '<svg viewBox="0 0 64 36" preserveAspectRatio="xMidYMid meet">' +
        '<path d="M4,26 Q19,9 32,21 Q45,9 60,26" fill="none" stroke="rgba(58,72,60,0.5)" stroke-width="1.9" stroke-linecap="round"/>' +
        '<path d="M32,21 L29,31 M32,21 L35,31" fill="none" stroke="rgba(58,72,60,0.36)" stroke-width="1.3" stroke-linecap="round"/>' +
        '</svg>';

    const MAX_PARTS = 42;   // 兜底：标签页被隐藏时 CSS 动画会暂停，防止元素无限堆积

    function spawnCatkin() {
        if (layer.childElementCount >= MAX_PARTS) return;
        const el = document.createElement('div');
        el.className = 'catkin';
        const size = 5 + Math.random() * 5;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.left = (Math.random() * 100).toFixed(1) + 'vw';
        el.style.setProperty('--catkin-dx', ((Math.random() - 0.35) * 170).toFixed(0) + 'px');
        el.style.animationDuration = (16 + Math.random() * 12).toFixed(1) + 's';
        el.style.animationDelay = (Math.random() * 2.5).toFixed(1) + 's';
        layer.appendChild(el);
        el.addEventListener('animationend', function () { el.remove(); });
    }

    function spawnSwallow() {
        if (layer.childElementCount >= MAX_PARTS) return;
        const el = document.createElement('div');
        el.className = 'swallow';
        // 尺寸交给容器，SVG 用 100% 填满（transform 会被关键帧接管，不能用来缩放）
        const s = 0.55 + Math.random() * 0.6;
        el.style.width = (64 * s).toFixed(0) + 'px';
        el.style.height = (36 * s).toFixed(0) + 'px';
        el.style.top = (6 + Math.random() * 44).toFixed(1) + 'vh';
        el.style.setProperty('--swallow-dy', ((Math.random() - 0.5) * 90).toFixed(0) + 'px');
        el.style.animationDuration = (13 + Math.random() * 8).toFixed(1) + 's';
        el.innerHTML = SWALLOW_SVG;
        layer.appendChild(el);
        el.addEventListener('animationend', function () { el.remove(); });
    }

    let catkinTimer = window.setInterval(spawnCatkin, 2400);
    let swallowTimer = window.setInterval(spawnSwallow, 26000);

    // 首屏先给几片，别让页面一开始空着
    for (let i = 0; i < 3; i++) window.setTimeout(spawnCatkin, i * 900);
    window.setTimeout(spawnSwallow, 4500);

    // 页面隐藏时停掉，不在后台空转
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (catkinTimer) { window.clearInterval(catkinTimer); catkinTimer = null; }
            if (swallowTimer) { window.clearInterval(swallowTimer); swallowTimer = null; }
        } else if (!catkinTimer) {
            catkinTimer = window.setInterval(spawnCatkin, 2400);
            swallowTimer = window.setInterval(spawnSwallow, 26000);
        }
    });

    window.__GUANYU.spawnCatkin = spawnCatkin;
    window.__GUANYU.spawnSwallow = spawnSwallow;
})();
