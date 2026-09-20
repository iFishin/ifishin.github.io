window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// DOM references
const tank = document.getElementById('tank');
const waterBody = tank.querySelector('.water-body');
const fishLayer = document.getElementById('fishLayer');
const foodLayer = document.getElementById('foodLayer');
const bubbleLayer = document.getElementById('bubbleLayer');
const cursorGlow = document.getElementById('cursorGlow');

// Shared state
let mouseX = 0, mouseY = 0;
let mouseXPct = 50, mouseYPct = 50;
let isMouseInTank = false;
let lastMouseTime = 0;
let isDragging = false;
let draggedFish = null;
let lastDragX = 0, lastDragY = 0;
let touchDragStart = null;
// 撸鱼 / 水面作画
let pettingFish = null;
let petStartAt = 0;
let suppressDossierUntil = 0;
let lastDrawRippleAt = 0;

function clearPetting() {
    if (pettingFish) { pettingFish.petting = false; pettingFish = null; }
}

// Button event listeners
const addBtn = document.getElementById('addFishBtn');
const feedBtn = document.getElementById('feedBtn');
const scatterBtn = document.getElementById('scatterBtn');
const swimBtn = document.getElementById('swimModeBtn');
if (addBtn) addBtn.addEventListener('click', addFish);
if (feedBtn) feedBtn.addEventListener('click', feedFish);
if (scatterBtn) scatterBtn.addEventListener('click', scatterFish);
if (swimBtn) swimBtn.addEventListener('click', cycleSwimMode);

// 嵌入按钮
const embedBtn = document.getElementById('embedBtn');
const embedOverlay = document.getElementById('embedOverlay');
const embedClose = document.getElementById('embedClose');
const embedTabs = document.querySelectorAll('.embed-tab');
const embedCopies = document.querySelectorAll('.embed-copy');

// 填充代码
const baseUrl = location.protocol + '//' + location.host;
const htmlSnippet = '<iframe src="' + baseUrl + '/card.html"\n        width="480" height="240"\n        frameborder="0"\n        style="border-radius:12px; overflow:hidden;"\n        title="观鱼 - 水墨风格在线鱼缸"></iframe>';
const mdSnippet = '[![观鱼 - 水墨风格在线鱼缸](' + baseUrl + '/assets/badge.svg)](' + baseUrl + ')';

if (embedBtn) {
    embedBtn.addEventListener('click', () => {
        document.getElementById('htmlCode').value = htmlSnippet;
        document.getElementById('mdCode').value = mdSnippet;
        embedOverlay.classList.add('active');
    });
}

if (embedClose) {
    embedClose.addEventListener('click', () => embedOverlay.classList.remove('active'));
}
embedOverlay.addEventListener('click', (e) => {
    if (e.target === embedOverlay) embedOverlay.classList.remove('active');
});

// Tab 切换
embedTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        embedTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.embed-pane').forEach(p => p.classList.remove('active'));
        document.getElementById('embed' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add('active');
    });
});

