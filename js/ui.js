window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// ========== 主题切换 ==========
const themeBtn = document.getElementById('themeBtn');
const themeMenu = document.getElementById('themeMenu');
const themeOptions = themeMenu.querySelectorAll('.theme-option');

// 题款的机器要等诗歌表定义好才能用（下面才 const poems），
// 而本文件顶上就要调一次 setTheme 应用存档的偏好，所以先立个闸
let poemReady = false;

function setTheme(theme) {
    document.body.classList.remove('theme-sky', 'theme-night');
    if (theme) {
        document.body.classList.add('theme-' + theme);
    }
    localStorage.setItem('guanyu-theme', theme);
    // 换主题就是换季候，题款该立刻跟着走，而不是等最多三秒的轮询
    if (poemReady) rotatePoem();
}

const savedTheme = localStorage.getItem('guanyu-theme') || '';
setTheme(savedTheme);

themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('active');
});

themeOptions.forEach(opt => {
    const activateTheme = () => {
        setTheme(opt.dataset.theme);
        themeMenu.classList.remove('active');
        themeBtn.focus();
    };
    opt.addEventListener('click', activateTheme);
    opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activateTheme();
        }
    });
});

themeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        themeMenu.classList.remove('active');
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        themeMenu.classList.toggle('active');
        if (themeMenu.classList.contains('active')) {
            const first = themeMenu.querySelector('[role="menuitem"]');
            if (first) first.focus();
        }
    }
});

document.addEventListener('click', (e) => {
    if (!themeBtn.contains(e.target) && !themeMenu.contains(e.target)) {
        themeMenu.classList.remove('active');
    }
});

// ========== 题款：以景入诗 ==========
// 题款不只是轮播。它读缸里当下的情形——刚落了笔、刚喂过食、天黑了、
// 猫睡着了、缸里几条鱼——再从合适的句子里挑。出处按原诗写，拿不准的不编。
const poems = [
    { t: 'fish',    l1: '鱼戏莲叶间',     l2: '鱼戏莲叶东',   a: '汉乐府《江南》' },
    { t: 'fish',    l1: '潭清疑水浅',     l2: '荷动知鱼散',   a: '储光羲《钓鱼湾》' },
    { t: 'fish',    l1: '细雨鱼儿出',     l2: '微风燕子斜',   a: '杜甫《水槛遣心》' },
    { t: 'fish',    l1: '观鱼碧潭上',     l2: '木落潭水清',   a: '李白' },
    { t: 'fish',    l1: '鱼跃此时海',     l2: '花开彼岸天',   a: '佚名' },
    { t: 'fish',    l1: '临池观鱼戏',     l2: '悠然忘世机',   a: '白居易' },
    { t: 'feed',    l1: '鱼戏莲叶西',     l2: '鱼戏莲叶北',   a: '汉乐府《江南》' },
    { t: 'night',   l1: '月出惊山鸟',     l2: '时鸣春涧中',   a: '王维《鸟鸣涧》' },
    { t: 'night',   l1: '明月松间照',     l2: '清泉石上流',   a: '王维《山居秋暝》' },
    { t: 'night',   l1: '江流天地外',     l2: '山色有无中',   a: '王维《汉江临泛》' },
    { t: 'spring',  l1: '竹外桃花三两枝', l2: '春江水暖鸭先知', a: '苏轼《惠崇春江晚景》' },
    { t: 'spring',  l1: '泥融飞燕子',     l2: '沙暖睡鸳鸯',   a: '杜甫《绝句》' },
    { t: 'spring',  l1: '迟日江山丽',     l2: '春风花草香',   a: '杜甫《绝句》' },
    { t: 'summer',  l1: '接天莲叶无穷碧', l2: '映日荷花别样红', a: '杨万里《晓出净慈寺送林子方》' },
    { t: 'summer',  l1: '小荷才露尖尖角', l2: '早有蜻蜓立上头', a: '杨万里《小池》' },
    { t: 'summer',  l1: '水晶帘动微风起', l2: '满架蔷薇一院香', a: '高骈《山亭夏日》' },
    { t: 'autumn',  l1: '空山新雨后',     l2: '天气晚来秋',   a: '王维《山居秋暝》' },
    { t: 'autumn',  l1: '落霞与孤鹜齐飞', l2: '秋水共长天一色', a: '王勃《滕王阁序》' },
    { t: 'autumn',  l1: '碧云天，黄叶地', l2: '秋色连波',     a: '范仲淹《苏幕遮》' },
    { t: 'winter',  l1: '孤舟蓑笠翁',     l2: '独钓寒江雪',   a: '柳宗元《江雪》' },
    { t: 'winter',  l1: '墙角数枝梅',     l2: '凌寒独自开',   a: '王安石《梅花》' },
    { t: 'winter',  l1: '晚来天欲雪',     l2: '能饮一杯无',   a: '白居易《问刘十九》' },
    { t: 'calm',    l1: '蝉噪林逾静',     l2: '鸟鸣山更幽',   a: '王籍《入若耶溪》' },
    { t: 'calm',    l1: '山光悦鸟性',     l2: '潭影空人心',   a: '常建《题破山寺后禅院》' },
    { t: 'ink',     l1: '十日画一水',     l2: '五日画一石',   a: '杜甫《戏题王宰画山水图歌》' },
    { t: 'ink',     l1: '诗画本一律',     l2: '天工与清新',   a: '苏轼《书鄢陵王主簿所画折枝》' },
    { t: 'sleepy',  l1: '春眠不觉晓',     l2: '处处闻啼鸟',   a: '孟浩然《春晓》' },
    { t: 'startle', l1: '争渡，争渡',     l2: '惊起一滩鸥鹭', a: '李清照《如梦令》' }
];

