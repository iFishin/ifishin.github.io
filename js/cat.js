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

catContainer.addEventListener('click', () => {
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
const baseTailPath = tailEl ? tailEl.getAttribute('d') : null;
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let tailPhase = 0;

function buildTailPath(phase, ampScale) {
    const STEPS = 12;
    const p0 = [292, 168], p1 = [309, 176], p2 = [319, 197], p3 = [302, 221];

    // 第一遍：中心线 = 基准三次贝塞尔 + 法线方向的行波
    const centre = [];
    for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS, mt = 1 - t;
        const x = mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0];
        const y = mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1];
        const dx = 3*mt*mt*(p1[0]-p0[0]) + 6*mt*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]);
        const dy = 3*mt*mt*(p1[1]-p0[1]) + 6*mt*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]);
        const len = Math.hypot(dx, dy) || 1;
        const wave = Math.sin(t * 7.2 - phase) * (0.8 + 5.0 * t * t) * ampScale;
        centre.push([x + (-dy / len) * wave, y + (dx / len) * wave]);
    }

    // 第二遍：用位移后折线的法线加厚，尾根粗、尾尖细
    const outer = [], inner = [];
    for (let i = 0; i <= STEPS; i++) {
        const a = centre[Math.max(0, i - 1)];
        const b = centre[Math.min(STEPS, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const half = (14 - 8 * (i / STEPS)) / 2;
        const nx = -dy / len * half, ny = dx / len * half;
        outer.push([centre[i][0] + nx, centre[i][1] + ny]);
        inner.push([centre[i][0] - nx, centre[i][1] - ny]);
    }

    const fmt = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
    return 'M' + fmt(outer) + ' L' + fmt(inner.slice().reverse()) + ' Z';
}

function updateCatTail() {
    if (!tailEl) return;

    // 尊重系统的"减弱动效"：回到作者绘制的静态尾巴
    if (reduceMotionQuery.matches) {
        if (baseTailPath && tailEl.getAttribute('d') !== baseTailPath) {
            tailEl.setAttribute('d', baseTailPath);
        }
        return;
    }

    let speed = 0.045, amp = 1;
    if (G.catSleepStage > 0) {
        speed = 0.018; amp = 0.3;
    } else if (G.catBehaviorState === 'swiping' || G.catExciteLevel > 0.4) {
        speed = 0.085; amp = 1.6;
    }

    tailPhase += speed;
    tailEl.setAttribute('d', buildTailPath(tailPhase, amp));
}

G.updateCatEyes = updateCatEyes;
G.updateCat = updateCat;
G.wakeCat = wakeCat;
G.triggerStartle = triggerStartle;
G.triggerCurious = triggerCurious;
G.triggerStretch = triggerStretch;
G.updateCatTail = updateCatTail;