// 复制
embedCopies.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (target) {
            target.select();
            navigator.clipboard.writeText(target.value).then(() => {
                btn.textContent = '已复制 ✓';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
            }).catch(() => {
                // fallback
                document.execCommand('copy');
                btn.textContent = '已复制 ✓';
                setTimeout(() => btn.textContent = '复制', 2000);
            });
        }
    });
});
// 鼠标移动
        tank.addEventListener('mousemove', (e) => {
            const rect = waterBody.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            mouseXPct = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
            mouseYPct = Math.max(0, Math.min(100, (mouseY / rect.height) * 100));
            isMouseInTank = true;
            
            cursorGlow.style.left = mouseX + 'px';
            cursorGlow.style.top = mouseY + 'px';
            
            const now = Date.now();
            if (now - lastMouseTime > 80) {
                createParticle(mouseX, mouseY);
                lastMouseTime = now;
            }

            // 水面作画：按住左键在空白水面拖动，留下一串涟漪。
            // 撸鱼和拖鱼时不画，否则三个手势会互相打架。
            if ((e.buttons & 1) && !pettingFish && !isDragging) {
                if (now - lastDrawRippleAt > 130) {
                    lastDrawRippleAt = now;
                    const ripple = document.createElement('div');
                    ripple.className = 'water-ripple';
                    ripple.style.left = mouseXPct + '%';
                    ripple.style.top = mouseYPct + '%';
                    waterBody.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 2000);
                }
            }

            if (isDragging && draggedFish) {
                const waterRect = waterBody.getBoundingClientRect();
                const x = (e.clientX - waterRect.left) / waterRect.width * 100;
                const y = (e.clientY - waterRect.top) / waterRect.height * 100;
                
                draggedFish.x = Math.max(3, Math.min(97, x));
                draggedFish.y = Math.max(8, Math.min(92, y));
                
                const vx = (draggedFish.x - lastDragX) * 80;
                const vy = (draggedFish.y - lastDragY) * 80;
                
                draggedFish.vx = vx * 0.25;
                draggedFish.vy = vy * 0.25;
                draggedFish.targetVx = vx * 0.15;
                draggedFish.targetVy = vy * 0.15;
                
                lastDragX = draggedFish.x;
                lastDragY = draggedFish.y;
            }
        });
        
        tank.addEventListener('mouseleave', () => {
            isMouseInTank = false;
            cursorGlow.style.opacity = '0';
            isDragging = false;
            draggedFish = null;
            // 按着撸到一半滑出鱼缸，也要把鱼放开，否则它会一直跟着光标
            clearPetting();
        });
        
        tank.addEventListener('mouseenter', () => {
            cursorGlow.style.opacity = '1';
            if (typeof wakeCat === 'function') wakeCat();
        });

        // ========== 移动端触摸拖拽 ==========

        function getTouchPos(e) {
            const rect = waterBody.getBoundingClientRect();
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) / rect.width * 100,
                y: (touch.clientY - rect.top) / rect.height * 100
            };
        }

        function findFishAt(x, y) {
            for (let i = fishes.length - 1; i >= 0; i--) {
                const fish = fishes[i];
                const dx = Math.abs(fish.x - x);
                const dy = Math.abs(fish.y - y);
                if (Math.sqrt(dx*dx + dy*dy) < 8) return fish;
            }
            return null;
        }

        tank.addEventListener('touchstart', (e) => {
            const pos = getTouchPos(e);
            const fish = findFishAt(pos.x, pos.y);
            if (fish) {
                touchDragStart = { fish, startX: pos.x, startY: pos.y, time: Date.now() };
            } else {
                touchDragStart = { fish: null, startX: pos.x, startY: pos.y, time: Date.now() };
            }
        }, { passive: true });

        tank.addEventListener('touchmove', (e) => {
            if (!touchDragStart || !touchDragStart.fish) return;
            e.preventDefault();
            const pos = getTouchPos(e);
            const dx = pos.x - touchDragStart.startX;
            const dy = pos.y - touchDragStart.startY;

            if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
                const fish = touchDragStart.fish;
                fish.x = Math.max(3, Math.min(97, pos.x));
                fish.y = Math.max(8, Math.min(92, pos.y));
                fish.vx = dx * 4;
                fish.vy = dy * 4;
                fish.targetVx = dx * 2;
                fish.targetVy = dy * 2;
                fish.element.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.08)) brightness(1.1)';
                isDragging = true;
            }
        }, { passive: false });

        tank.addEventListener('touchend', (e) => {
            if (touchDragStart && touchDragStart.fish && isDragging) {
                touchDragStart.fish.element.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))';
            }
            touchDragStart = null;
            isDragging = false;
        }, { passive: true });

        // ========== 点击投喂 ==========
        let lastFeedClickAt = 0;

        tank.addEventListener('click', (e) => {
            if (e.button !== 0) return;

            const rect = waterBody.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width * 100;
            const y = (e.clientY - rect.top) / rect.height * 100;

            // 点到鱼 → 看这条鱼的档案，而不是往下丢饲料
            const hit = findFishAt(x, y);
            if (hit) {
                // 刚撸完松手也会触发 click，这时不要再弹一次档案
                if (Date.now() >= suppressDossierUntil) showFishDossier(hit);
                return;
            }

            // 双击的第二下不投食：双击是"让鱼跃出水面"，否则会连掉两粒饲料
            const now = Date.now();
            if (now - lastFeedClickAt < 320) { lastFeedClickAt = 0; return; }
            lastFeedClickAt = now;

            const food = document.createElement('div');
            food.className = 'food-pellet';
            
            food.style.left = x + '%';
            food.style.top = Math.max(8, y - 4) + '%';
            foodLayer.appendChild(food);
            
            const foodObj = {
                x: x,
                y: Math.max(8, y - 4),
                element: food,
                vy: 0.11 + Math.random() * 0.08
            };
            foods.push(foodObj);
            nudgeFishToFood(foodObj, 44);
            
            const sink = () => {
                if (!document.body.contains(food)) return;
                
                foodObj.y += foodObj.vy;
                food.style.top = foodObj.y + '%';
                
                foodObj.x += Math.sin(foodObj.y * 0.07) * 0.06;
                food.style.left = foodObj.x + '%';
                
                if (foodObj.y < 88) {
                    requestAnimationFrame(sink);
                } else {
                    food.style.opacity = '0.15';
                    setTimeout(() => {
                        if (document.body.contains(food)) {
                            food.remove();
                            foods = foods.filter(f => f !== foodObj);
                        }
                    }, 6000);
                }
            };
            requestAnimationFrame(sink);
            
            const ripple = document.createElement('div');
            ripple.className = 'water-ripple';
            ripple.style.left = x + '%';
            ripple.style.top = y + '%';
            waterBody.appendChild(ripple);
            setTimeout(() => ripple.remove(), 2000);
        });
        
        // 右键拖拽
        tank.addEventListener('mousedown', (e) => {
            // 左键按在鱼身上 → 撸鱼（右键才是拖拽）
            if (e.button === 0) {
                clearPetting();   // 防御：上一次没收到 mouseup 时不至于残留
                const r = waterBody.getBoundingClientRect();
                const fx = (e.clientX - r.left) / r.width * 100;
                const fy = (e.clientY - r.top) / r.height * 100;
                const fish = findFishAt(fx, fy);
                if (fish) {
                    pettingFish = fish;
                    petStartAt = Date.now();
                    fish.petting = true;
                    // 别让它一边被摸一边还在做随机动作
                    if (fish.eventType) fish.finishEvent(0.8);
                }
                return;
            }

            if (e.button !== 2) return;
            e.preventDefault();

            const rect = waterBody.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / rect.width * 100;
            const clickY = (e.clientY - rect.top) / rect.height * 100;

            for (let i = fishes.length - 1; i >= 0; i--) {
                const fish = fishes[i];
                const dx = Math.abs(fish.x - clickX);
                const dy = Math.abs(fish.y - clickY);
                const distance = Math.sqrt(dx*dx + dy*dy);

                if (distance < 7) {
                    draggedFish = fish;
                    isDragging = true;
                    draggedFish.element.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.08)) brightness(1.1)';
                    break;
                }
            }
        });

        tank.addEventListener('mouseup', (e) => {
            if (pettingFish) {
                // 按住超过 400ms 算"撸"而不是"点"：松手后别再弹一次档案
                if (Date.now() - petStartAt > 400) suppressDossierUntil = Date.now() + 400;
                clearPetting();
            }
            if (isDragging && draggedFish) {
                draggedFish.element.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))';
                draggedFish = null;
                isDragging = false;
            }
        });

        // 松手发生在鱼缸外、或窗口失去焦点（cmd-tab、切标签）时，
        // tank 上的 mouseup/mouseleave 都不会来，鱼会一直黏着光标——
        // 所以补两个兜底
        window.addEventListener('mouseup', clearPetting);
        window.addEventListener('blur', clearPetting);
        
        tank.addEventListener('contextmenu', (e) => e.preventDefault());
        
        function createParticle(x, y) {
            const particle = document.createElement('div');
            particle.className = 'cursor-particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            waterBody.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }

        function nudgeFishToFood(foodObj, radius = 42) {
            fishes.forEach(fish => {
                const dx = foodObj.x - fish.x;
                const dy = foodObj.y - fish.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius || dist < 0.01) return;
                if (!fish.shouldChaseFood(dist, true)) return;

                if (!fish.targetFood || dist < fish.targetFoodDist) {
                    fish.targetFood = foodObj;
                    fish.targetFoodDist = dist;
                }

                if (fish.behavior !== 'flee') {
                    if (fish.eventType) fish.finishEvent(0.85);
                    fish.behavior = 'hunt';
                    fish.behaviorTimer = 0;
                    fish.nextBehaviorTime = 80 + Math.random() * 70;
                }
            });
        }
        
        // 投喂功能
        function feedFish() {
            if (fishes.length === 0) {
                showFeedback('鱼缸里还没有鱼');
                return;
            }
            if (typeof triggerCurious === 'function') triggerCurious();
            const feedCount = 3 + Math.floor(Math.random() * 3);
            const spreadWidth = 40 + Math.random() * 25;
            
            for (let i = 0; i < feedCount; i++) {
                setTimeout(() => {
                    const food = document.createElement('div');
                    food.className = 'food-pellet';
                    
                    const centerX = 50;
                    const startX = Math.max(12, Math.min(88, centerX + (Math.random() - 0.5) * spreadWidth));
                    food.style.left = startX + '%';
                    food.style.top = (8 + Math.random() * 3) + '%';
                    foodLayer.appendChild(food);
                    
                    const foodObj = {
                        x: startX,
                        y: 8 + Math.random() * 3,
                        element: food,
                        vy: 0.11 + Math.random() * 0.11
                    };
                    foods.push(foodObj);
                    nudgeFishToFood(foodObj, 46);
                    
                    const sink = () => {
                        if (!document.body.contains(food)) return;
                        
                        foodObj.y += foodObj.vy;
                        food.style.top = foodObj.y + '%';
                        
                        foodObj.x += Math.sin(foodObj.y * (0.06 + Math.random() * 0.025)) * (0.05 + Math.random() * 0.03);
                        food.style.left = foodObj.x + '%';
                        
                        if (foodObj.y < 87 + Math.random() * 3) {
                            requestAnimationFrame(sink);
                        } else {
                            food.style.opacity = (0.11 + Math.random() * 0.08).toString();
                            setTimeout(() => {
                                if (document.body.contains(food)) {
                                    food.remove();
                                    foods = foods.filter(f => f !== foodObj);
                                }
                            }, 2500 + Math.random() * 1100);
                        }
                    };
                    requestAnimationFrame(sink);
                }, i * (40 + Math.random() * 60));
            }
        }
        
        function createBubble(x, y) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            const size = 4 + Math.random() * 10;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';
            bubble.style.left = (x || (10 + Math.random() * 80)) + '%';
            bubble.style.bottom = y ? (100 - y + Math.random() * 2) + '%' : (4 + Math.random() * 15) + '%';
            bubble.style.animationDuration = (3.5 + Math.random() * 4) + 's';
            bubble.style.animationDelay = (Math.random() * 0.4) + 's';
            bubbleLayer.appendChild(bubble);
            
            setTimeout(() => {
                if (document.body.contains(bubble)) {
                    bubble.remove();
                }
            }, 7500 + Math.random() * 800);
        }
        
        // 简易提示
        const MAX_FISH = 12;

        function showFeedback(msg) {
            let toast = document.getElementById('feedback-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'feedback-toast';
                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);color:#e0e8e0;padding:6px 18px;border-radius:20px;font-size:13px;z-index:200;opacity:0;transition:opacity 0.3s;pointer-events:none;white-space:nowrap;';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.opacity = '1';
            clearTimeout(toast._hide);
            toast._hide = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
        }

        function addFish() {
            if (fishes.length >= MAX_FISH) {
                showFeedback(`鱼缸最多容纳 ${MAX_FISH} 条鱼`);
                return;
            }
            fishes.push(new Fish());
            if (fishes.length >= MAX_FISH) showFeedback('鱼缸已满');
        }

        function scatterFish() {
            if (fishes.length === 0) {
                showFeedback('鱼缸里还没有鱼');
                return;
            }
            fishes.forEach(fish => fish.scatter());
            showFeedback('鱼儿受惊四散');
            if (typeof triggerStartle === 'function') triggerStartle();

            const rippleCount = 2 + Math.floor(Math.random() * 2);
            for(let i = 0; i < rippleCount; i++) {
                setTimeout(() => {
                    const ripple = document.createElement('div');
                    ripple.className = 'water-ripple';
                    ripple.style.left = (18 + Math.random() * 64) + '%';
                    ripple.style.top = (25 + Math.random() * 50) + '%';
                    waterBody.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 2000);
                }, i * (50 + Math.random() * 60));
            }
        }

        // ========== 鱼的档案 ==========
        // 点中某条鱼时给它的"身份"：种类来自物种表，年龄来自 updateAging，
        // 已食口数来自 consumeSingleFood——都是鱼自己一路攒下来的状态。
        function showFishDossier(fish) {
            // 寿终的老鱼：第一次点只给提示，第二次点才真的送走——
            // 免得随手一点就把一条养了很久的鱼弄没了
            if (fish.isElderly) {
                if (fish._releaseArmed) {
                    fish._releaseArmed = false;
                    releaseFish(fish);
                    return;
                }
                fish._releaseArmed = true;
                setTimeout(() => { fish._releaseArmed = false; }, 4000);
                showFeedback('它已经老了 · 再点一次放生');
                return;
            }

            const sp = fish.species || {};
            const age = fish.age || 0;
            const stage = age < 0.25 ? '幼' : age < 0.6 ? '壮' : age < 0.9 ? '暮' : '老';
            showFeedback(`${sp.name || '鱼'} · ${stage} · 已食 ${fish.eatCount || 0} 口`);

            // 记进鱼谱（见过就点亮）
            if (sp.key && G.markSpeciesSeen) G.markSpeciesSeen(sp.key);

            // 被点到要有反应，否则不知道点中了没有
            if (!fish.eventType && fish.behavior !== 'flee') {
                fish.startEvent('dart');
            }
        }

        // ========== 送别老鱼 ==========
        function releaseFish(fish) {
            const el = fish.element;
            if (!el || !document.body.contains(el)) return;

            fish.petting = false;
            // 关键帧要接管 transform，所以把鱼自身的缩放与朝向用 CSS 变量交给它
            // （沿用跳跃动画那套 --sx/--sy/--flip），否则动画第一帧会跳一下
            const facingRight = fish.vx >= 0;
            el.style.setProperty('--sx', facingRight ? fish.size : -fish.size);
            el.style.setProperty('--sy', fish.size);
            el.style.setProperty('--flip', facingRight ? 1 : -1);
            el.classList.add('releasing');

            // 先从 fishes 里摘掉：主循环不再更新它，才不会和 CSS 动画抢 transform
            fishes = fishes.filter(f => f !== fish);
            setTimeout(() => el.remove(), 1800);

            const ripple = document.createElement('div');
            ripple.className = 'water-ripple';
            ripple.style.left = fish.x + '%';
            ripple.style.top = Math.max(4, fish.y - 2) + '%';
            waterBody.appendChild(ripple);
            setTimeout(() => ripple.remove(), 2000);

            let n = 0;
            try {
                n = (parseInt(localStorage.getItem('guanyu-released') || '0', 10) || 0) + 1;
                localStorage.setItem('guanyu-released', String(n));
            } catch (e) {}
            showFeedback('送别了一条老鱼 · 累计 ' + n + ' 条');
        }

        // ========== 双击水面：挑一条鱼跃出 ==========
        function leapOneFish() {
            const candidates = fishes.filter(f => !f.eventType && f.behavior !== 'flee');
            if (candidates.length === 0) {
                showFeedback('鱼儿们正忙着');
                return;
            }
            const fish = candidates[Math.floor(Math.random() * candidates.length)];
            fish.leapCooldown = 0;
            fish.startEvent('leap');
            showFeedback('鱼跃出水面');
        }

        tank.addEventListener('dblclick', (e) => {
            if (e.button !== 0) return;
            leapOneFish();
        });

        // ========== 定格成图 ==========
        // 场景是 DOM+SVG 而不是 canvas，所以只能把 DOM 序列化进 foreignObject
        // 再栅格化。已知代价：backdrop-filter（毛玻璃）在 canvas 栅格化里不被支持、
        // 外部字体也不会加载，所以成图会比真实画面"平"一些——先用底色垫一层。
        const SNAP_PROPS = [
            'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
            'stop-color', 'stop-opacity',
            'opacity', 'color', 'background-color', 'background-image', 'background-size',
            'background-position', 'border-radius', 'border-color', 'border-width', 'border-style',
            'box-shadow', 'filter', 'transform', 'transform-origin', 'mix-blend-mode',
            'font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height',
            'text-align', 'white-space', 'writing-mode', 'text-orientation',
            'position', 'left', 'top', 'right', 'bottom', 'width', 'height',
            'margin', 'padding', 'display', 'flex-direction', 'align-items', 'justify-content',
            'gap', 'overflow', 'visibility'
        ];

        // 逐节点把"当前这一帧"的计算样式抄进克隆体。
        // 注意必须在删掉控制条之前调用：这个函数是按索引并行遍历两棵树的，
        // 结构一旦被改就对不上了。
        function inlineComputed(src, dst) {
            const cs = window.getComputedStyle(src);
            let css = '';
            for (let i = 0; i < SNAP_PROPS.length; i++) {
                const v = cs.getPropertyValue(SNAP_PROPS[i]);
                if (v && v !== 'none' && v !== 'normal' && v !== 'auto') css += SNAP_PROPS[i] + ':' + v + ';';
            }
            dst.setAttribute('style', css);
            const s = src.children, d = dst.children;
            for (let i = 0; i < s.length && i < d.length; i++) inlineComputed(s[i], d[i]);
        }

        function renderTankToCanvas(cb) {
            const tankEl = document.querySelector('.glass-tank');
            if (!tankEl) { cb(null); return; }

            const rect = tankEl.getBoundingClientRect();
            const W = Math.round(rect.width), H = Math.round(rect.height);
            if (W < 10 || H < 10) { cb(null); return; }
            const SCALE = 2;

            const clone = tankEl.cloneNode(true);
            inlineComputed(tankEl, clone);
            // 控制条和光标辉光不属于"鱼缸"本身，抄完样式再删
            clone.querySelectorAll('.controls, .cursor-glow').forEach(function (e) { e.remove(); });

            let html;
            try {
                html = new XMLSerializer().serializeToString(clone);
            } catch (e) { cb(null); return; }

            // viewBox 必须是 W×H、渲染尺寸是 W*SCALE×H*SCALE，
            // 否则 foreignObject 里的内容会以 1:1 挤在左上角，而不是铺满
            const svg =
                '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W * SCALE) + '" height="' + (H * SCALE) + '"' +
                ' viewBox="0 0 ' + W + ' ' + H + '">' +
                '<foreignObject x="0" y="0" width="' + W + '" height="' + H + '">' +
                '<div xmlns="http://www.w3.org/1999/xhtml" ' +
                'style="position:relative;width:' + W + 'px;height:' + H + 'px;margin:0;padding:0;overflow:hidden;">' +
                html +
                '</div></foreignObject></svg>';

            const img = new Image();
            img.onload = function () {
                const cv = document.createElement('canvas');
                cv.width = W * SCALE;
                cv.height = H * SCALE;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#dceade';
                ctx.fillRect(0, 0, cv.width, cv.height);
                ctx.drawImage(img, 0, 0, cv.width, cv.height);
                cb(cv);
            };
            img.onerror = function () { cb(null); };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }

        const snapBtn = document.getElementById('snapBtn');
        if (snapBtn) {
            snapBtn.addEventListener('click', function () {
                showFeedback('正在生成…');
                renderTankToCanvas(function (cv) {
                    if (!cv) { showFeedback('这张图没能生成'); return; }
                    cv.toBlob(function (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = '观鱼-' + new Date().toISOString().slice(0, 10) + '.png';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
                        showFeedback('已存成图片');
                    }, 'image/png');
                });
            });
        }
