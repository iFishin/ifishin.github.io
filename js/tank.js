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
const htmlSnippet = '<a href="' + baseUrl + '/card.html" target="_blank" rel="noopener">\n  <img src="' + baseUrl + '/card-preview.png"\n       alt="观鱼 - 水墨风格在线鱼缸"\n       width="480" height="240"\n       style="border-radius:12px;">\n</a>\n\n<!-- 或者用 iframe 嵌入动态卡片 -->\n<!-- <iframe src="' + baseUrl + '/card.html" width="480" height="240" frameborder="0" style="border-radius:12px;overflow:hidden;" title="观鱼 - 水墨风格在线鱼缸"></iframe> -->';
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
        tank.addEventListener('click', (e) => {
            if (e.button !== 0) return;
            
            const rect = waterBody.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width * 100;
            const y = (e.clientY - rect.top) / rect.height * 100;
            
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
            if (isDragging && draggedFish) {
                draggedFish.element.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))';
                draggedFish = null;
                isDragging = false;
            }
        });
        
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
