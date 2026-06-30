window.__GUANYU = window.__GUANYU || {};
var G = window.__GUANYU;

// Global shared state (accessible to all modules)
var fishes = [];
var foods = [];
G.fishes = fishes;
G.foods = foods;
const fishColors = [
            { body: '#e95732', tail: '#d1482a', name: '赤' },
            { body: '#6b9e6b', tail: '#4a8a4a', name: '碧' },
            { body: '#3b82f6', tail: '#1e40af', name: '靛' },
            { body: '#64748b', tail: '#3b3f4a', name: '墨' },
            { body: '#f59e0b', tail: '#c4900a', name: '金' },
            { body: '#8b5cf6', tail: '#5b2fa6', name: '紫' },
            { body: '#e95732', tail: '#c73a1a', name: '绯' },
            { body: '#6b9e6b', tail: '#3d7a3d', name: '翠' }
        ];

        const SWIM_PROFILES = [
            { key: 'zen', label: '禅意', speed: 1.08, eventRate: 0.78, schooling: 1.1, huntBias: 0.72, cursorInterest: 0.72, burst: 0.9 },
            { key: 'agile', label: '灵动', speed: 1.28, eventRate: 1.0, schooling: 1.0, huntBias: 1.0, cursorInterest: 1.0, burst: 1.15 },
            { key: 'playful', label: '调皮', speed: 1.45, eventRate: 1.42, schooling: 0.9, huntBias: 0.86, cursorInterest: 1.35, burst: 1.35 }
        ];
        let swimProfileIndex = 1;
        let currentSwimProfile = SWIM_PROFILES[swimProfileIndex];

        function updateSwimModeBtn() {
            const btn = document.getElementById('swimModeBtn');
            if (btn) btn.textContent = `节奏：${currentSwimProfile.label}`;
        }

        function applySwimProfileToFish(fish) {
            fish.maxSpeed = fish.baseMaxSpeed * currentSwimProfile.speed;
            fish.normalSpeed = fish.baseNormalSpeed * (0.95 + currentSwimProfile.speed * 0.25);
            fish.cruiseSpeed = fish.normalSpeed * (0.88 + Math.random() * 0.32);
            fish.burstCooldown = Math.max(36, fish.burstCooldown / currentSwimProfile.eventRate);
            fish.nextEventIn = Math.max(40, fish.nextEventIn / currentSwimProfile.eventRate);
        }

        function cycleSwimMode() {
            swimProfileIndex = (swimProfileIndex + 1) % SWIM_PROFILES.length;
            currentSwimProfile = SWIM_PROFILES[swimProfileIndex];
            updateSwimModeBtn();
            fishes.forEach(fish => applySwimProfileToFish(fish));
        }
        
        class Fish {
            constructor(x, y) {
                this.x = x || (15 + Math.random() * 70);
                this.y = y || (20 + Math.random() * 55);
                this.vx = (Math.random() - 0.5) * (0.7 + Math.random() * 0.4);
                this.vy = (Math.random() - 0.5) * (0.2 + Math.random() * 0.2);
                this.targetVx = this.vx;
                this.targetVy = this.vy;
                this.baseMaxSpeed = 2.25 + Math.random() * 0.95;
                this.baseNormalSpeed = 0.72 + Math.random() * 0.42;
                this.maxSpeed = this.baseMaxSpeed * currentSwimProfile.speed;
                this.normalSpeed = this.baseNormalSpeed * (0.95 + currentSwimProfile.speed * 0.25);
                this.dragCoeff = 0.94 + Math.random() * 0.03;
                this.size = 0.7 + Math.random() * 0.3;
                this.baseSize = this.size;
                this.colorIndex = Math.floor(Math.random() * fishColors.length);
                this.color = fishColors[this.colorIndex];
                this.eatCount = 0;
                this.growthStage = 0;
                this.behavior = 'wander';
                this.behaviorTimer = 0;
                this.nextBehaviorTime = 45 + Math.random() * 120;
                this.targetFood = null;
                this.targetFoodDist = Infinity;
                this.avoidForce = { x: 0, y: 0 };
                this.tailPhase = Math.random() * Math.PI * 2;
                this.bodyPhase = Math.random() * Math.PI * 2;
                this.speedPulsePhase = Math.random() * Math.PI * 2;
                this.tailFrequency = 0.09 + Math.random() * 0.035;
                this.tailAmplitudeBase = 5 + Math.random() * 2.4;
                this.preferredDepth = 22 + Math.random() * 58;
                this.depthWanderTimer = 120 + Math.random() * 220;
                this.wanderTurnInterval = 16 + Math.random() * 20;
                this.cruiseSpeed = this.normalSpeed * (0.9 + Math.random() * 0.35);
                this.turnMemory = Math.atan2(this.vy, this.vx);
                this.burstCooldown = 120 + Math.random() * 180;
                this.schoolForce = { x: 0, y: 0 };
                this.personality = {
                    curiosity: 0.35 + Math.random() * 0.65,
                    playfulness: 0.3 + Math.random() * 0.7,
                    sociability: 0.35 + Math.random() * 0.65,
                    boldness: 0.25 + Math.random() * 0.75,
                    appetite: 0.18 + Math.random() * 0.95,
                    competitiveness: 0.15 + Math.random() * 0.9
                };
                this.hunger = 0.35 + Math.random() * 0.65;
                this.foodCooldown = 0;
                this.eventType = null;
                this.eventTimer = 0;
                this.eventDuration = 0;
                this.eventData = null;
                this.nextEventIn = (100 + Math.random() * 260) / currentSwimProfile.eventRate;
                this.peerNudgeCooldown = 50 + Math.random() * 110;
                this.eyeBlinkTimer = 0;
                this.eyeBlinkDuration = 0;
                this.blinkDurationFrames = 8 + Math.random() * 4;
                this.nextBlinkTime = 55 + Math.random() * 150;
                this.isBlinking = false;
                this.pupilPhase = Math.random() * Math.PI * 2;
                this.mouthPhase = Math.random() * Math.PI * 2;
                this.element = this.createSVGElement();
            }
            
            createSVGElement() {
                const div = document.createElement('div');
                div.className = 'fish';
                div.style.width = '80px';
                div.style.height = '40px';

                const svgNS = "http://www.w3.org/2000/svg";
                const svg = document.createElementNS(svgNS, 'svg');
                svg.setAttribute('viewBox', '0 0 120 60');
                svg.style.overflow = 'visible';

                const defs = document.createElementNS(svgNS, 'defs');
                const gradId = `grad-${this.color.name}-${Math.floor(Math.random()*1000)}`;
                defs.innerHTML = `
                    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${this.color.tail}" />
                        <stop offset="60%" style="stop-color:${this.color.body}" />
                        <stop offset="100%" style="stop-color:${this.color.body}" />
                    </linearGradient>
                `;
                svg.appendChild(defs);

                // 尾鳍 - 扇形淡彩，匹配 badge 风格
                const tail = document.createElementNS(svgNS, 'path');
                tail.setAttribute('d', 'M 26,30 C 15,14 2,20 2,30 C 2,40 15,46 26,30 Z');
                tail.setAttribute('fill', this.color.tail);
                tail.setAttribute('opacity', '0.35');
                tail.style.transformOrigin = '26px 30px';
                this.tailElement = tail;
                svg.appendChild(tail);

                // 尾鳍内层（更淡）
                const tailInner = document.createElementNS(svgNS, 'path');
                tailInner.setAttribute('d', 'M 26,30 C 18,18 6,23 6,30 C 6,37 18,42 26,30 Z');
                tailInner.setAttribute('fill', this.color.tail);
                tailInner.setAttribute('opacity', '0.15');
                tailInner.style.transformOrigin = '26px 30px';
                svg.appendChild(tailInner);

                // 背鳍
                const dorsal = document.createElementNS(svgNS, 'path');
                dorsal.setAttribute('d', 'M 40,12 C 48,6 56,6 60,12 C 56,13 52,14 40,12 Z');
                dorsal.setAttribute('fill', this.color.tail);
                dorsal.setAttribute('opacity', '0.25');
                dorsal.style.transformOrigin = '50px 12px';
                this.dorsalElement = dorsal;
                svg.appendChild(dorsal);

                // 腹鳍
                const ventral = document.createElementNS(svgNS, 'path');
                ventral.setAttribute('d', 'M 44,48 C 48,54 52,54 56,50 C 52,49 48,48 44,48 Z');
                ventral.setAttribute('fill', this.color.tail);
                ventral.setAttribute('opacity', '0.18');
                svg.appendChild(ventral);

                // 胸鳍（左）
                const pectoralLeft = document.createElementNS(svgNS, 'path');
                pectoralLeft.setAttribute('d', 'M 44,40 C 38,44 36,50 42,48 C 46,46 48,44 44,40 Z');
                pectoralLeft.setAttribute('fill', this.color.tail);
                pectoralLeft.setAttribute('opacity', '0.2');
                pectoralLeft.style.transformOrigin = '44px 40px';
                this.pectoralLeftElement = pectoralLeft;
                svg.appendChild(pectoralLeft);

                // 胸鳍（右）
                const pectoralRight = document.createElementNS(svgNS, 'path');
                pectoralRight.setAttribute('d', 'M 44,20 C 38,16 36,10 42,12 C 46,14 48,16 44,20 Z');
                pectoralRight.setAttribute('fill', this.color.tail);
                pectoralRight.setAttribute('opacity', '0.2');
                pectoralRight.style.transformOrigin = '44px 20px';
                this.pectoralRightElement = pectoralRight;
                svg.appendChild(pectoralRight);

                // 身体
                const body = document.createElementNS(svgNS, 'ellipse');
                body.setAttribute('cx', '58');
                body.setAttribute('cy', '30');
                body.setAttribute('rx', '32');
                body.setAttribute('ry', '18');
                body.setAttribute('fill', `url(#${gradId})`);
                body.setAttribute('opacity', '0.88');
                this.bodyElement = body;
                svg.appendChild(body);

                // 鳃线
                const gill = document.createElementNS(svgNS, 'path');
                gill.setAttribute('d', 'M 76,22 C 78,26 78,34 76,38');
                gill.setAttribute('stroke', 'rgba(200,200,200,0.15)');
                gill.setAttribute('stroke-width', '0.8');
                gill.setAttribute('fill', 'none');
                svg.appendChild(gill);

                // 眼睛
                const eyeGroup = document.createElementNS(svgNS, 'g');
                this.eyeGroup = eyeGroup;

                const eyeWhite = document.createElementNS(svgNS, 'ellipse');
                eyeWhite.setAttribute('cx', '79');
                eyeWhite.setAttribute('cy', '24');
                eyeWhite.setAttribute('rx', '6.5');
                eyeWhite.setAttribute('ry', '6.5');
                eyeWhite.setAttribute('fill', 'rgba(255,255,255,0.75)');
                this.eyeWhite = eyeWhite;

                const eyeBlack = document.createElementNS(svgNS, 'ellipse');
                eyeBlack.setAttribute('cx', '80');
                eyeBlack.setAttribute('cy', '24');
                eyeBlack.setAttribute('rx', '3');
                eyeBlack.setAttribute('ry', '3');
                eyeBlack.setAttribute('fill', 'rgba(20,25,30,0.85)');
                this.eyeBlack = eyeBlack;

                // 眼神光
                const eyeShine = document.createElementNS(svgNS, 'circle');
                eyeShine.setAttribute('cx', '81');
                eyeShine.setAttribute('cy', '23');
                eyeShine.setAttribute('r', '1.2');
                eyeShine.setAttribute('fill', 'white');
                eyeShine.setAttribute('opacity', '0.6');
                this.eyeShine = eyeShine;

                eyeGroup.appendChild(eyeWhite);
                eyeGroup.appendChild(eyeBlack);
                eyeGroup.appendChild(eyeShine);
                svg.appendChild(eyeGroup);

                // 嘴
                const mouth = document.createElementNS(svgNS, 'path');
                mouth.setAttribute('d', 'M 100,32 Q 103,30 100,28');
                mouth.setAttribute('stroke', 'rgba(20,25,30,0.35)');
                mouth.setAttribute('stroke-width', '1.2');
                mouth.setAttribute('fill', 'none');
                this.mouthElement = mouth;
                svg.appendChild(mouth);

                div.appendChild(svg);
                if (fishLayer) fishLayer.appendChild(div);
                return div;
            }
            
            update() {
                this.behaviorTimer++;
                this.depthWanderTimer--;
                this.burstCooldown--;
                this.nextEventIn--;
                this.peerNudgeCooldown--;
                this.speedPulsePhase += 0.015;
                this.hunger = Math.min(1, this.hunger + 0.0008 + this.personality.appetite * 0.0006);
                this.foodCooldown = Math.max(0, this.foodCooldown - 0.08);

                if (this.depthWanderTimer <= 0) {
                    this.preferredDepth = 16 + Math.random() * 70;
                    this.depthWanderTimer = 160 + Math.random() * 260;
                }

                if (this.behaviorTimer >= this.nextBehaviorTime) {
                    this.chooseBehavior();
                    this.behaviorTimer = 0;
                }
                
                if (foods.length > 0 && this.behaviorTimer % 3 === 0 && !this.targetFood) {
                    this.findNearestFood();
                }
                
                if (foods.length > 0 && this.behaviorTimer % 15 === 0) {
                    this.tryRandomFoodHunt();
                }
                
                if (this.targetFood && !document.body.contains(this.targetFood.element)) {
                    this.targetFood = null;
                }
                if (this.targetFood) {
                    const dxFood = this.targetFood.x - this.x;
                    const dyFood = this.targetFood.y - this.y;
                    const distFood = Math.sqrt(dxFood * dxFood + dyFood * dyFood);
                    if (!this.shouldChaseFood(distFood, true)) {
                        this.targetFood = null;
                        if (this.behavior === 'hunt') this.behavior = 'wander';
                    } else {
                        this.targetFoodDist = distFood;
                    }
                }
                
                if (this.behavior === 'wander' && Math.random() < 0.03) {
                    this.targetVy += (Math.random() - 0.5) * 0.4;
                }
                
                if (Math.random() < 0.007) {
                    this.targetVx += (Math.random() - 0.5) * 1;
                    this.targetVy += (Math.random() - 0.5) * 1;
                }

                if (this.behavior !== 'hunt' && this.behavior !== 'flee') {
                    this.applyDepthPreference();
                }
                
                switch(this.behavior) {
                    case 'wander':
                        this.wanderBehavior();
                        break;
                    case 'hunt':
                        this.huntBehavior();
                        break;
                    case 'flee':
                        this.fleeBehavior();
                        break;
                    case 'rest':
                        this.restBehavior();
                        break;
                }

                this.updateRandomEvent();
                
                if (this.behaviorTimer % 5 === 0) {
                    this.updateAvoidance();
                } else {
                    this.avoidForce.x *= 0.9;
                    this.avoidForce.y *= 0.9;
                }

                if (this.behaviorTimer % 6 === 0) {
                    this.updateSchooling();
                } else {
                    this.schoolForce.x *= 0.86;
                    this.schoolForce.y *= 0.86;
                }

                if (this.behaviorTimer % 18 === 0) {
                    this.maybePlayWithNeighbor();
                }
                
                this.targetVx += this.avoidForce.x;
                this.targetVy += this.avoidForce.y;
                this.targetVx += this.schoolForce.x;
                this.targetVy += this.schoolForce.y;

                if (isMouseInTank && !this.targetFood && this.behavior === 'wander') {
                    const cursorDx = mouseXPct - this.x;
                    const cursorDy = mouseYPct - this.y;
                    const cursorDist = Math.sqrt(cursorDx * cursorDx + cursorDy * cursorDy);
                    if (cursorDist < 24 && cursorDist > 0.2) {
                        const cursorPull = (24 - cursorDist) / 24 * 0.03 * currentSwimProfile.cursorInterest;
                        this.targetVx += (cursorDx / cursorDist) * cursorPull;
                        this.targetVy += (cursorDy / cursorDist) * cursorPull * 0.55;
                    }
                }
                
                let vyBoost = 1;
                if (this.targetVy > 0.2) vyBoost = 1.2;
                
                let targetSpeed = Math.sqrt(this.targetVx * this.targetVx + this.targetVy * this.targetVy);
                const speedCap = this.maxSpeed * vyBoost;
                if (targetSpeed > speedCap) {
                    this.targetVx = (this.targetVx / targetSpeed) * speedCap;
                    this.targetVy = (this.targetVy / targetSpeed) * speedCap;
                }
                
                this.vx += (this.targetVx - this.vx) * 0.08;
                this.vy += (this.targetVy - this.vy) * 0.08;
                
                this.vx *= this.dragCoeff;
                this.vy *= this.dragCoeff;
                
                this.handleBoundaries();
                
                const movementStep = 0.108 * currentSwimProfile.speed;
                this.x += this.vx * movementStep;
                this.y += this.vy * movementStep;
                
                this.x = Math.max(3, Math.min(97, this.x));
                this.y = Math.max(8, Math.min(92, this.y));
                
                this.updateAnimation();
                this.updateTransform();
            }

            updateRandomEvent() {
                if (this.targetFood || this.behavior === 'hunt' || this.behavior === 'flee') {
                    if (this.eventType) this.finishEvent(0.9);
                    return;
                }

                if (!this.eventType) {
                    this.tryStartRandomEvent();
                    return;
                }

                this.eventTimer++;
                const t = this.eventTimer / Math.max(1, this.eventDuration);

                switch (this.eventType) {
                    case 'dart':
                        this.handleDartEvent(t);
                        break;
                    case 'orbit':
                        this.handleOrbitEvent(t);
                        break;
                    case 'surfaceSip':
                        this.handleSurfaceSipEvent(t);
                        break;
                    case 'chaseFriend':
                        this.handleChaseFriendEvent(t);
                        break;
                    case 'inspectCursor':
                        this.handleInspectCursorEvent(t);
                        break;
                    case 'bottomPeck':
                        this.handleBottomPeckEvent(t);
                        break;
                    case 'zigzag':
                        this.handleZigzagEvent(t);
                        break;
                    case 'leap':
                        this.handleLeapEvent(t);
                        break;
                    case 'courtship':
                        this.handleCourtshipEvent(t);
                        break;
                }

                if (this.eventTimer >= this.eventDuration) {
                    this.finishEvent();
                }
            }

            tryStartRandomEvent() {
                if (this.nextEventIn > 0) return;

                const baseChance = (0.2 + this.personality.playfulness * 0.36) * currentSwimProfile.eventRate;
                if (Math.random() > baseChance) {
                    this.nextEventIn = (90 + Math.random() * 220) / currentSwimProfile.eventRate;
                    return;
                }

                const events = ['dart', 'orbit', 'zigzag', 'bottomPeck'];
                if (this.personality.sociability > 0.45) events.push('chaseFriend');
                if (this.personality.curiosity > 0.35 && isMouseInTank) events.push('inspectCursor');
                if (this.personality.boldness > 0.4) events.push('surfaceSip');
                if (this.personality.boldness > 0.5 && this.leapCooldown <= 0) events.push('leap');

                const choice = events[Math.floor(Math.random() * events.length)];
                this.startEvent(choice);
            }

            startEvent(type) {
                this.eventType = type;
                this.eventTimer = 0;
                this.eventData = {};
                this.behavior = 'wander';

                if (type === 'dart') {
                    this.eventDuration = 18 + Math.floor(Math.random() * 20);
                    this.eventData.angle = Math.atan2(this.vy, this.vx || 0.0001) + (Math.random() - 0.5) * 0.9;
                } else if (type === 'orbit') {
                    this.eventDuration = 85 + Math.floor(Math.random() * 90);
                    this.eventData.centerX = this.x + (Math.random() - 0.5) * 10;
                    this.eventData.centerY = this.y + (Math.random() - 0.5) * 8;
                    this.eventData.radius = 3.5 + Math.random() * 5.5;
                    this.eventData.dir = Math.random() < 0.5 ? -1 : 1;
                } else if (type === 'surfaceSip') {
                    this.eventDuration = 90 + Math.floor(Math.random() * 80);
                    this.eventData.sipped = false;
                    this.eventData.sideDrift = (Math.random() - 0.5) * 0.5;
                } else if (type === 'chaseFriend') {
                    this.eventDuration = 70 + Math.floor(Math.random() * 80);
                    this.eventData.targetFish = this.findNearbyFish(36);
                    if (!this.eventData.targetFish) {
                        this.finishEvent(0.9);
                        return;
                    }
                    this.eventData.offset = 3 + Math.random() * 4;
                } else if (type === 'inspectCursor') {
                    this.eventDuration = 60 + Math.floor(Math.random() * 70);
                    this.eventData.orbitDir = Math.random() < 0.5 ? -1 : 1;
                    this.eventData.orbitSize = 2 + Math.random() * 3.5;
                } else if (type === 'bottomPeck') {
                    this.eventDuration = 70 + Math.floor(Math.random() * 90);
                    this.eventData.pecked = false;
                } else if (type === 'zigzag') {
                    this.eventDuration = 65 + Math.floor(Math.random() * 75);
                    this.eventData.heading = Math.atan2(this.vy, this.vx || 0.0001);
                    this.eventData.phase = Math.random() * Math.PI * 2;
                } else if (type === 'leap') {
                    this.eventDuration = 90 + Math.floor(Math.random() * 30);
                    this.eventData.splashed = false;
                    this.element.classList.add('leaping');
                } else if (type === 'courtship') {
                    this.eventDuration = 120 + Math.floor(Math.random() * 60);
                    this.eventData.phase = Math.random() * Math.PI * 2;
                }
            }

            finishEvent(cooldownScale = 1) {
                this.eventType = null;
                this.eventData = null;
                this.eventTimer = 0;
                this.eventDuration = 0;
                const minCooldown = 85 + Math.random() * 220;
                this.nextEventIn = minCooldown / Math.max(0.4, cooldownScale) / (0.8 + this.personality.playfulness * 0.6) / currentSwimProfile.eventRate;
            }

            handleDartEvent(t) {
                const ease = Math.max(0.2, 1 - t);
                const burst = this.maxSpeed * (0.75 + this.personality.boldness * 0.45) * ease;
                this.targetVx = Math.cos(this.eventData.angle) * burst;
                this.targetVy = Math.sin(this.eventData.angle) * burst * 0.75;
            }

            handleOrbitEvent(t) {
                const cx = this.eventData.centerX;
                const cy = this.eventData.centerY;
                const dx = cx - this.x;
                const dy = cy - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const radial = (dist - this.eventData.radius) * 0.08;
                const tangential = this.eventData.dir * (0.26 + this.personality.playfulness * 0.22);
                this.targetVx += (dx / dist) * radial + (-dy / dist) * tangential;
                this.targetVy += (dy / dist) * radial + (dx / dist) * tangential * 0.72;
                this.targetVy += Math.sin(t * Math.PI * 2) * 0.02;
            }

            handleSurfaceSipEvent(t) {
                if (this.y > 15) {
                    this.targetVy -= 0.2 + this.personality.boldness * 0.18;
                } else {
                    this.targetVy += 0.03;
                    this.targetVx += this.eventData.sideDrift;
                    if (!this.eventData.sipped) {
                        this.eventData.sipped = true;
                        createBubble(this.x, Math.max(10, this.y - 1));
                        const ripple = document.createElement('div');
                        ripple.className = 'water-ripple';
                        ripple.style.left = this.x + '%';
                        ripple.style.top = Math.max(6, this.y - 2) + '%';
                        waterBody.appendChild(ripple);
                        setTimeout(() => ripple.remove(), 1800);
                    }
                }

                if (t > 0.6) {
                    this.targetVy += (this.preferredDepth - this.y) * 0.02;
                }
            }

            handleChaseFriendEvent() {
                const buddy = this.eventData.targetFish;
                if (!buddy || buddy === this) {
                    this.finishEvent(0.9);
                    return;
                }
                const heading = Math.atan2(buddy.vy, buddy.vx || 0.0001);
                const tx = buddy.x - Math.cos(heading) * this.eventData.offset;
                const ty = buddy.y - Math.sin(heading) * this.eventData.offset * 0.6;
                const dx = tx - this.x;
                const dy = ty - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const speed = Math.min(this.maxSpeed * 0.8, 0.35 + dist * 0.08);
                this.targetVx = (dx / dist) * speed;
                this.targetVy = (dy / dist) * speed * 0.75;
            }

            handleInspectCursorEvent(t) {
                if (!isMouseInTank) {
                    this.finishEvent(0.85);
                    return;
                }
                const angle = t * Math.PI * 2 * this.eventData.orbitDir;
                const tx = mouseXPct + Math.cos(angle) * this.eventData.orbitSize;
                const ty = mouseYPct + Math.sin(angle) * this.eventData.orbitSize * 0.7;
                const dx = tx - this.x;
                const dy = ty - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const speed = Math.min(this.maxSpeed * 0.75, 0.28 + dist * 0.07);
                this.targetVx = (dx / dist) * speed;
                this.targetVy = (dy / dist) * speed * 0.72;
            }

            handleBottomPeckEvent(t) {
                const targetBottom = 85;
                if (this.y < targetBottom) {
                    this.targetVy += 0.16;
                } else {
                    this.targetVy -= 0.05;
                    this.targetVx += Math.sin(this.tailPhase * 1.8) * 0.06;
                    if (!this.eventData.pecked && t > 0.45) {
                        this.eventData.pecked = true;
                        createBubble(this.x, this.y);
                    }
                }
            }

            handleZigzagEvent() {
                this.eventData.phase += 0.2 + this.personality.playfulness * 0.09;
                const base = this.eventData.heading;
                const zig = Math.sin(this.eventData.phase) * (0.55 + this.personality.playfulness * 0.35);
                const angle = base + zig;
                const speed = this.normalSpeed * (1.05 + this.personality.playfulness * 0.5);
                this.targetVx = Math.cos(angle) * speed;
                this.targetVy = Math.sin(angle) * speed * 0.72;
            }

            findNearbyFish(radius) {
                let nearest = null;
                let minDist = radius * radius;
                for (let i = 0; i < fishes.length; i++) {
                    const other = fishes[i];
                    if (other === this) continue;
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDist) {
                        minDist = distSq;
                        nearest = other;
                    }
                }
                return nearest;
            }

            maybePlayWithNeighbor() {
                if (this.peerNudgeCooldown > 0 || this.behavior === 'flee' || this.targetFood) return;
                const mate = this.findNearbyFish(8);
                if (!mate) return;
                if (Math.random() > (0.18 + this.personality.playfulness * 0.35) * currentSwimProfile.eventRate) return;

                const dx = this.x - mate.x;
                const dy = this.y - mate.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const nudge = 0.16 + this.personality.playfulness * 0.18;
                this.targetVx += (dx / dist) * nudge;
                this.targetVy += (dy / dist) * nudge * 0.8;
                this.targetVx += (Math.random() - 0.5) * 0.22;
                this.targetVy += (Math.random() - 0.5) * 0.15;
                this.peerNudgeCooldown = (120 + Math.random() * 180) / currentSwimProfile.eventRate;
            }

            applyDepthPreference() {
                const depthDiff = this.preferredDepth - this.y;
                const pull = Math.max(-0.18, Math.min(0.18, depthDiff * 0.01));
                this.targetVy += pull * 0.4;
            }

            getFoodDrive() {
                const appetite = this.personality.appetite;
                const curiosityBoost = this.personality.curiosity * 0.22;
                const cooldownPenalty = this.foodCooldown * 0.03;
                const drive = this.hunger * (0.58 + appetite * 0.62) + curiosityBoost - cooldownPenalty;
                return Math.max(0, drive * currentSwimProfile.huntBias);
            }

            shouldChaseFood(distance, forcedNotice = false) {
                if (this.behavior === 'flee') return false;
                const drive = this.getFoodDrive();
                const nearBoost = Math.max(0, (38 - distance) / 38) * 0.38;
                const competitiveness = this.personality.competitiveness * 0.24;
                const desirability = drive * 0.58 + nearBoost + competitiveness;
                if (forcedNotice) return desirability > 0.2;
                if (drive < 0.28) return false;
                const chance = Math.max(0.06, Math.min(0.96, desirability));
                return Math.random() < chance;
            }
            
            findNearestFood() {
                let nearest = null;
                let minDist = Infinity;
                const searchRadius = 24 + Math.random() * 12;
                
                for (let i = 0; i < foods.length; i++) {
                    const food = foods[i];
                    const isFoodTaken = fishes.some(f => f.targetFood === food && f !== this);
                    
                    const dx = food.x - this.x;
                    const dy = food.y - this.y;
                    const dist = dx*dx + dy*dy;
                    const distReal = Math.sqrt(dist);
                    
                    const effectiveRadius = isFoodTaken ? searchRadius * 0.5 : searchRadius;
                    if (!this.shouldChaseFood(distReal, false)) continue;
                    
                    if (dist < minDist && dist < effectiveRadius * effectiveRadius) {
                        minDist = dist;
                        nearest = food;
                    }
                }
                
                if (nearest) {
                    this.targetFood = nearest;
                    this.targetFoodDist = Math.sqrt(minDist);
                }
            }
            
            tryRandomFoodHunt() {
                if (foods.length === 0 || Math.random() > 0.1) return;
                
                const randomFood = foods[Math.floor(Math.random() * foods.length)];
                const dx = randomFood.x - this.x;
                const dy = randomFood.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (!this.shouldChaseFood(dist, false)) return;
                
                if (dist < 35 + Math.random() * 15) {
                    this.targetFood = randomFood;
                    this.targetFoodDist = dist;
                    this.behavior = 'hunt';
                    this.nextBehaviorTime = 140 + Math.random() * 80;
                }
            }
            
            updateAvoidance() {
                this.avoidForce.x = 0;
                this.avoidForce.y = 0;
                
                const avoidRadius = 10 + Math.random() * 4;
                const avoidRadiusSq = avoidRadius * avoidRadius;
                
                for (let i = 0; i < fishes.length; i++) {
                    const other = fishes[i];
                    if (other === this) continue;
                    
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distSq = dx*dx + dy*dy;
                    
                    if (distSq < avoidRadiusSq && distSq > 0.1) {
                        const dist = Math.sqrt(distSq);
                        const force = (avoidRadius - dist) / avoidRadius;
                        const forceStrengthX = 0.1 + Math.random() * 0.06;
                        const forceStrengthY = 0.08 + Math.random() * 0.04;
                        this.avoidForce.x -= (dx / dist) * force * forceStrengthX;
                        this.avoidForce.y -= (dy / dist) * force * forceStrengthY;
                    }
                }
            }

            updateSchooling() {
                this.schoolForce.x = 0;
                this.schoolForce.y = 0;
                if (fishes.length < 2 || this.behavior === 'flee') return;

                const schoolRadius = 24;
                const schoolRadiusSq = schoolRadius * schoolRadius;
                let neighbors = 0;
                let alignX = 0;
                let alignY = 0;
                let cohesionX = 0;
                let cohesionY = 0;

                for (let i = 0; i < fishes.length; i++) {
                    const other = fishes[i];
                    if (other === this) continue;

                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > schoolRadiusSq || distSq < 0.2) continue;

                    neighbors++;
                    alignX += other.vx;
                    alignY += other.vy;
                    cohesionX += other.x;
                    cohesionY += other.y;
                }

                if (neighbors === 0) return;

                alignX /= neighbors;
                alignY /= neighbors;
                cohesionX = (cohesionX / neighbors) - this.x;
                cohesionY = (cohesionY / neighbors) - this.y;

                this.schoolForce.x = alignX * 0.02 + cohesionX * 0.004;
                this.schoolForce.y = alignY * 0.018 + cohesionY * 0.003;
                this.schoolForce.x *= currentSwimProfile.schooling;
                this.schoolForce.y *= currentSwimProfile.schooling;
            }
            
            handleBoundaries() {
                const hardMargin = 2;
                const softMargin = 10;
                
                let needsTurn = false;
                
                if (this.x < softMargin) {
                    needsTurn = true;
                    this.targetVx = Math.abs(this.targetVx) + (Math.random() - 0.5) * 0.2;
                } else if (this.x > 100 - softMargin) {
                    needsTurn = true;
                    this.targetVx = -Math.abs(this.targetVx) - (Math.random() - 0.5) * 0.2;
                }
                
                if (this.y < softMargin) {
                    needsTurn = true;
                    this.targetVy = Math.abs(this.targetVy) + (Math.random() - 0.5) * 0.15;
                } else if (this.y > 95 - softMargin) {
                    needsTurn = true;
                    this.targetVy = -Math.abs(this.targetVy) - (Math.random() - 0.5) * 0.15;
                }
                
                if (needsTurn && (this.behavior !== 'flee' && this.behavior !== 'hunt')) {
                    this.behavior = 'flee';
                    this.nextBehaviorTime = 25 + Math.random() * 30;
                }
                
                if (this.x < hardMargin) {
                    this.x = hardMargin;
                    this.vx = Math.abs(this.vx) * 0.5;
                } else if (this.x > 100 - hardMargin) {
                    this.x = 100 - hardMargin;
                    this.vx = -Math.abs(this.vx) * 0.5;
                }
                
                if (this.y < hardMargin) {
                    this.y = hardMargin;
                    this.vy = Math.abs(this.vy) * 0.5;
                } else if (this.y > 95 - hardMargin) {
                    this.y = 95 - hardMargin;
                    this.vy = -Math.abs(this.vy) * 0.5;
                }
            }
            
            chooseBehavior() {
                if (this.targetFood && this.targetFoodDist < 24 + Math.random() * 6) {
                    this.behavior = 'hunt';
                    this.nextBehaviorTime = 120 + Math.random() * 100;
                } else {
                    const rand = Math.random();
                    if (rand < 0.5 + Math.random() * 0.1) {
                        this.behavior = 'wander';
                        this.nextBehaviorTime = 50 + Math.random() * 130;
                    } else if (rand < 0.8 + Math.random() * 0.1) {
                        this.behavior = 'rest';
                        this.nextBehaviorTime = 25 + Math.random() * 80;
                    } else {
                        this.behavior = 'flee';
                        this.nextBehaviorTime = 15 + Math.random() * 50;
                    }
                }
            }
            
            wanderBehavior() {
                const interval = Math.floor(this.wanderTurnInterval);
                if (interval > 0 && this.behaviorTimer % interval === 0) {
                    const angleVariation = (Math.random() - 0.5) * 0.32;
                    const currentAngle = Math.atan2(this.vy, this.vx || 0.0001);
                    const newAngle = currentAngle + angleVariation;
                    const cruiseFactor = 0.86 + Math.sin(this.speedPulsePhase) * 0.2;
                    const newSpeed = Math.max(0.22, this.cruiseSpeed * cruiseFactor);

                    this.targetVx = Math.cos(newAngle) * newSpeed;
                    this.targetVy = Math.sin(newAngle) * newSpeed * 0.72;
                }

                if (this.burstCooldown <= 0 && Math.random() < 0.008) {
                    const heading = Math.atan2(this.targetVy, this.targetVx || 0.0001);
                    const burstSpeed = this.maxSpeed * currentSwimProfile.burst * (0.48 + Math.random() * 0.16);
                    this.targetVx = Math.cos(heading) * burstSpeed;
                    this.targetVy = Math.sin(heading) * burstSpeed * 0.78;
                    this.burstCooldown = (150 + Math.random() * 230) / currentSwimProfile.eventRate;
                }
            }
            
            huntBehavior() {
                if (!this.targetFood) {
                    this.behavior = 'wander';
                    return;
                }
                const dx = this.targetFood.x - this.x;
                const dy = this.targetFood.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const eatDistance = 2 + Math.random() * 0.8;
                
                if (dist < eatDistance) {
                    const eatenCount = this.consumeNearbyFoods(this.targetFood);
                    this.targetFood = null;

                    if (eatenCount > 0) {
                        createBubble(this.x, this.y);

                        if (foods.length > 0 && this.getFoodDrive() > 0.35) {
                            this.findNearestFood();
                        }

                        if (this.targetFood) {
                            this.behavior = 'hunt';
                            this.nextBehaviorTime = 80 + Math.random() * 90;
                        } else {
                            this.behavior = 'rest';
                            this.nextBehaviorTime = 18 + Math.random() * 30;
                        }
                    } else {
                        this.behavior = 'wander';
                    }
                } else {
                    const targetAngle = Math.atan2(dy, dx);
                    const huntSpeed = this.maxSpeed * (0.68 + Math.random() * 0.16);
                    this.targetVx = Math.cos(targetAngle) * huntSpeed;
                    this.targetVy = Math.sin(targetAngle) * huntSpeed * (0.5 + Math.random() * 0.16);
                }
            }

            consumeNearbyFoods(primaryFood) {
                if (!primaryFood) return 0;

                const biteRadius = 2.5 + this.personality.appetite * 2.4;
                const biteLimit = 1 + Math.floor(this.personality.competitiveness * 2 + Math.random() * 2);
                const cx = primaryFood.x;
                const cy = primaryFood.y;

                const candidates = foods
                    .map(food => {
                        const dx = food.x - cx;
                        const dy = food.y - cy;
                        return { food, dist: Math.sqrt(dx * dx + dy * dy) };
                    })
                    .filter(item => item.dist <= biteRadius)
                    .sort((a, b) => a.dist - b.dist)
                    .slice(0, biteLimit);

                let eaten = 0;
                for (let i = 0; i < candidates.length; i++) {
                    if (this.consumeSingleFood(candidates[i].food)) {
                        eaten++;
                    }
                }

                return eaten;
            }

            consumeSingleFood(foodObj) {
                if (!foodObj || !document.body.contains(foodObj.element)) return false;

                foodObj.element.remove();
                foods = foods.filter(f => f !== foodObj);

                this.hunger = Math.max(0.03, this.hunger - (0.22 + this.personality.appetite * 0.16));
                this.foodCooldown = 12 + Math.random() * 12;

                this.eatCount = (this.eatCount || 0) + 1;

                if (this.eatCount < 5) {
                    this.size = Math.min(this.size * (1.03 + Math.random() * 0.008), this.baseSize * 1.12);
                    this.growthStage = 0;
                } else if (this.eatCount < 12) {
                    this.size = Math.min(this.size * (1.018 + Math.random() * 0.008), this.baseSize * 1.28);
                    this.growthStage = 1;
                } else {
                    if (this.growthStage < 2) {
                        this.colorIndex = (this.colorIndex + 1) % fishColors.length;
                        this.color = fishColors[this.colorIndex];
                        this.updateColor();
                        this.element.style.filter = 'drop-shadow(0 0 12px #fbbf24) brightness(1.1)';
                        setTimeout(() => {
                            this.element.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))';
                        }, 600);
                    }
                    this.size = Math.min(this.size * (1.006 + Math.random() * 0.008), this.baseSize * 1.4);
                    this.growthStage = 2;
                }

                return true;
            }
            
            updateColor() {
                const svg = this.element.querySelector('svg');
                const grad = svg.querySelector('linearGradient');
                grad.innerHTML = `
                    <stop offset="0%" style="stop-color:${this.color.tail}" />
                    <stop offset="60%" style="stop-color:${this.color.body}" />
                    <stop offset="100%" style="stop-color:${this.color.body}" />
                `;
                this.tailElement.setAttribute('fill', this.color.tail);
                this.dorsalElement.setAttribute('fill', this.color.tail);
                this.pectoralLeftElement.setAttribute('fill', this.color.tail);
                this.pectoralRightElement.setAttribute('fill', this.color.tail);
                this.bodyElement.setAttribute('fill', `url(#${grad.id})`);
            }
            
            restBehavior() {
                const decelFactor = 0.88 + Math.random() * 0.04;
                this.targetVx *= decelFactor;
                this.targetVy *= decelFactor;
            }
            
            fleeBehavior() {
                if (this.behaviorTimer === 0) {
                    const angle = (Math.random() - 0.5) * Math.PI * (0.75 + Math.random() * 0.4);
                    const fleeSpeed = this.maxSpeed * (0.68 + Math.random() * 0.25);
                    this.targetVx = Math.cos(angle) * fleeSpeed;
                    this.targetVy = Math.sin(angle) * fleeSpeed * (0.45 + Math.random() * 0.25);
                }
            }
            
            updateAnimation() {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                
                this.tailPhase += this.tailFrequency + speed * 0.08;
                const tailAngle = Math.sin(this.tailPhase) * (this.tailAmplitudeBase + speed * 6.5);
                this.tailElement.style.transform = `rotate(${tailAngle}deg)`;
                
                this.bodyPhase += 0.015 + speed * 0.009;
                const breath = 1 + Math.sin(this.bodyPhase) * 0.017;
                this.bodyElement.style.transform = `scale(${breath})`;
                
                const dorsalAngle = Math.sin(this.tailPhase * 0.46) * (3.6 + speed * 3);
                this.dorsalElement.style.transform = `rotate(${dorsalAngle}deg)`;
                
                const pectoralAngle = Math.sin(this.bodyPhase * 1.35 + speed * 0.2) * (9 + speed * 5);
                this.pectoralLeftElement.style.transform = `rotate(${pectoralAngle}deg)`;
                this.pectoralRightElement.style.transform = `rotate(${-pectoralAngle}deg)`;

                this.pupilPhase += 0.08 + speed * 0.03;
                let gazeX = Math.max(-1.4, Math.min(1.4, this.vx * 1.1));
                let gazeY = Math.max(-1.1, Math.min(1.1, this.vy * 0.9));
                if (this.eventType === 'inspectCursor' && isMouseInTank) {
                    const dx = mouseXPct - this.x;
                    const dy = mouseYPct - this.y;
                    gazeX = Math.max(-1.8, Math.min(1.8, dx * 0.09));
                    gazeY = Math.max(-1.4, Math.min(1.4, dy * 0.08));
                } else {
                    gazeX += Math.sin(this.pupilPhase) * 0.25;
                    gazeY += Math.cos(this.pupilPhase * 0.7) * 0.18;
                }
                this.eyeBlack.setAttribute('cx', (80 + gazeX).toFixed(2));
                this.eyeBlack.setAttribute('cy', (24 + gazeY).toFixed(2));
                this.eyeShine.setAttribute('cx', (81 + gazeX * 0.5).toFixed(2));
                this.eyeShine.setAttribute('cy', (23 + gazeY * 0.3).toFixed(2));

                this.mouthPhase += 0.04 + speed * 0.02;
                const mouthOpen = 0.5 + Math.sin(this.mouthPhase) * 0.6 + (this.eventType === 'surfaceSip' ? 0.5 : 0);
                const mouthTop = (30 - mouthOpen).toFixed(2);
                const mouthBottom = (30 + mouthOpen).toFixed(2);
                this.mouthElement.setAttribute('d', `M 105,${mouthBottom} Q 108,30 105,${mouthTop}`);
                
                this.eyeBlinkTimer++;
                
                if (this.eyeBlinkTimer >= this.nextBlinkTime) {
                    this.isBlinking = true;
                    this.eyeBlinkDuration = 0;
                    this.eyeBlinkTimer = 0;
                    this.blinkDurationFrames = 7 + Math.random() * 4;
                    this.nextBlinkTime = 60 + Math.random() * 160;
                }
                
                let eyeScale = 1;
                
                if (this.isBlinking) {
                    this.eyeBlinkDuration++;
                    const blinkDuration = this.blinkDurationFrames;
                    
                    if (this.eyeBlinkDuration < blinkDuration / 2) {
                        eyeScale = 1 - (this.eyeBlinkDuration / (blinkDuration / 2));
                    } else if (this.eyeBlinkDuration < blinkDuration) {
                        eyeScale = (this.eyeBlinkDuration - blinkDuration / 2) / (blinkDuration / 2);
                    } else {
                        this.isBlinking = false;
                        eyeScale = 1;
                    }
                }
                
                this.eyeWhite.setAttribute('ry', (6.5 * eyeScale).toFixed(2));
                this.eyeBlack.setAttribute('ry', (3 * eyeScale).toFixed(2));
            }
            
            updateTransform() {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 0.015) {
                    const angle = Math.atan2(this.vy, this.vx || 0.0001);
                    let delta = angle - this.turnMemory;
                    while (delta > Math.PI) delta -= Math.PI * 2;
                    while (delta < -Math.PI) delta += Math.PI * 2;
                    this.turnMemory += delta * 0.16;
                }

                const degrees = this.turnMemory * 180 / Math.PI;
                
                const maxTilt = 40;
                let displayAngle = Math.max(-maxTilt, Math.min(maxTilt, degrees));
                
                const facingRight = this.vx >= 0;
                this.element.style.left = this.x + '%';
                this.element.style.top = this.y + '%';
                
                if (facingRight) {
                    this.element.style.transform = `translate(-50%, -50%) scale(${this.size}) rotate(${displayAngle}deg)`;
                } else {
                    this.element.style.transform = `translate(-50%, -50%) scale(${-this.size}, ${this.size}) rotate(${-displayAngle}deg)`;
                }
            }
            
            scatter() {
                this.targetFood = null;
                this.behavior = 'flee';
                this.finishEvent(0.95);
                this.nextBehaviorTime = 30 + Math.random() * 50;
                const scatterForce = this.maxSpeed * (1.3 + Math.random() * 0.7);
                this.targetVx = (Math.random() - 0.5) * scatterForce * (1.3 + Math.random() * 0.4);
                this.targetVy = (Math.random() - 0.5) * scatterForce * (0.7 + Math.random() * 0.3);
            }
        }

