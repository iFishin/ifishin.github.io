window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

const catContainer = document.getElementById('catContainer');
const catEyes = document.querySelectorAll('.cat-pupil');
const meowBubble = catContainer.querySelector('.meow-bubble');

const catSoundProfiles = [
    { start: 410, mid: 560, end: 300, duration: 0.27, gain: 0.09 },
    { start: 360, mid: 480, end: 250, duration: 0.22, gain: 0.08 },
    { start: 460, mid: 690, end: 340, duration: 0.3, gain: 0.07 }
];
let catActiveTimer = null;

const catContextPhrases = {
    default: ['看见你了', '这条不错', '别跑呀', '喵在守鱼', '给我也来点', '今日观鱼'],
    feeding: ['开饭了!', '我也要!', '好香啊', '分我一点呗'],
    excited: ['好多泡泡', '咕噜咕噜', '真热闹', '有动静!'],
    manyFish: ['这么多鱼', '真热闹啊', '鱼生赢家'],
    fishRight: ['过来让我看看', '嘿,那条', '别走呀'],
    sleepy: ['有点困了', '你先看着', '喵要睡了'],
    startle: ['哇!', '吓我一跳', '什么情况!']
};

function getContextPhrase() {
    if (G.catMood === 'startled') return catContextPhrases.startle[Math.floor(Math.random() * catContextPhrases.startle.length)];
    if (G.lastFeedingTime && Date.now() - G.lastFeedingTime < 5000) return catContextPhrases.feeding[Math.floor(Math.random() * catContextPhrases.feeding.length)];
    const nearRight = fishes.filter(f => f.x > 80).length;
    if (nearRight >= 2) return catContextPhrases.fishRight[Math.floor(Math.random() * catContextPhrases.fishRight.length)];
    if (fishes.length > 8) return catContextPhrases.manyFish[Math.floor(Math.random() * catContextPhrases.manyFish.length)];
    if (G.catSleepStage > 0) return catContextPhrases.sleepy[Math.floor(Math.random() * catContextPhrases.sleepy.length)];
    if (G.catExciteLevel > 0.5) return catContextPhrases.excited[Math.floor(Math.random() * catContextPhrases.excited.length)];
    return catContextPhrases.default[Math.floor(Math.random() * catContextPhrases.default.length)];
}

// 眼睛追踪
let catEyeTargetX = 0, catEyeTargetY = 0;
let catEyeCurrentX = 0, catEyeCurrentY = 0;

function updateCatEyes() {
    if (window.innerWidth <= 768 || fishes.length === 0) return;

    // 「张望」期间视线目标由 triggerLookAround 指定，其余时候盯住最右侧的鱼。
    // 原来这里无条件覆盖 target，导致张望刚设好就被改掉，等于没有效果。
    if (G.catBehaviorState !== 'looking') {
        let targetFish = null, maxX = -Infinity;
        fishes.forEach(fish => { if (fish.x > maxX) { maxX = fish.x; targetFish = fish; } });
        if (!targetFish) return;
        catEyeTargetY = targetFish.y > 56 ? 1.1 : targetFish.y < 30 ? -1.1 : 0;
        catEyeTargetX = Math.max(-2.0, Math.min(-0.3, -1.9 + (100 - targetFish.x) * 0.04));
    }

    const lerp = G.catExciteLevel > 0.3 ? 0.25 : 0.15;
    catEyeCurrentX += (catEyeTargetX - catEyeCurrentX) * lerp;
    catEyeCurrentY += (catEyeTargetY - catEyeCurrentY) * lerp;
    catEyes.forEach(eye => {
        eye.style.transform = `translate(${catEyeCurrentX}px, ${catEyeCurrentY}px)`;
    });
}

function showRandomCatPhrase() { meowBubble.textContent = getContextPhrase(); }

// 猫行为状态机
G.catBehaviorState = 'idle';
G.catSleepStage = 0;
G.catLastInteractionTime = Date.now();
G.lastFeedingTime = 0;
G.catExciteLevel = 0;
G.catMood = 'neutral';

function wakeCat() {
    if (G.catSleepStage > 0) {
        G.catSleepStage = 0;
        catContainer.classList.remove('drowsy', 'asleep');
        if (G.catBehaviorState === 'idle') {
            meowBubble.textContent = '嗯? 怎么了';
            catContainer.classList.add('active');
            setTimeout(() => catContainer.classList.remove('active'), 800);
        }
    }
    G.catLastInteractionTime = Date.now();
    G.catExciteLevel = Math.min(1, G.catExciteLevel + 0.3);
}

