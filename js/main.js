window.__GUANYU = window.__GUANYU || {};

// ========== 页面可见性控制 ==========
        let animFrameId = null;
        let bubbleIntervalId = null;
        let pausedByUser = false;   // 用户按空格暂停过：这时切回标签页也不该自动恢复

        function startAnimation() {
            function animate() {
                try {
                    // Update fish
                    fishes.forEach(fish => fish.update());

                    // Fear propagation (every 6 frames)
                    if (fishes.length > 0 && fishes[0].behaviorTimer % 6 === 0 && typeof propagateFear === 'function') {
                        propagateFear();
                    }

                    // Feeding frenzy effect
                    if (typeof getFrenzyLevel === 'function') {
                        const frenzy = getFrenzyLevel();
                        if (frenzy > 0 && typeof applyFeedingFrenzy === 'function') {
                            applyFeedingFrenzy(frenzy);
                        }
                        const tankEl = document.getElementById('tank');
                        if (tankEl) tankEl.classList.toggle('frenzy', frenzy > 0.3);
                    }

                    // Update cat behavior state machine
                    if (typeof updateCat === 'function') {
                        updateCat();
                    } else {
                        updateCatEyes();
                    }
                } catch(e) {
                    // Silent catch - don't crash animation loop
                }
                animFrameId = requestAnimationFrame(animate);
            }
            animFrameId = requestAnimationFrame(animate);
        }

        function stopAnimation() {
            if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAnimation();
            } else if (!pausedByUser && fishes.length > 0) {
                startAnimation();
            }
        });

        // ========== 暂停与键盘快捷键 ==========
        function togglePause() {
            pausedByUser = !pausedByUser;
            if (pausedByUser) stopAnimation(); else startAnimation();
            if (typeof showFeedback === 'function') {
                showFeedback(pausedByUser ? '已暂停 · 空格继续' : '继续观鱼');
            }
        }
        window.__GUANYU.togglePause = togglePause;

        document.addEventListener('keydown', (e) => {
            // 别抢输入框的按键：嵌入弹窗里有两个 textarea
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                togglePause();
                return;
            }

            if (pausedByUser) return;
            const k = e.key.toLowerCase();
            if (k === 'f' && typeof feedFish === 'function') feedFish();
            else if (k === 's' && typeof scatterFish === 'function') scatterFish();
        });

        // ========== 初始化 ==========
        function init() {
            try {
                // 确保 updateSwimModeBtn 存在
                if (typeof updateSwimModeBtn === 'function') updateSwimModeBtn();

                const initialFishCount = 5 + Math.floor(Math.random() * 3);
                for(let i = 0; i < initialFishCount; i++) {
                    setTimeout(() => {
                        if (typeof Fish === 'function') {
                            fishes.push(new Fish());
                        }
                    }, i * (200 + Math.random() * 200));
                }

                // 气泡定时器
                if (typeof createBubble === 'function' && !bubbleIntervalId) {
                    bubbleIntervalId = setInterval(() => createBubble(), 1600 + Math.random() * 1200);
                }

                startAnimation();
            } catch(e) {
                console.error('观鱼初始化出错:', e);
            }
        }

        // 页面加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    