// ========== 新增鱼行为 (Phase 3) ==========

// 年龄增长
Fish.prototype.updateAging = function() {
    this.age += this.ageRate;
    if (this.age > 1) this.age = 1;
    if (this.age > 0.6) {
        const agingFactor = 1 - (this.age - 0.6) / 0.4 * 0.35;
        this.maxSpeed = this.originalMaxSpeed * agingFactor;
    }
    if (this.age > 0.8 && this.behavior === 'wander' && Math.random() < 0.001) {
        this.behavior = 'rest';
        this.nextBehaviorTime = 40 + Math.random() * 60;
    }
    if (this.age >= 1) this.preferredDepth = 75;
};

// 领地行为
Fish.prototype.updateTerritorial = function() {
    if (this.territory.aggression < 0.1) return;
    if (this.behavior === 'flee') return;
    for (const other of fishes) {
        if (other === this || other.behavior === 'flee') continue;
        const dx = other.x - this.territory.centerX;
        const dy = other.y - this.territory.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.territory.radius && other.personality.competitiveness < this.territory.aggression) {
            const chaseDir = Math.atan2(dy, dx);
            this.targetVx = Math.cos(chaseDir) * this.maxSpeed * 0.8;
            this.targetVy = Math.sin(chaseDir) * this.maxSpeed * 0.6;
            return;
        }
    }
};

