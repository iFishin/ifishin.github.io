window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// ========== 四时 ==========
// 默认跟着真实节气走（北半球），也可以在菜单里锁死一季。
// 注意：index.html 顶部那段内联脚本里有一份同样的月份映射，负责在首帧之前
// 就把 season-* 挂上（不然会先闪一下春绿）。改这里记得一起改那儿。
(function () {
    const KEY = 'guanyu-season';
    const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

    function seasonOfMonth(m) {
        if (m >= 3 && m <= 5) return 'spring';
        if (m >= 6 && m <= 8) return 'summer';
        if (m >= 9 && m <= 11) return 'autumn';
        return 'winter';
    }

    // 存的是"偏好"（auto 或某一季），亮出来的是"算出来的那一季"
    let pref = 'auto';
    try { pref = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
    if (pref !== 'auto' && SEASONS.indexOf(pref) < 0) pref = 'auto';

    function apply() {
        const season = pref === 'auto' ? seasonOfMonth(new Date().getMonth() + 1) : pref;
        for (let i = 0; i < SEASONS.length; i++) {
            document.body.classList.toggle('season-' + SEASONS[i], SEASONS[i] === season);
        }
        G.season = season;

        document.querySelectorAll('.season-option').forEach(function (opt) {
            if (opt.dataset.season === pref) opt.setAttribute('aria-current', 'true');
            else opt.removeAttribute('aria-current');
        });
    }

    function setSeason(next) {
        pref = SEASONS.indexOf(next) >= 0 ? next : 'auto';
        apply();
        try { localStorage.setItem(KEY, pref); } catch (e) {}
        // 换季就是换题款，别让那三秒的轮询来补这一刀
        if (typeof G.rotatePoem === 'function') G.rotatePoem();
    }

    apply();

    document.querySelectorAll('.season-option').forEach(function (opt) {
        const pick = function () { setSeason(opt.dataset.season); };
        opt.addEventListener('click', pick);
        opt.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
        });
    });

    G.setSeason = setSeason;
})();