// 事件类（刚发生的事）一票压过底色的状态类
const POEM_WEIGHT = {
    startle: 5, ink: 4, feed: 4, sleepy: 3,
    calm: 2, night: 2, fish: 2,
    spring: 2, summer: 2, autumn: 2, winter: 2
};

const SEASON_TAGS = ['spring', 'summer', 'autumn', 'winter'];

function currentSeason() {
    return SEASON_TAGS.indexOf(G.season) >= 0 ? G.season : 'spring';
}

function poemContext() {
    const tags = [];
    if (G.catMood === 'startled') tags.push('startle');
    if (G.inkRecentAt && Date.now() - G.inkRecentAt < 20000) tags.push('ink');
    if (G.lastFeedingTime && Date.now() - G.lastFeedingTime < 20000) tags.push('feed');
    if (G.catSleepStage > 0) tags.push('sleepy');
    if (document.body.classList.contains('contemplating')) tags.push('calm');
    tags.push(currentSeason());
    if (document.body.classList.contains('theme-night')) tags.push('night');
    if (typeof fishes !== 'undefined' && fishes.length > 0) tags.push('fish');
    return tags;
}

// 只拿变化慢的那几项做"要不要换句"的判据。
// 猫的情绪一秒一变，放进来会让题款一直抖。
function poemSignature() {
    const body = document.body.classList;
    return [
        currentSeason(),
        body.contains('theme-night') ? 'n' : 'd',
        body.contains('contemplating') ? 'c' : '-',
        G.catSleepStage > 0 ? 'z' : '-',
        G.inkRecentAt && Date.now() - G.inkRecentAt < 20000 ? 'i' : '-',
        G.lastFeedingTime && Date.now() - G.lastFeedingTime < 20000 ? 'f' : '-',
        (typeof fishes !== 'undefined' && fishes.length >= 9) ? '9' : '-'
    ].join('');
}

let currentPoemIndex = -1;
function pickPoem() {
    const tags = poemContext();
    const season = currentSeason();

    // 季候句只认当季：夏天不该出现"春江水暖"，冬天也不该有柳絮句
    const eligible = [];
    let top = -Infinity;
    for (let i = 0; i < poems.length; i++) {
        const t = poems[i].t;
        if (SEASON_TAGS.indexOf(t) >= 0 && t !== season) continue;
        if (tags.indexOf(t) < 0) continue;

        const score = (POEM_WEIGHT[t] || 1) - (i === currentPoemIndex ? 1.5 : 0);
        eligible.push({ i: i, score: score });
        if (score > top) top = score;
    }
    if (!eligible.length) return poems[0];

    // 同分里随机挑，免得每次都落在同一句
    const best = eligible.filter(e => e.score === top);
    currentPoemIndex = best[Math.floor(Math.random() * best.length)].i;
    return poems[currentPoemIndex];
}

let poemFading = false;
function rotatePoem() {
    if (poemFading) return;
    const container = document.getElementById('poemContainer');
    if (!container) return;

    const poem = pickPoem();
    // 用类而不是内联 opacity：内联样式会盖过 body.contemplating 的淡出规则
    container.classList.add('poem-fading');
    poemFading = true;
    setTimeout(() => {
        document.getElementById('poemLine1').textContent = poem.l1;
        document.getElementById('poemLine2').textContent = poem.l2;
        document.getElementById('poemAuthor').textContent = '—— ' + poem.a;
        container.classList.remove('poem-fading');
        poemFading = false;
    }, 500);
}

setInterval(() => {
    if (!document.hidden) rotatePoem();
}, 15000);

// 情境一变（落了笔、喂了食、天黑了、猫睡了），三秒内就把题款换过来，
// 不用干等那 15 秒的轮播
let lastPoemSignature = '';
setInterval(() => {
    if (document.hidden || poemFading) return;
    const sig = poemSignature();
    if (sig === lastPoemSignature) return;
    lastPoemSignature = sig;
    rotatePoem();
}, 3000);

poemReady = true;

G.setTheme = setTheme;
G.rotatePoem = rotatePoem;
