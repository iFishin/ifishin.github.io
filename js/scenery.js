window.__GUANYU = window.__GUANYU || {};

// ========== 时令氛围：柳絮／落叶／雪、燕子、春雨 ==========
// 全是纯 CSS 关键帧驱动，JS 只负责按节奏投放，动画结束后由 animationend 回收。
// 飘什么由四时决定（js/seasons.js 先把 G.season 定下来）。
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

    // ========== 时令飘落物 ==========
    // 春柳絮、秋落叶、冬雪；夏天什么都不飘，只留燕子。
    // p 是"这一次机会里落不落"的概率：节拍统一用 2.4s，各季的疏密靠概率调。
    // 这样在菜单里换季时不必重建定时器，下一拍就自然换了。
    const DRIFT = {
        spring: { cls: 'catkin',       min: 5, max: 10, dur: [16, 28], dx: [-60, 110], p: 0.42 },
        summer: null,
        autumn: { cls: 'falling-leaf', min: 8, max: 15, dur: [11, 19], dx: [-40, 150], p: 0.62 },
        winter: { cls: 'snowflake',    min: 3, max: 7,  dur: [13, 24], dx: [-45,  55], p: 1 }
    };

    function season() {
        const s = window.__GUANYU.season;
        return DRIFT.hasOwnProperty(s) ? s : 'spring';
    }

    function spawnDrift() {
        const cfg = DRIFT[season()];
        if (!cfg || Math.random() > cfg.p) return;
        if (layer.childElementCount >= MAX_PARTS) return;

        const el = document.createElement('div');
        el.className = cfg.cls;
        const size = cfg.min + Math.random() * (cfg.max - cfg.min);
        el.style.width = size.toFixed(1) + 'px';
        // 叶子是横躺的，别撑成正方形
        el.style.height = (cfg.cls === 'falling-leaf' ? size * 0.62 : size).toFixed(1) + 'px';
        el.style.left = (Math.random() * 100).toFixed(1) + 'vw';
        el.style.setProperty('--drift-dx',
            (cfg.dx[0] + Math.random() * (cfg.dx[1] - cfg.dx[0])).toFixed(0) + 'px');
        el.style.animationDuration = (cfg.dur[0] + Math.random() * (cfg.dur[1] - cfg.dur[0])).toFixed(1) + 's';
        el.style.animationDelay = (Math.random() * 2.5).toFixed(1) + 's';
        layer.appendChild(el);
        el.addEventListener('animationend', function () { el.remove(); });
    }

    function spawnSwallow() {
        // 燕子是夏候鸟，秋冬不该有
        if (season() === 'autumn' || season() === 'winter') return;
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

    // ========== 春雨 ==========
    // 雨丝单独一层：和柳絮/燕子共用一层的 MAX_PARTS 会把柳絮挤掉
    let rainLayer = null;
    const RAIN_MAX = 70;
    const RAIN_GAP_MIN = 75, RAIN_GAP_MAX = 165;   // 间隔（秒）
    const RAIN_DUR_MIN = 13, RAIN_DUR_MAX = 21;    // 持续（秒）

    let raining = false;
    let rainEndsAt = 0;
    let rainDropTimer = null;
    let rainRippleTimer = null;
    let rainCycleTimer = null;

    // 春雨、夏阵雨；秋冬没有雨（该下雪）
    function rainAllowed() {
        const s = season();
        return s === 'spring' || s === 'summer';
    }

    function ensureRainLayer() {
        if (!rainLayer) {
            rainLayer = document.createElement('div');
            rainLayer.className = 'rain-layer';
            rainLayer.setAttribute('aria-hidden', 'true');
            document.body.appendChild(rainLayer);
        }
        return rainLayer;
    }

    function spawnRainDrop() {
        const l = ensureRainLayer();
        if (l.childElementCount >= RAIN_MAX) return;
        const el = document.createElement('div');
        el.className = 'raindrop';
        el.style.left = (Math.random() * 104 - 2).toFixed(1) + 'vw';
        el.style.height = (24 + Math.random() * 42).toFixed(0) + 'px';
        el.style.width = (Math.random() < 0.3 ? 1.4 : 1) + 'px';
        el.style.animationDuration = (0.5 + Math.random() * 0.55).toFixed(2) + 's';
        l.appendChild(el);
        el.addEventListener('animationend', function () { el.remove(); });
    }

    // 雨点打在水面上。只在鱼缸视图可见时撒，否则是在给隐藏的 DOM 白做功
    function spawnRainRipple() {
        const tankView = document.getElementById('view-tank');
        if (!tankView || !tankView.classList.contains('is-active')) return;
        const body = document.querySelector('.water-body');
        if (!body) return;
        const r = document.createElement('div');
        r.className = 'water-ripple rain-ripple';
        r.style.left = (6 + Math.random() * 88) + '%';
        r.style.top = (3 + Math.random() * 45) + '%';
        body.appendChild(r);
        setTimeout(function () { r.remove(); }, 2000);
    }

    function startRain() {
        if (raining) return;
        // 秋冬不下雨。但要留着这个循环继续等——在菜单里换回春天就该下起来
        if (!rainAllowed()) { scheduleRain(); return; }
        raining = true;
        document.body.classList.add('raining');
        rainEndsAt = Date.now() + (RAIN_DUR_MIN + Math.random() * (RAIN_DUR_MAX - RAIN_DUR_MIN)) * 1000;

        ensureRainLayer();
        rainDropTimer = window.setInterval(spawnRainDrop, 55);
        rainRippleTimer = window.setInterval(spawnRainRipple, 240);
        for (let i = 0; i < 20; i++) window.setTimeout(spawnRainDrop, i * 35);

        rainCycleTimer = window.setTimeout(stopRain, rainEndsAt - Date.now());
    }

    function stopRain() {
        raining = false;
        document.body.classList.remove('raining');
        if (rainDropTimer) { window.clearInterval(rainDropTimer); rainDropTimer = null; }
        if (rainRippleTimer) { window.clearInterval(rainRippleTimer); rainRippleTimer = null; }
        if (rainLayer) rainLayer.innerHTML = '';
        scheduleRain();
    }

    function scheduleRain() {
        if (rainCycleTimer) { window.clearTimeout(rainCycleTimer); rainCycleTimer = null; }
        const wait = rainAllowed()
            ? (RAIN_GAP_MIN + Math.random() * (RAIN_GAP_MAX - RAIN_GAP_MIN)) * 1000
            : 45000;   // 不是下雨的季节：四十五秒后再来看一眼
        rainCycleTimer = window.setTimeout(startRain, wait);
    }

    // ========== 定时器总控 ==========
    let driftTimer = null;
    let swallowTimer = null;

    function startAmbientTimers() {
        if (!driftTimer) driftTimer = window.setInterval(spawnDrift, 2400);
        if (!swallowTimer) swallowTimer = window.setInterval(spawnSwallow, 26000);

        if (raining) {
            // 从后台切回来接着下：按原定结束时刻算剩余时间，而不是重新计时
            const left = rainEndsAt - Date.now();
            if (left <= 0) {
                stopRain();
            } else {
                if (!rainDropTimer) rainDropTimer = window.setInterval(spawnRainDrop, 55);
                if (!rainRippleTimer) rainRippleTimer = window.setInterval(spawnRainRipple, 240);
                if (rainCycleTimer) window.clearTimeout(rainCycleTimer);
                rainCycleTimer = window.setTimeout(stopRain, left);
            }
        } else {
            scheduleRain();
        }
    }

    function stopAmbientTimers() {
        if (driftTimer) { window.clearInterval(driftTimer); driftTimer = null; }
        if (swallowTimer) { window.clearInterval(swallowTimer); swallowTimer = null; }
        if (rainDropTimer) { window.clearInterval(rainDropTimer); rainDropTimer = null; }
        if (rainRippleTimer) { window.clearInterval(rainRippleTimer); rainRippleTimer = null; }
        if (rainCycleTimer) { window.clearTimeout(rainCycleTimer); rainCycleTimer = null; }
    }

    startAmbientTimers();

    // 首屏先给几片，别让页面一开始空着
    for (let i = 0; i < 3; i++) window.setTimeout(spawnDrift, i * 900);
    window.setTimeout(spawnSwallow, 4500);

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopAmbientTimers();
        else startAmbientTimers();
    });

    window.__GUANYU.spawnDrift = spawnDrift;
    window.__GUANYU.spawnSwallow = spawnSwallow;
    window.__GUANYU.startRain = startRain;
    window.__GUANYU.stopRain = stopRain;
})();