// 领导/跟随
Fish.prototype.updateLeaderFollowing = function() {
    if (this.isLeader || fishes.length < 3) return;
    if (this.behavior === 'flee' || this.behavior === 'hunt') return;
    if (!this.followTarget || Math.random() < 0.005) {
        const leaders = fishes.filter(f => f.isLeader);
        if (leaders.length > 0) {
            this.followTarget = leaders[Math.floor(Math.random() * leaders.length)];
        }
    }
    if (!this.followTarget) return;
    const dx = this.followTarget.x - this.x;
    const dy = this.followTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5 && dist < 35) {
        const followX = dx / dist * this.normalSpeed * this.leaderFollowStrength;
        const followY = dy / dist * this.normalSpeed * this.leaderFollowStrength * 0.6;
        this.targetVx += (followX - this.targetVx) * 0.03;
        this.targetVy += (followY - this.targetVy) * 0.03;
    }
};

// 求偶展示
Fish.prototype.tryStartCourtship = function() {
    if (this.behavior !== 'wander' || this.targetFood || this.eventType) return;
    if (this.personality.sociability < 0.5 || Math.random() > 0.0005) return;
    const partner = this.findCourtshipPartner();
    if (!partner) return;
    this.startEvent('courtship');
    this.eventData.partner = partner;
    partner.startEvent('courtship');
    partner.eventData.partner = this;
};

