window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// ========== 画上添一笔 ==========
// 在卷轴空白处按住拖一笔，墨就留在纸上。新落的墨会把附近的鱼惊开，
// 陈墨慢慢洇开、化尽。和"投喂／惊扰"不同，这一笔是观众自己落的。
//
// 用 canvas 而不是 SVG：笔迹是逐段变宽的折线（落笔慢则肥、拖得快则瘦），
// 每帧还要把渐淡的洇痕重画一遍，canvas 比往 DOM 里塞几百个节点便宜得多。
(function () {
    const canvas = document.getElementById('inkStrokeLayer');
    const host = document.querySelector('.water-body');
    if (!canvas || !host) return;

    const ctx = canvas.getContext('2d');

    const INK_LIFE = 26000;     // 一笔墨从落到化尽
    const INK_SOLID = 6000;     // 这段时间内不淡，之后线性化尽
    const MAX_STROKES = 5;      // 同时留在纸上的笔数，超了就让最早那笔先走
    const MIN_STEP = 2.4;       // 采样间距（CSS px），太小会拖慢绘制
    const MAX_POINTS = 260;     // 单笔上限，防止有人绕着缸画一圈
    const STARTLE_RADIUS = 6;   // 落笔在多近会惊到鱼（百分比，和 f.x/f.y 同单位）
    const HINT_KEY = 'guanyu-ink-hint';

    let W = 0, H = 0, DPR = 1;
    let strokes = [];           // 已经落在纸上的笔（含正在画的那一笔）
    let cur = null;             // 正在画的一笔
    let lastX = 0, lastY = 0, lastT = 0;
    let pressure = 0.5;         // 平滑过的"落笔轻重"
    let running = false;
    let inkColor = 'rgba(26,33,26,0.92)';

    // 墨色是 CSS 变量，主题一换就要跟着换；压着 document.body 观察 class
    function readInkColor() {
        const v = getComputedStyle(document.body).getPropertyValue('--ink-stroke').trim();
        if (v) inkColor = v;
    }
    readInkColor();
    if (window.MutationObserver) {
        new MutationObserver(readInkColor)
            .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    function resize() {
        const r = host.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        W = r.width;
        H = r.height;
        DPR = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // 定死的伪随机：每一笔的飞白位置只生成一次，不会每帧乱闪
    function makeRand(seed) {
        let s = seed >>> 0;
        return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    // 笔身靠逐段调透明度造飞白：偶尔一段变淡、偶尔几乎断开，
    // 比用 destination-out 抠洞安全——那种做法会把底下更早的笔一起抠掉
    function grainFor(s) {
        if (!s.rand) s.rand = makeRand(s.seed);
        if (!s.grain) s.grain = [];
        while (s.grain.length < s.pts.length) {
            const r = s.rand();
            s.grain.push(r < 0.12 ? 0.3 : r < 0.28 ? 0.65 : 1);
        }
        return s.grain;
    }

    // ========== 惊鱼 ==========
    // 只惊"落笔那一点"旁边的鱼：在空处安静地画，从鱼身上划过去才有反应。
    function startleNear(px, py) {
        if (typeof fishes === 'undefined' || !fishes.length || W < 2) return;
        const fx = px / W * 100, fy = py / H * 100;

        for (let i = 0; i < fishes.length; i++) {
            const f = fishes[i];
            if (f.behavior === 'flee' || f.eventType) continue;   // 已经在跑了，别叠
            const dx = f.x - fx, dy = f.y - fy;
            if (Math.hypot(dx, dy) > STARTLE_RADIUS) continue;

            // 借 scatter() 那套"受惊"，再把方向拧成背对落笔点
            const ang = Math.atan2(dy, dx);
            f.scatter();
            const force = Math.hypot(f.targetVx, f.targetVy) || 1;
            f.targetVx = Math.cos(ang) * force;
            f.targetVy = Math.sin(ang) * force;
        }
    }

    // ========== 落笔 / 行笔 / 收笔 ==========
    function begin(x, y) {
        if (W < 2) resize();
        if (strokes.length >= MAX_STROKES) strokes.shift();

        cur = {
            pts: [],
            bornAt: performance.now(),
            seed: (Math.random() * 4294967295) >>> 0,
            grain: null,
            rand: null
        };
        lastX = x; lastY = y; lastT = performance.now();
        pressure = 0.45;                                  // 起笔轻，走两步就沉稳下来
        cur.pts.push({ x: x, y: y, w: 2.6 });
        strokes.push(cur);

        G.inkRecentAt = Date.now();                       // 题款那边靠这个知道"刚落了笔"
        startRunning();
    }

    function addPoint(x, y) {
        if (!cur) return;
        const dx = x - lastX, dy = y - lastY;
        const dist = Math.hypot(dx, dy);
        if (dist < MIN_STEP) return;
        if (cur.pts.length >= MAX_POINTS) return;

        const now = performance.now();
        const dt = Math.max(8, now - lastT);
        // 拖得快 → 笔抬起来了 → 细；慢 → 墨吃进纸里 → 肥
        const target = 1 - Math.min(1, (dist / dt) / 1.5);
        pressure += (target - pressure) * 0.3;

        cur.pts.push({ x: x, y: y, w: 2.2 + pressure * 6.2 });
        lastX = x; lastY = y; lastT = now;

        // 每一点都要查：头几个点离鱼还远，等笔划过去时早过了节流窗口，
        // 结果就是"从鱼身上划过去，鱼一动不动"。已经在跑的鱼会被跳过，
        // 所以这里不会重复惊吓。
        startleNear(x, y);
        startRunning();
    }

    function end() {
        // 真画了一笔（而不是点一下投喂）→ 通知 tank.js 别再补一次投食
        if (cur && cur.pts.length >= 5) G.inkDrewAt = Date.now();
        cur = null;
    }

    // ========== 绘制 ==========
    function paintStroke(s, age) {
        const pts = s.pts;
        if (pts.length < 2) return;

        const fade = age < INK_SOLID ? 1
            : Math.max(0, 1 - (age - INK_SOLID) / (INK_LIFE - INK_SOLID));
        const bleed = Math.min(1, age / 5000);            // 越陈洇得越开
        const grain = grainFor(s);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = inkColor;

        // 一遍淡而宽的底：这是"洇开"那层，随时间越来越散
        ctx.globalAlpha = 0.13 * fade;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            ctx.lineWidth = ((a.w + b.w) / 2) * (1.6 + bleed * 0.9);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        // 二遍笔身：逐段带飞白。飞白只长在铺开的宽笔上——
        // 又细又快的笔画本来墨就少，再挖空就成了一条虚线。
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const w = (a.w + b.w) / 2;
            const dry = Math.min(1, w / 6);
            ctx.globalAlpha = 0.84 * fade * (1 - (1 - grain[i]) * dry);
            ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        ctx.restore();
    }

    function paint(now) {
        ctx.clearRect(0, 0, W, H);
        let alive = false;
        for (let i = strokes.length - 1; i >= 0; i--) {
            const s = strokes[i];
            const age = now - s.bornAt;
            if (age > INK_LIFE) { strokes.splice(i, 1); continue; }
            alive = true;
        }
        // 老笔在下、新笔在上，和真的落墨顺序一致
        for (let i = 0; i < strokes.length; i++) {
            paintStroke(strokes[i], now - strokes[i].bornAt);
        }
        return alive;
    }

    function tick() {
        if (document.hidden) { running = false; return; }
        if (W < 2 || H < 2) resize();
        const alive = paint(performance.now());
        if (alive || cur) {
            requestAnimationFrame(tick);
        } else {
            running = false;
            ctx.clearRect(0, 0, W, H);
        }
    }

    function startRunning() {
        if (running) return;
        // 后台标签页里 rAF 会被停掉。这时至少把当前这一帧同步画上去，
        // 否则回到前台之前画布和 strokes 是对不上的。
        if (document.hidden || W < 2) { paint(performance.now()); return; }
        running = true;
        requestAnimationFrame(tick);
    }

    // ========== 提示 ==========
    // 这个功能没有按钮（怕多一条工具条破坏画面），所以第一次来给一句提示
    function maybeHint() {
        let seen = false;
        try { seen = localStorage.getItem(HINT_KEY) === '1'; } catch (e) {}
        if (seen) return;
        setTimeout(function () {
            // 只在鱼缸还开着、而且用户还没自己发现时提示
            if (document.hidden || strokes.length) return;
            const view = document.getElementById('view-tank');
            if (!view || !view.classList.contains('is-active')) return;
            try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
            if (typeof showFeedback === 'function') showFeedback('按住水面拖一笔 · 落墨惊鱼');
        }, 9000);
    }

    resize();
    window.addEventListener('resize', function () {
        resize();
        startRunning();
    });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);

    // tick 在后台会自行退出，回到前台得有人把它叫醒，
    // 否则墨会冻在离开时那一帧上，再也不化
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && strokes.length) startRunning();
    });

    maybeHint();

    G.inkBegin = begin;
    G.inkAdd = addPoint;
    G.inkEnd = end;
})();
