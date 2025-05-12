// Main game object
const game = {
    // System variables
    canvas: null,
    ctx: null,
    lastTime: 0,
    running: false,
    gameOver: false,
    
    // Game state
    player: {
        x: 400,
        y: 300,
        targetX: 400,
        targetY: 300,
        rotation: 0,
        speed: 3,
        shield: 100,
        maxShield: 100,
        resources: { veskar: 25, opul: 0 },
        score: 0,
        activeModules: ["AutoCannon"],
        selectedModuleIndex: 0
    },
    
    // Game elements
    resourceNodes: [],
    aiShips: [],
    particles: [],
    floatingTexts: [],
    
    // UI state
    targetedNode: null,
    targetedShip: null,
    shopOpen: false,
    shopOptions: [],
    matchTimer: 15 * 60, // 15 minutes in seconds
    
    // Game configuration
    config: {
        nodeTypes: [
            { name: "Lvl 1", health: 100, veskar: [3, 5], opul: [0, 0], color: "#ffcc00", radius: 15 },
            { name: "Lvl 2", health: 200, veskar: [3, 5], opul: [3, 5], color: "#33aaff", radius: 20 },
            { name: "Lvl 3", health: 350, veskar: [7, 10], opul: [7, 10], color: "#dd44ff", radius: 25 },
            { name: "Special", health: 400, veskar: [7, 10], opul: [5, 7], color: "#ff0044", radius: 30, glowing: true }
        ],
        
        modules: {
            "AutoCannon": {
                name: "Auto Cannon",
                icon: "AC",
                description: "Basic rapid-fire weapon",
                type: "weapon",
                damage: 10,
                fireRate: 0.3, // seconds between shots
                range: 300,
                tracking: 90, // degrees per second
                ammoPerVeskar: 3,
                cooldown: 0
            },
            "IonRepeater": {
                name: "Ion Repeater",
                icon: "IR",
                description: "Medium range weapon",
                type: "weapon",
                damage: 15,
                fireRate: 0.4,
                range: 400,
                tracking: 70,
                ammoPerVeskar: 2,
                cooldown: 0.2,
                special: "shieldPiercing"
            },
            "StasisSnare": {
                name: "Stasis Snare",
                icon: "SS",
                description: "Slows enemies",
                type: "utility",
                range: 250,
                duration: 10,
                veskarCost: 8,
                cooldown: 15
            },
            "Nanoaegis": {
                name: "Nanoaegis",
                icon: "NA",
                description: "Shield regeneration",
                type: "defense",
                efficiency: 2.5, // Shield per Veskar
                cooldown: 5
            }
        },
        
        // AI configuration
        ai: {
            count: 3,
            respawnDelay: 30
        },
        
        // Match configuration
        match: {
            duration: 15 * 60,
            nodeRespawnTime: 180,
            lateGameStart: 0.75,
            finalConfrontation: 0.85,
            revealAllPlayers: 120
        },
        
        // Scoring
        scoring: {
            opulValue: 2,
            veskarValue: 1,
            elimination: 50,
            survival: 50
        }
    },
        init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Generate initial game state
        this.generateInitialNodes();
        this.generateAIShips();
        
        // Update HUD
        this.updateHUD();
        
        // Start game loop
        this.running = true;
        requestAnimationFrame(timestamp => this.gameLoop(timestamp));
    },
    
    gameLoop: function(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time
        const deltaTime = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0.016;
        this.lastTime = timestamp;
        
        // Update match timer
        if (!this.gameOver) {
            this.matchTimer -= deltaTime;
            if (this.matchTimer <= 0) {
                this.endMatch();
            }
        }
        
        // Update game state
        this.update(deltaTime);
        
        // Render everything
        this.render();
        
        // Next frame
        requestAnimationFrame(timestamp => this.gameLoop(timestamp));
    },
    
    update: function(deltaTime) {
        // Update player
        this.updatePlayer(deltaTime);
        
        // Update AI ships
        this.updateAIShips(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update floating texts
        this.updateFloatingTexts(deltaTime);
        
        // Check for node respawns
        this.checkNodeRespawns(deltaTime);
        
        // Update match progression
        this.updateMatchProgression();
    },
        updatePlayer: function(deltaTime) {
        // Move player toward target position
        this.movePlayerToTarget(deltaTime);
        
        // Update module cooldowns
        this.updateModuleCooldowns(deltaTime);
        
        // Auto-fire active weapons if target is set
        this.handleWeaponFiring(deltaTime);
        
        // Regenerate shield if below max
        this.handleShieldRegeneration(deltaTime);
        
        // Check for resource collection
        this.checkResourceCollection();
        
        // Check for module shop collision
        this.checkShopCollision();
    },
    
    movePlayerToTarget: function(deltaTime) {
        // Calculate direction vector
        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update position if not at target
        if (distance > 5) {
            const moveSpeed = this.player.speed * deltaTime;
            const moveDistance = Math.min(moveSpeed, distance);
            
            this.player.x += (dx / distance) * moveDistance;
            this.player.y += (dy / distance) * moveDistance;
            
            // Update rotation to face direction of movement
            this.player.rotation = Math.atan2(dy, dx);
        }
    },
    
    handleWeaponFiring: function(deltaTime) {
        // Get selected module
        const moduleKey = this.player.activeModules[this.player.selectedModuleIndex];
        const module = this.config.modules[moduleKey];
        
        // Check if it's a weapon and if we have a target
        if (module && module.type === "weapon" && 
            (this.targetedNode || this.targetedShip)) {
            
            // Check cooldown
            if (module.currentCooldown <= 0 && this.player.resources.veskar >= 1) {
                // Fire at target
                if (this.targetedNode) {
                    this.fireAtNode(this.targetedNode, module);
                } else if (this.targetedShip) {
                    this.fireAtShip(this.targetedShip, module);
                }
                
                // Set cooldown
                module.currentCooldown = module.fireRate;
                
                // Consume veskar
                this.player.resources.veskar -= 1 / module.ammoPerVeskar;
                this.updateHUD();
            }
            
            // Update cooldown
            if (module.currentCooldown > 0) {
                module.currentCooldown -= deltaTime;
            }
        }
    },
    
    fireAtNode: function(node, weapon) {
        // Calculate damage based on range
        const distance = this.distanceBetween(this.player, node);
        let damage = weapon.damage;
        
        // Apply damage falloff based on distance
        if (distance > weapon.range) {
            damage *= 0.5;
        }
        
        // Deal damage to node
        node.health -= damage;
        
        // Create visual effect
        this.createLaserEffect(this.player.x, this.player.y, node.x, node.y);
        
        // Check if node destroyed
        if (node.health <= 0) {
            this.collectNodeResources(node);
            
            // Remove node from the list
            const index = this.resourceNodes.indexOf(node);
            if (index > -1) {
                this.resourceNodes.splice(index, 1);
            }
            
            // Clear target if this was the targeted node
            if (node === this.targetedNode) {
                this.targetedNode = null;
            }
        }
    },
    
    updateAIShips: function(deltaTime) {
        for (let i = this.aiShips.length - 1; i >= 0; i--) {
            const ship = this.aiShips[i];
            
            // Move AI ship
            this.moveAIShip(ship, deltaTime);
            
            // AI decision making
            ship.decisionTimer -= deltaTime;
            if (ship.decisionTimer <= 0) {
                this.makeAIDecision(ship);
                ship.decisionTimer = 1 + Math.random();
            }
            
            // AI combat
            if (ship.target) {
                this.handleAICombat(ship, deltaTime);
            }
            
            // Check player collision for resource collection
            if (ship.type === 'player' && !ship.targetedByPlayer && 
                this.distanceBetween(this.player, ship) < 200) {
                
                // AI notices player
                ship.target = this.player;
                ship.state = 'combat';
            }
        }
    },
    
    makeAIDecision: function(ship) {
        // State machine for AI behavior
        switch (ship.state) {
            case 'idle':
                // Find closest resource node
                let closestNode = this.findClosestResourceNode(ship);
                if (closestNode) {
                    ship.target = closestNode;
                    ship.state = 'harvesting';
                }
                break;
                
            case 'harvesting':
                // If target node is gone, go back to idle
                if (!ship.target || !this.resourceNodes.includes(ship.target)) {
                    ship.target = null;
                    ship.state = 'idle';
                }
                
                // Chance to attack player if nearby
                else if (Math.random() < 0.3 && 
                    this.distanceBetween(ship, this.player) < 300) {
                    ship.target = this.player;
                    ship.state = 'combat';
                }
                break;
                
            case 'combat':
                // If player is far, go back to harvesting
                if (this.distanceBetween(ship, this.player) > 500) {
                    ship.state = 'idle';
                    ship.target = null;
                }
                break;
        }
    },
        openModuleShop: function(isSpecial = false) {
        // Set shop state
        this.shopOpen = true;
        
        // Generate random module options
        this.shopOptions = this.getRandomModuleOptions(isSpecial);
        
        // Display shop UI
        const shopElement = document.getElementById('moduleShop');
        if (shopElement) {
            // Update shop title and cost
            const shopCost = isSpecial ? 20 : 5;
            document.getElementById('shopCost').textContent = shopCost;
            
            // Clear existing options
            const optionsContainer = document.getElementById('shopOptions');
            optionsContainer.innerHTML = '';
            
            // Add module options
            this.shopOptions.forEach((moduleKey, index) => {
                const module = this.config.modules[moduleKey];
                
                const optionElement = document.createElement('div');
                optionElement.className = 'shop-option';
                optionElement.innerHTML = `
                    <div class="option-icon">${module.icon}</div>
                    <div class="option-name">${module.name}</div>
                    <div class="option-class">${module.type}</div>
                    <div class="option-description">${module.description}</div>
                `;
                
                // Add click event
                optionElement.addEventListener('click', () => {
                    this.selectModuleOption(index, shopCost);
                });
                
                optionsContainer.appendChild(optionElement);
            });
            
            // Show shop
            shopElement.style.display = 'block';
        }
        
        // Pause game
        this.running = false;
    },
    
    selectModuleOption: function(index, cost) {
        // Check if player has enough Opul
        if (this.player.resources.opul >= cost) {
            // Add module to player's active modules
            const selectedModule = this.shopOptions[index];
            this.player.activeModules.push(selectedModule);
            
            // Deduct cost
            this.player.resources.opul -= cost;
            this.updateHUD();
            
            // Close shop
            this.closeShop();
            
            // Create module element in HUD
            this.createModuleHUDElement(selectedModule);
        } else {
            // Flash the Opul display to indicate not enough resources
            const opulElement = document.querySelector('.opul');
            opulElement.classList.add('flash');
            setTimeout(() => opulElement.classList.remove('flash'), 500);
        }
    },
    
    closeShop: function() {
        // Hide shop UI
        const shopElement = document.getElementById('moduleShop');
        if (shopElement) {
            shopElement.style.display = 'none';
        }
        
        // Resume game
        this.running = true;
        this.lastTime = null; // Reset delta time
    },
    
    getRandomModuleOptions: function(isSpecial) {
        // Get modules that player doesn't already have
        const availableModules = Object.keys(this.config.modules).filter(key => 
            !this.player.activeModules.includes(key) && 
            key !== 'AutoCannon' // Always exclude default
        );
        
        // Select random modules
        const options = [];
        const count = Math.min(3, availableModules.length);
        
        for (let i = 0; i < count; i++) {
            if (availableModules.length === 0) break;
            
            const randomIndex = Math.floor(Math.random() * availableModules.length);
            options.push(availableModules[randomIndex]);
            availableModules.splice(randomIndex, 1);
        }
        
        return options;
    },
        render: function() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw resource nodes
        this.drawResourceNodes();
        
        // Draw AI ships
        this.drawAIShips();
        
        // Draw player
        this.drawPlayer();
        
        // Draw particles
        this.drawParticles();
        
        // Draw floating texts
        this.drawFloatingTexts();
        
        // Draw UI elements
        this.drawUI();
    },
    
    drawPlayer: function() {
        const ctx = this.ctx;
        
        // Draw ship
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.rotation);
        
        // Ship body
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        
        // Draw turret
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw turret barrel with rotation toward target
        let turretRotation = 0;
        let targetX, targetY;
        
        if (this.targetedNode) {
            targetX = this.targetedNode.x;
            targetY = this.targetedNode.y;
        } else if (this.targetedShip) {
            targetX = this.targetedShip.x;
            targetY = this.targetedShip.y;
        }
        
        if (targetX !== undefined) {
            // Calculate relative angle to target
            const dx = targetX - this.player.x;
            const dy = targetY - this.player.y;
            const absoluteTurretAngle = Math.atan2(dy, dx);
            turretRotation = absoluteTurretAngle - this.player.rotation;
        }
        
        ctx.save();
        ctx.rotate(turretRotation);
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, -2, 10, 4);
        ctx.restore();
        
        ctx.restore();
        
        // Draw movement path
        if (this.distanceBetween(this.player, {x: this.player.targetX, y: this.player.targetY}) > 5) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.moveTo(this.player.x, this.player.y);
            ctx.lineTo(this.player.targetX, this.player.targetY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw targeting line and firing arc
        if (this.targetedNode || this.targetedShip) {
            const target = this.targetedNode || this.targetedShip;
            
            // Line to target
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.moveTo(this.player.x, this.player.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            
            // Get active weapon
            const moduleKey = this.player.activeModules[this.player.selectedModuleIndex];
            const module = this.config.modules[moduleKey];
            
            // Draw firing arc if module is a weapon
            if (module && module.type === 'weapon') {
                const dx = target.x - this.player.x;
                const dy = target.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                // Calculate arc width based on tracking and distance
                let arcWidth = Math.PI * module.tracking / 180; // Convert tracking to radians
                
                // Wider arc at longer distances
                if (distance > module.range) {
                    arcWidth *= 1.5;
                }
                
                // Draw the arc
                ctx.beginPath();
                ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
                ctx.moveTo(this.player.x, this.player.y);
                ctx.arc(this.player.x, this.player.y, distance, angle - arcWidth/2, angle + arcWidth/2);
                ctx.closePath();
                ctx.fill();
                
                // Optimal range indicator
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.arc(this.player.x, this.player.y, module.range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    },
    
    createResourceParticles: function(x, y, color, amount) {
        for (let i = 0; i < amount; i++) {
            this.particles.push({
                type: 'resource',
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                radius: Math.random() * 3 + 2,
                color: color,
                life: 30 + Math.random() * 30
            });
        }
    },
    
    createLaserEffect: function(startX, startY, endX, endY) {
        this.particles.push({
            type: 'laser',
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: '#ffaa00',
            life: 5
        });
    },
    
    createExplosion: function(x, y, size = 1) {
        const particleCount = 20 * size;
        const colors = ['#ff4400', '#ffaa00', '#ff0000', '#ffff00'];
        
        for (let i = 0; i < particleCount; i++) {
            const speed = 2 + Math.random() * 3 * size;
            const angle = Math.random() * Math.PI * 2;
            
            this.particles.push({
                type: 'explosion',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 20 + Math.random() * 40
            });
        }
    },
        // Utility functions
    distanceBetween: function(obj1, obj2) {
        return Math.sqrt(
            Math.pow(obj2.x - obj1.x, 2) + 
            Math.pow(obj2.y - obj1.y, 2)
        );
    },
    
    getNodeAtPosition: function(x, y) {
        for (const node of this.resourceNodes) {
            if (this.distanceBetween({x, y}, node) < node.radius) {
                return node;
            }
        }
        return null;
    },
    
    getShipAtPosition: function(x, y) {
        for (const ship of this.aiShips) {
            if (this.distanceBetween({x, y}, ship) < 20) {
                return ship;
            }
        }
        return null;
    },
    
    formatTime: function(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Event handlers
    setupEventListeners: function() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Track mouse for UI elements
            this.handleMouseMove(mouseX, mouseY);
        });
        
        // Left click for targeting
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Handle targeting
            this.handleLeftClick(mouseX, mouseY);
        });
        
        // Right click for movement
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Set movement target
            this.player.targetX = mouseX;
            this.player.targetY = mouseY;
        });
        
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // Shop UI buttons
        document.getElementById('closeShop')?.addEventListener('click', () => {
            this.closeShop();
        });
        
        document.getElementById('rerollOptions')?.addEventListener('click', () => {
            this.rerollShopOptions();
        });
    },
    
    handleLeftClick: function(x, y) {
        // Check if clicked on a node
        const node = this.getNodeAtPosition(x, y);
        if (node) {
            this.targetedNode = node;
            this.targetedShip = null;
            return;
        }
        
        // Check if clicked on a ship
        const ship = this.getShipAtPosition(x, y);
        if (ship) {
            this.targetedShip = ship;
            this.targetedNode = null;
            ship.targetedByPlayer = true;
            return;
        }
        
        // Check if clicked on a module slot
        const moduleElements = document.querySelectorAll('.module-slot');
        for (let i = 0; i < moduleElements.length; i++) {
            const rect = moduleElements[i].getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && 
                y >= rect.top && y <= rect.bottom) {
                // Select this module
                this.player.selectedModuleIndex = i;
                this.updateModuleSelection();
                return;
            }
        }
    },
    
    handleKeyDown: function(e) {
        // Space to activate current module
        if (e.code === 'Space') {
            this.activateSelectedModule();
        }
        
        // Number keys to select modules
        if (e.code.startsWith('Digit')) {
            const digit = parseInt(e.code.substring(5));
            if (digit > 0 && digit <= this.player.activeModules.length) {
                this.player.selectedModuleIndex = digit - 1;
                this.updateModuleSelection();
            }
        }
    },
    
    activateSelectedModule: function() {
        const moduleKey = this.player.activeModules[this.player.selectedModuleIndex];
        const module = this.config.modules[moduleKey];
        
        if (!module) return;
        
        // Handle different module types
        if (module.type === 'utility' || module.type === 'defense') {
            // Check cooldown
            if (module.currentCooldown <= 0) {
                // Check veskar cost
                if (this.player.resources.veskar >= module.veskarCost) {
                    // Activate module effect
                    this.activateModuleEffect(moduleKey);
                    
                    // Set cooldown
                    module.currentCooldown = module.cooldown;
                    
                    // Consume veskar
                    this.player.resources.veskar -= module.veskarCost;
                    this.updateHUD();
                }
            }
        }
    },
    
    activateModuleEffect: function(moduleKey) {
        const module = this.config.modules[moduleKey];
        
        switch (moduleKey) {
            case 'StasisSnare':
                // Slow nearby enemies
                this.aiShips.forEach(ship => {
                    if (this.distanceBetween(this.player, ship) < module.range) {
                        ship.slowed = true;
                        ship.slowDuration = module.duration;
                    }
                });
                
                // Visual effect
                this.createSnareEffect(this.player.x, this.player.y, module.range);
                break;
                
            case 'Nanoaegis':
                // Regenerate shield
                const shieldAmount = Math.min(
                    module.efficiency * this.player.resources.veskar,
                    this.player.maxShield - this.player.shield
                );
                
                this.player.shield += shieldAmount;
                this.player.resources.veskar -= shieldAmount / module.efficiency;
                
                // Visual effect
                this.createShieldEffect(this.player.x, this.player.y);
                break;
                
            // Add other module effects as needed
        }
    },
};

// Initialize game when page loads
window.addEventListener('load', () => {
    game.init();
});