Fish.prototype.findCourtshipPartner = function() {
    let best = null, bestDist = 400;
    for (const other of fishes) {
        if (other === this || other.eventType || other.behavior === 'flee') continue;
        if (other.personality.sociability < 0.5) continue;
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const d = dx*dx + dy*dy;
        if (d < bestDist) { bestDist = d; best = other; }
    }
    return best;
};

Fish.prototype.handleCourtshipEvent = function() {
    const partner = this.eventData.partner;
    if (!partner || !partner.eventType || partner.eventType !== 'courtship') {
        this.finishEvent(0.7);
        return;
    }
    this.eventData.phase = (this.eventData.phase || 0) + 0.025;
    const mx = (this.x + partner.x) / 2;
    const my = (this.y + partner.y) / 2;
    const r = 4 + Math.sin((this.eventData.phase || 0) * 0.5) * 2;
    this.targetVx = mx + Math.cos(this.eventData.phase || 0) * r - this.x;
    this.targetVy = my + Math.sin(this.eventData.phase || 0) * r * 0.7 - this.y;
};

// 鱼跃出水
Fish.prototype.updateLeapCheck = function() {
    if (this.eventType || this.targetFood || this.behavior === 'flee') return;
    this.leapCooldown--;
    if (this.leapCooldown > 0) return;
    this.startEvent('leap');
};