function updateCat() {
    const now = Date.now();
    const timeSinceInteraction = now - G.catLastInteractionTime;
    const nearRightFish = fishes.filter(f => f.x > 82 && f.y > 30).length;

    // 兴奋度自然衰减
    G.catExciteLevel *= 0.997;
    if (G.catExciteLevel < 0.01) G.catExciteLevel = 0;

    if (G.catBehaviorState === 'idle') {
        // 拍缸 - 鱼在右侧时概率更高
        if (nearRightFish >= 1 && Math.random() < 0.004 + G.catExciteLevel * 0.008) {
            triggerPawSwipe(); return;
        }
        // 打哈欠
        if (timeSinceInteraction > 15000 && Math.random() < 0.002) { triggerYawn(); return; }
        // 理毛
        if (timeSinceInteraction > 25000 && Math.random() < 0.001) { triggerGroom(); return; }

        // 随机转头环顾（让猫看起来有自主意识）
        if (timeSinceInteraction > 5000 && Math.random() < 0.0008) { triggerLookAround(); return; }

        // 伸懒腰
        if (timeSinceInteraction > 12000 && Math.random() < 0.0012) { triggerStretch(); return; }

        // 好奇心 - 鱼在右侧时猫微微前倾
        if (nearRightFish >= 1 && G.catExciteLevel > 0.1) {
            catContainer.classList.add('curious');
        } else if (!catContainer.classList.contains('startled')) {
            catContainer.classList.remove('curious');
        }

        // 犯困/睡着
        if (timeSinceInteraction > 60000 && G.catSleepStage < 2) {
            G.catSleepStage = 2; catContainer.classList.remove('drowsy'); catContainer.classList.add('asleep');
        } else if (timeSinceInteraction > 30000 && G.catSleepStage < 1) {
            G.catSleepStage = 1; catContainer.classList.add('drowsy');
        }
    }

    updateCatTail();
    updateCatEyes();
}

function triggerPawSwipe() {
    G.catBehaviorState = 'swiping'; G.catMood = 'excited';
    catContainer.classList.add('swiping');
    meowBubble.textContent = '嘿! 别跑!';
    setTimeout(() => { catContainer.classList.remove('swiping'); G.catBehaviorState = 'idle'; G.catMood = 'neutral'; }, 1000);
}

function triggerYawn() {
    G.catBehaviorState = 'yawning'; G.catMood = 'sleepy';
    catContainer.classList.add('yawning');
    setTimeout(() => { catContainer.classList.remove('yawning'); G.catBehaviorState = 'idle'; G.catMood = 'neutral'; }, 3200);
}

function triggerGroom() {
    G.catBehaviorState = 'grooming'; G.catMood = 'grooming';
    catContainer.classList.add('grooming');
    setTimeout(() => { catContainer.classList.remove('grooming'); G.catBehaviorState = 'idle'; G.catMood = 'neutral'; }, 4500);
}

function triggerStartle() {
    if (G.catBehaviorState !== 'idle' || G.catSleepStage > 0) return;
    G.catBehaviorState = 'startled'; G.catMood = 'startled'; G.catExciteLevel = 1;
    catContainer.classList.add('startled');
    G.catLastInteractionTime = Date.now();
    setTimeout(() => { catContainer.classList.remove('startled'); G.catBehaviorState = 'idle'; G.catMood = 'neutral'; }, 800);
}

function triggerCurious() {
    if (G.catBehaviorState !== 'idle' || G.catSleepStage > 0) return;
    G.catExciteLevel = Math.min(1, G.catExciteLevel + 0.4);
    catContainer.classList.add('curious');
    G.catLastInteractionTime = Date.now();
    setTimeout(() => { catContainer.classList.remove('curious'); }, 2000);
}

function triggerLookAround() {
    if (G.catBehaviorState !== 'idle' || G.catSleepStage > 0) return;
    G.catBehaviorState = 'looking';
    const lookDir = Math.random() < 0.5 ? 1 : -1;
    const lookDist = 1 + Math.random() * 2;
    catEyeTargetX = lookDir * lookDist;
    catEyeTargetY = (Math.random() - 0.5) * 1.5;
    catContainer.classList.add('looking');
    setTimeout(() => {
        catEyeTargetX = 0; catEyeTargetY = 0;
        catContainer.classList.remove('looking');
        G.catBehaviorState = 'idle';
    }, 2200);
}

function triggerStretch() {
    if (G.catBehaviorState !== 'idle' || G.catSleepStage > 0) return;
    G.catBehaviorState = 'stretching';
    catContainer.classList.add('stretching');
    setTimeout(() => {
        catContainer.classList.remove('stretching');
        G.catBehaviorState = 'idle';
    }, 2600);
}

catContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        wakeCat(); showRandomCatPhrase();
        catContainer.classList.add('active');
        playMeowSound(Math.floor(Math.random() * catSoundProfiles.length));
        if (catActiveTimer) clearTimeout(catActiveTimer);
        catActiveTimer = setTimeout(() => { catContainer.classList.remove('active'); }, 1300);
        G.catLastInteractionTime = Date.now();
    }
});

// ========== 摸猫：在猫身上摩挲会呼噜 ==========
// 和"点一下"区分开：点=喵一声，来回摩挲=呼噜。摩挲距离够了才触发，
// 免得随手一划就被判定成摸。
let strokePrev = null;
let strokeDist = 0;
let purring = false;
let purrTimer = null;
let justStroked = false;

catContainer.addEventListener('pointerdown', function (e) {
    strokePrev = { x: e.clientX, y: e.clientY };
    strokeDist = 0;
});

catContainer.addEventListener('pointermove', function (e) {
    if (!strokePrev) return;
    strokeDist += Math.abs(e.clientX - strokePrev.x) + Math.abs(e.clientY - strokePrev.y);
    strokePrev = { x: e.clientX, y: e.clientY };
    if (strokeDist > 120 && !purring) triggerPurr();
});

window.addEventListener('pointerup', function () {
    if (!strokePrev) return;
    strokePrev = null;
    if (purring) {
        justStroked = true;
        setTimeout(function () { justStroked = false; }, 500);
    }
});

function triggerPurr() {
    purring = true;
    wakeCat();                                   // 睡着被摸会醒
    G.catLastInteractionTime = Date.now();
    G.catExciteLevel = Math.min(1, G.catExciteLevel + 0.3);

    catContainer.classList.add('purring', 'active');
    meowBubble.textContent = '呼噜呼噜…';
    playPurrSound();

    if (purrTimer) clearTimeout(purrTimer);
    purrTimer = setTimeout(function () {
        catContainer.classList.remove('purring');
        purring = false;
    }, 2600);

    if (catActiveTimer) clearTimeout(catActiveTimer);
    catActiveTimer = setTimeout(function () { catContainer.classList.remove('active'); }, 2600);
}

// 低频锯齿波 + 27Hz 的颤音＝呼噜
function playPurrSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const dur = 2.4;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(46, ctx.currentTime);
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(27, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.05, ctx.currentTime);

        gain.gain.setValueAtTime(0.055, ctx.currentTime);
        gain.gain.setValueAtTime(0.055, ctx.currentTime + dur - 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + dur);

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);              // 颤音叠加在音量上
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        lfo.start();
        osc.stop(ctx.currentTime + dur);
        lfo.stop(ctx.currentTime + dur);
    } catch (e) {}
}

catContainer.addEventListener('click', () => {
    if (justStroked) return;                     // 刚摸完，别再补一声喵
    wakeCat(); showRandomCatPhrase();
    catContainer.classList.add('active');
    playMeowSound(Math.floor(Math.random() * catSoundProfiles.length));
    if (catActiveTimer) clearTimeout(catActiveTimer);
    catActiveTimer = setTimeout(() => { catContainer.classList.remove('active'); }, 1300);
    G.catLastInteractionTime = Date.now();
});

function playMeowSound(profileIndex = 0) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const profile = catSoundProfiles[profileIndex % catSoundProfiles.length];
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode); gainNode.connect(audioContext.destination);
        oscillator.type = Math.random() < 0.5 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(profile.start, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(profile.mid, audioContext.currentTime + profile.duration * 0.32);
        oscillator.frequency.exponentialRampToValueAtTime(profile.end, audioContext.currentTime + profile.duration);
        gainNode.gain.setValueAtTime(profile.gain, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + profile.duration);
        oscillator.start(audioContext.currentTime); oscillator.stop(audioContext.currentTime + profile.duration);
    } catch (e) {}
}

// ========== 尾巴：真正的 S 形波动 ==========
// 原来尾巴只有根部整体旋转，读起来像一根硬棍。这里沿中心线叠加一道行波，
// 再按"位移后折线"的法线加厚，得到随尾尖摆动的 S 形，且不会在尾尖自交夹断。
const tailEl = document.querySelector('.ink-cat-tail');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let tailPhase = 0;
let tailStaticApplied = false;

