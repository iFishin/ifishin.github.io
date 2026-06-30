window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// ========== 主题切换 ==========
const themeBtn = document.getElementById('themeBtn');
const themeMenu = document.getElementById('themeMenu');
const themeOptions = themeMenu.querySelectorAll('.theme-option');

function setTheme(theme) {
    document.body.classList.remove('theme-sky', 'theme-night');
    if (theme) {
        document.body.classList.add('theme-' + theme);
    }
    localStorage.setItem('guanyu-theme', theme);
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

// ========== 诗句轮播 ==========
const poems = [
    { line1: '鱼戏莲叶间', line2: '鱼戏莲叶东', author: '汉乐府' },
    { line1: '潭清疑水浅', line2: '荷动知鱼散', author: '储光羲' },
    { line1: '细雨鱼儿出', line2: '微风燕子斜', author: '杜甫' },
    { line1: '观鱼碧潭上', line2: '木落潭水清', author: '李白' },
    { line1: '鱼跃此时海', line2: '花开彼岸天', author: '佚名' },
    { line1: '临池观鱼戏', line2: '悠然忘世机', author: '白居易' }
];

let currentPoemIndex = 0;
function rotatePoem() {
    currentPoemIndex = (currentPoemIndex + 1) % poems.length;
    const poem = poems[currentPoemIndex];
    const container = document.getElementById('poemContainer');
    container.style.opacity = '0';
    setTimeout(() => {
        document.getElementById('poemLine1').textContent = poem.line1;
        document.getElementById('poemLine2').textContent = poem.line2;
        document.getElementById('poemAuthor').textContent = '—— ' + poem.author;
        container.style.opacity = '0.6';
    }, 500);
}

setInterval(() => {
    if (!document.hidden) rotatePoem();
}, 15000);

G.setTheme = setTheme;