Fish.prototype.handleLeapEvent = function(t) {
    if (t < 0.25) {
        this.targetVy = -0.5 - this.maxSpeed * 0.5 * (1 - t / 0.25);
    } else if (t < 0.5) {
        this.element.classList.add('leaping');
        this.y = Math.max(2, 8 - (t - 0.25) / 0.25 * 18);
        if (t > 0.3 && t < 0.4 && !this.eventData.splashed) {
            this.eventData.splashed = true;
            if (typeof createBubble === 'function') createBubble(this.x, Math.max(5, this.y));
        }
    } else if (t < 0.7) {
        this.y = Math.min(15, this.y + 35 * (t - 0.5) / 0.2);
    } else {
        this.element.classList.remove('leaping');
    }
};

// 恐惧传播
function propagateFear() {
    const fleeingFish = fishes.filter(f => f.behavior === 'flee');
    if (fleeingFish.length === 0) return;
    for (const scared of fleeingFish) {
        for (const other of fishes) {
            if (other === scared || other.behavior === 'flee') continue;
            const dx = other.x - scared.x;
            const dy = other.y - scared.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < scared.fearPropagationRadius + 4 && Math.random() < 0.35) {
                other.scatter();
            }
        }
    }
}

// 进食欲亢奋
function getFrenzyLevel() {
    if (foods.length < 4) return 0;
    return Math.min(1, (foods.length - 4) / 8);
}

function applyFeedingFrenzy(level) {
    for (const fish of fishes) {
        if (fish.behavior === 'flee') continue;
        fish.hunger = Math.min(1, fish.hunger + level * 0.003);
        fish.foodCooldown = Math.max(0, fish.foodCooldown - level * 0.02);
        fish._frenzyBoost = 1 + level * 0.2;
    }
}

G.propagateFear = propagateFear;
G.getFrenzyLevel = getFrenzyLevel;
G.applyFeedingFrenzy = applyFeedingFrenzy;