function buildTailPath(phase, ampScale) {
    const STEPS = 12;
    // 尾根落在臀部轮廓内侧，靠到 x≈304 的体缘才露出来，因此看不出接缝；
    // 末端比原来更靠外（312 而非 302），垂落的弧线更完整
    const p0 = [291, 169], p1 = [313, 177], p2 = [324, 200], p3 = [312, 224];

    // 第一遍：中心线 = 基准三次贝塞尔 + 法线方向的行波
    const centre = [];
    for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS, mt = 1 - t;
        const x = mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0];
        const y = mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1];
        const dx = 3*mt*mt*(p1[0]-p0[0]) + 6*mt*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]);
        const dy = 3*mt*mt*(p1[1]-p0[1]) + 6*mt*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]);
        const len = Math.hypot(dx, dy) || 1;
        // 频率 3.2 而不是原来的 7.2：尾巴全长只有约 70px，7.2 相当于塞进 1.15 个
        // 完整波，读起来是在"扭动"而不是"摆动"。3.2 ≈ 半个波，刚好一个 S。
        // 振幅也收了一半多，原来尾尖要摆 ±5px 而尾尖本身只有 6px 宽。
        const wave = Math.sin(t * 3.2 - phase) * (0.4 + 1.8 * t * t) * ampScale;
        centre.push([x + (-dy / len) * wave, y + (dx / len) * wave]);
    }

    // 第二遍：用位移后折线的法线加厚，尾根粗、尾尖细
    const outer = [], inner = [];
    for (let i = 0; i <= STEPS; i++) {
        const a = centre[Math.max(0, i - 1)];
        const b = centre[Math.min(STEPS, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        // 17 → 9：猫尾巴本来就粗，收到尖会读成老鼠尾巴。
        // 尾尖留 9px 的钝头，靠平口收尾而不是收成一点。
        const half = (17 - 8 * (i / STEPS)) / 2;
        const nx = -dy / len * half, ny = dx / len * half;
        outer.push([centre[i][0] + nx, centre[i][1] + ny]);
        inner.push([centre[i][0] - nx, centre[i][1] - ny]);
    }

    const fmt = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
    return 'M' + fmt(outer) + ' L' + fmt(inner.slice().reverse()) + ' Z';
}

function updateCatTail() {
    if (!tailEl) return;

    // 尊重系统的"减弱动效"：给一条振幅为 0 的平滑尾巴（纯贝塞尔中心线），
    // 不再回退到手绘的那条月牙——两者轮廓不同，切换时会跳形
    if (reduceMotionQuery.matches) {
        if (!tailStaticApplied) {
            tailEl.setAttribute('d', buildTailPath(0, 0));
            tailStaticApplied = true;
        }
        return;
    }
    tailStaticApplied = false;

    let speed = 0.045, amp = 1;
    if (G.catSleepStage > 0) {
        speed = 0.018; amp = 0.3;
    } else if (G.catBehaviorState === 'swiping' || G.catExciteLevel > 0.4) {
        speed = 0.085; amp = 1.6;
    }

    tailPhase += speed;
    tailEl.setAttribute('d', buildTailPath(tailPhase, amp));
}

// ========== 毛色 ==========
// 毛色只在容器上换一个 data-coat，SVG 里的色块全部读 CSS 变量，
// 因此换毛不用重建 DOM，也不会打断正在跑的行为动画。
const CAT_COATS = ['ink', 'tabby', 'ginger', 'snow'];
const COAT_STORE = 'guanyu-cat-coat';

function applyCoat(coat) {
    if (CAT_COATS.indexOf(coat) < 0) coat = 'ink';
    catContainer.setAttribute('data-coat', coat);
    document.querySelectorAll('.coat-option').forEach(function (opt) {
        if (opt.dataset.coat === coat) opt.setAttribute('aria-current', 'true');
        else opt.removeAttribute('aria-current');
    });
}

// 显式选择才落盘；随机的毛色不写，这样下次来还会换个样子
function setCatCoat(coat) {
    applyCoat(coat);
    try { localStorage.setItem(COAT_STORE, coat); } catch (e) {}
}

function initCatCoat() {
    let saved = null;
    try { saved = localStorage.getItem(COAT_STORE); } catch (e) {}
    applyCoat(saved || CAT_COATS[Math.floor(Math.random() * CAT_COATS.length)]);

    document.querySelectorAll('.coat-option').forEach(function (opt) {
        const pick = function () { setCatCoat(opt.dataset.coat); };
        opt.addEventListener('click', pick);
        opt.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
        });
    });
}

// 这里同步执行（脚本在 </body> 前），首帧之前就定好毛色，不会闪一下黑猫
initCatCoat();

G.setCatCoat = setCatCoat;

G.updateCatEyes = updateCatEyes;
G.updateCat = updateCat;
G.wakeCat = wakeCat;
G.triggerStartle = triggerStartle;
G.triggerCurious = triggerCurious;
G.triggerStretch = triggerStretch;
G.updateCatTail = updateCatTail;
