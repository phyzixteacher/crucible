// Game configuration
const config = {
    // Resource node types
    nodeTypes: [
        { name: "Lvl 1", health: 100, veskar: [3, 5], opul: [0, 0], color: "#ffcc00", radius: 15 },
        { name: "Lvl 2", health: 200, veskar: [3, 5], opul: [3, 5], color: "#33aaff", radius: 20 },
        { name: "Lvl 3", health: 350, veskar: [7, 10], opul: [7, 10], color: "#dd44ff", radius: 25 },
        { name: "Special", health: 400, veskar: [7, 10], opul: [5, 7], color: "#ff0044", radius: 30, glowing: true }
    ],
    
    // Module definitions
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
            ammoPerVeskar: 3
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
            ammoPerVeskar: 2
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
        },
        "FlakCannon": {
            name: "Flak Cannon",
            icon: "FC",
            description: "High damage, short range",
            type: "weapon",
            damage: 30,
            fireRate: 0.5,
            range: 200,
            tracking: 60,
            ammoPerVeskar: 1
        }
    },
    
    // Shops
    shops: [
        { x: 200, y: 100, cost: 5, isSpecial: false },
        { x: 600, y: 400, cost: 20, isSpecial: true }
    ],
    
    // AI ships
    aiShipCount: 3
};

// Main game object
const game = {
    // System variables
    canvas: null,
    ctx: null,
    lastTime: 0,
    running: true,
    gameOver: false,
    matchTimer: 15 * 60, // 15 minutes in seconds
    
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
        selectedModuleIndex: 0,
        moduleCooldowns: {}
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
    
    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Resize canvas to fit window
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Generate initial game state
        this.generateInitialNodes();
        this.generateAIShips();
        
        // Update HUD
        this.updateHUD();
        
        // Initialize module cooldowns
        for (const moduleKey of this.player.activeModules) {
            this.player.moduleCooldowns[moduleKey] = 0;
        }
        
        // Start game loop
        requestAnimationFrame(timestamp => this.gameLoop(timestamp));
    },
    
    resizeCanvas: function() {
        // Make canvas fill the window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Center player when resizing
        if (!this.player.x) {
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
        }
    },
    
    gameLoop: function(timestamp) {
        // Calculate delta time
        const deltaTime = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0.016;
        this.lastTime = timestamp;
        
        if (this.running && !this.gameOver) {
            // Update match timer
            this.matchTimer -= deltaTime;
            if (this.matchTimer <= 0) {
                this.endMatch();
            } else {
                // Update timer display
                document.getElementById('matchTimer').textContent = this.formatTime(this.matchTimer);
            }
            
            // Update game state
            this.update(deltaTime);
        }
        
        // Render everything
        this.render();
        
        // Next frame
        requestAnimationFrame(timestamp => this.gameLoop(timestamp));
    },
    
    update: function(deltaTime) {
        // Move player toward target position
        this.movePlayerToTarget(deltaTime);
        
        // Update module cooldowns
        this.updateModuleCooldowns(deltaTime);
        
        // Auto-fire active weapons if target is set
        this.handleWeaponFiring(deltaTime);
        
        // Update AI ships
        this.updateAIShips(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update floating texts
        this.updateFloatingTexts(deltaTime);
        
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
    
    updateModuleCooldowns: function(deltaTime) {
        // Update cooldowns for all modules
        for (const moduleKey in this.player.moduleCooldowns) {
            if (this.player.moduleCooldowns[moduleKey] > 0) {
                this.player.moduleCooldowns[moduleKey] -= deltaTime;
                if (this.player.moduleCooldowns[moduleKey] < 0) {
                    this.player.moduleCooldowns[moduleKey] = 0;
                }
                
                // Update cooldown display
                this.updateModuleCooldownDisplay(moduleKey);
            }
        }
    },
    
    updateModuleCooldownDisplay: function(moduleKey) {
        const index = this.player.activeModules.indexOf(moduleKey);
        if (index === -1) return;
        
        // Find module element
        const moduleElements = document.querySelectorAll('.module-slot');
        if (index < moduleElements.length) {
            const moduleElement = moduleElements[index];
            
            // Find or create cooldown overlay
            let cooldownElement = moduleElement.querySelector('.module-cooldown');
            const cooldown = this.player.moduleCooldowns[moduleKey];
            const moduleConfig = config.modules[moduleKey];
            
            if (!cooldownElement && cooldown > 0) {
                cooldownElement = document.createElement('div');
                cooldownElement.className = 'module-cooldown';
                moduleElement.appendChild(cooldownElement);
            }
            
            // Update cooldown display
            if (cooldownElement) {
                if (cooldown <= 0) {
                    cooldownElement.remove();
                } else {
                    const cooldownPercent = cooldown / moduleConfig.cooldown;
                    cooldownElement.style.height = (cooldownPercent * 100) + '%';
                }
            }
        }
    },
    
    handleWeaponFiring: function(deltaTime) {
        // Get selected module
        const moduleKey = this.player.activeModules[this.player.selectedModuleIndex];
        const module = config.modules[moduleKey];
        
        // Check if it's a weapon and if we have a target
        if (module && module.type === "weapon" && 
            (this.targetedNode || this.targetedShip)) {
            
            // Check cooldown
            if (this.player.moduleCooldowns[moduleKey] <= 0 && 
                this.player.resources.veskar >= 1/module.ammoPerVeskar) {
                
                // Fire at target
                if (this.targetedNode) {
                    this.fireAtNode(this.targetedNode, module);
                } else if (this.targetedShip) {
                    this.fireAtShip(this.targetedShip, module);
                }
                
                // Set cooldown
                this.player.moduleCooldowns[moduleKey] = module.fireRate;
                
                // Consume veskar
                this.player.resources.veskar -= 1 / module.ammoPerVeskar;
                this.updateHUD();
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
                
                // Schedule node respawn (simplified)
                setTimeout(() => this.generateResourceNode(), 10000);
            }
            
            // Clear target if this was the targeted node
            if (node === this.targetedNode) {
                this.targetedNode = null;
            }
        }
    },
    
    fireAtShip: function(ship, weapon) {
        // Calculate damage based on range
        const distance = this.distanceBetween(this.player, ship);
        let damage = weapon.damage;
        
        // Apply damage falloff based on distance
        if (distance > weapon.range) {
            damage *= 0.5;
        }
        
        // Deal damage to ship
        ship.health -= damage;
        
        // Create visual effect
        this.createLaserEffect(this.player.x, this.player.y, ship.x, ship.y);
        
        // Check if ship destroyed
        if (ship.health <= 0) {
            // Award score
            this.player.score += 50;
            
            // Drop resources
            this.createResourceDrop(ship.x, ship.y, ship.resources.veskar, ship.resources.opul);
            
            // Create explosion
            this.createExplosion(ship.x, ship.y);
            
            // Remove ship from the list
            const index = this.aiShips.indexOf(ship);
            if (index > -1) {
                this.aiShips.splice(index, 1);
                
                // Respawn ship after delay
                setTimeout(() => this.spawnAIShip(), 10000);
            }
            
            // Clear target if this was the targeted ship
            if (ship === this.targetedShip) {
                this.targetedShip = null;
            }
            
            // Update HUD
            this.updateHUD();
        }
    },
    
    collectNodeResources: function(node) {
        // Find node type configuration
        const nodeType = node.type;
        const nodeConfig = config.nodeTypes[nodeType];
        
        // Determine resource amounts
        const veskarRange = nodeConfig.veskar;
        const opulRange = nodeConfig.opul;
        
        const veskarAmount = Math.floor(Math.random() * 
            (veskarRange[1] - veskarRange[0] + 1)) + veskarRange[0];
        
        const opulAmount = Math.floor(Math.random() * 
            (opulRange[1] - opulRange[0] + 1)) + opulRange[0];
        
        // Create resource drops
        this.createResourceDrop(node.x, node.y, veskarAmount, opulAmount);
        
        // Create visual effect
        this.createExplosion(node.x, node.y, 0.5);
        
        // Update player's score
        this.player.score += veskarAmount + (opulAmount * 2);
        this.updateHUD();
    },
    
    createResourceDrop: function(x, y, veskarAmount, opulAmount) {
        // Create Veskar resource particles
        for (let i = 0; i < veskarAmount; i++) {
            this.particles.push({
                type: 'resource',
                resourceType: 'veskar',
                value: 1,
                x: x + Math.random() * 20 - 10,
                y: y + Math.random() * 20 - 10,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 - 1,
                radius: 4,
                color: '#ffcc00',
                life: 600 // 10 seconds
            });
        }
        
        // Create Opul resource particles
        for (let i = 0; i < opulAmount; i++) {
            this.particles.push({
                type: 'resource',
                resourceType: 'opul',
                value: 1,
                x: x + Math.random() * 20 - 10,
                y: y + Math.random() * 20 - 10,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 - 1,
                radius: 4,
                color: '#33aaff',
                life: 600 // 10 seconds
            });
        }
    },
    
    checkResourceCollection: function() {
        // Check for resource pickups
        const collectRadius = 30;
        
        // Resource particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (particle.type === 'resource' && this.distanceBetween(this.player, particle) < collectRadius) {
                // Collect the resource
                if (particle.resourceType === 'veskar') {
                    this.player.resources.veskar += particle.value;
                } else if (particle.resourceType === 'opul') {
                    this.player.resources.opul += particle.value;
                }
                
                // Update score
                this.player.score += (particle.resourceType === 'veskar') ? 1 : 2;
                
                // Remove particle
                this.particles.splice(i, 1);
                
                // Update HUD
                this.updateHUD();
                
                // Create collection effect
                this.createFloatingText(this.player.x, this.player.y - 20, 
                    `+${particle.value} ${particle.resourceType}`);
            }
        }
    },
    
    checkShopCollision: function() {
        // Check for shop collisions
        const shopRadius = 40;
        
        for (const shop of config.shops) {
            if (this.distanceBetween(this.player, shop) < shopRadius) {
                // Check if player has enough Opul
                if (this.player.resources.opul >= shop.cost) {
                    // Open shop
                    this.openModuleShop(shop.isSpecial, shop.cost);
                    break;
                } else {
                    // Show not enough resources message
                    this.createFloatingText(this.player.x, this.player.y - 20, 
                        `Need ${shop.cost} Opul`);
                }
            }
        }
    },
    
    openModuleShop: function(isSpecial, cost) {
        // Set shop state
        this.shopOpen = true;
        
        // Generate random module options
        this.shopOptions = this.getRandomModuleOptions();
        
        // Display shop UI
        const shopElement = document.getElementById('moduleShop');
        if (shopElement) {
            // Update shop title and cost
            document.getElementById('shopCost').textContent = cost;
            
            // Clear existing options
            const optionsContainer = document.getElementById('shopOptions');
            optionsContainer.innerHTML = '';
            
            // Add module options
            this.shopOptions.forEach((moduleKey, index) => {
                const module = config.modules[moduleKey];
                
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
                    this.selectModuleOption(index, cost);
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
            
            // Initialize cooldown for new module
            this.player.moduleCooldowns[selectedModule] = 0;
            
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
    
    createModuleHUDElement: function(moduleKey) {
        const module = config.modules[moduleKey];
        const modulesContainer = document.getElementById('modules');
        
        // Create module element
        const moduleElement = document.createElement('div');
        moduleElement.className = 'module-slot';
        moduleElement.dataset.index = this.player.activeModules.length - 1;
        moduleElement.innerHTML = `
            <div class="module-icon">${module.icon}</div>
            <div class="module-name">${module.name}</div>
        `;
        
        // Add click event
        moduleElement.addEventListener('click', () => {
            this.player.selectedModuleIndex = parseInt(moduleElement.dataset.index);
            this.updateModuleSelection();
        });
        
        // Add to container
        modulesContainer.appendChild(moduleElement);
        
        // Update selection
        this.updateModuleSelection();
    },
    
    updateModuleSelection: function() {
        // Update module selection UI
        const moduleElements = document.querySelectorAll('.module-slot');
        
        moduleElements.forEach((element, index) => {
            if (index === this.player.selectedModuleIndex) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
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
    
    getRandomModuleOptions: function() {
        // Get modules that player doesn't already have
        const availableModules = Object.keys(config.modules).filter(key => 
            !this.player.activeModules.includes(key)
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
    
    updateAIShips: function(deltaTime) {
        // Simple AI movement and behavior
        for (let i = 0; i < this.aiShips.length; i++) {
            const ship = this.aiShips[i];
            
            // Move toward target
            if (ship.target) {
                const dx = ship.target.x - ship.x;
                const dy = ship.target.y - ship.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    const moveSpeed = ship.speed * deltaTime;
                    const moveDistance = Math.min(moveSpeed, distance);
                    
                    ship.x += (dx / distance) * moveDistance;
                    ship.y += (dy / distance) * moveDistance;
                    
                    // Update rotation
                    ship.rotation = Math.atan2(dy, dx);
                }
                
                // Fire at player if in range
                if (ship.target === this.player && distance < 300) {
                    ship.fireTimer -= deltaTime;
                    if (ship.fireTimer <= 0) {
                        this.createLaserEffect(ship.x, ship.y, this.player.x, this.player.y);
                        
                        // Damage player
                        this.player.shield -= 5;
                        if (this.player.shield < 0) this.player.shield = 0;
                        this.updateHUD();
                        
                        // Reset timer
                        ship.fireTimer = 1;
                    }
                }
            }
            
            // Occasionally change target
            ship.decisionTimer -= deltaTime;
            if (ship.decisionTimer <= 0) {
                // Random chance to target player
                if (Math.random() < 0.3) {
                    ship.target = this.player;
                } else {
                    // Target random node
                    if (this.resourceNodes.length > 0) {
                        const randomNodeIndex = Math.floor(Math.random() * this.resourceNodes.length);
                        ship.target = this.resourceNodes[randomNodeIndex];
                    }
                }
                
                // Reset timer
                ship.decisionTimer = 2 + Math.random() * 3;
            }
        }
    },
    
    generateAIShips: function() {
        // Create AI ships
        for (let i = 0; i < config.aiShipCount; i++) {
            this.spawnAIShip();
        }
    },
    
    spawnAIShip: function() {
        // Create AI ship at random position
        const ship = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            rotation: 0,
            speed: 2,
            health: 50,
            resources: { veskar: 10, opul: 5 },
            target: null,
            decisionTimer: 0,
            fireTimer: 0,
            weapon: {
                range: 300,
                damage: 5,
                fireRate: 1
            }
        };
        
        this.aiShips.push(ship);
    },
    
    generateInitialNodes: function() {
        // Create initial resource nodes
        for (let i = 0; i < 15; i++) {
            this.generateResourceNode();
        }
    },
    
    generateResourceNode: function() {
        // Don't exceed max nodes
        if (this.resourceNodes.length >= 30) return;
        
        // Determine position
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        
        // Determine node type based on position (nodes are higher level toward center)
        const distFromCenter = this.distanceBetween(
            {x, y}, 
            {x: this.canvas.width/2, y: this.canvas.height/2}
        );
        
        let type;
        // Special node (rare)
        if (Math.random() < 0.05 && distFromCenter < this.canvas.width * 0.2) {
            type = 3;
        }
        // Regular nodes based on distance
        else if (distFromCenter < this.canvas.width * 0.2) {
            type = 2; // Level 3
        } else if (distFromCenter < this.canvas.width * 0.4) {
            type = 1; // Level 2
        } else {
            type = 0; // Level 1
        }
        
        // Get node configuration
        const nodeConfig = config.nodeTypes[type];
        
        // Create node
        const node = {
            x: x,
            y: y,
            type: type,
            health: nodeConfig.health,
            maxHealth: nodeConfig.health,
            color: nodeConfig.color,
            radius: nodeConfig.radius,
            glowing: nodeConfig.glowing || false,
            pulsePhase: 0
        };
        
        this.resourceNodes.push(node);
    },
    
    updateParticles: function(deltaTime) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.type === 'resource') {
                // Update resource particle
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                
                // Slow down over time
                p.vx *= 0.98;
                p.vy *= 0.98;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            } 
            else if (p.type === 'laser') {
                // Update laser particle
                p.life--;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
            else if (p.type === 'explosion') {
                // Update explosion particle
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                
                // Slow down
                p.vx *= 0.95;
                p.vy *= 0.95;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }
    },
    
    updateFloatingTexts: function(deltaTime) {
        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 1;
            ft.life--;
            
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
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
            const speed = 2 + Math.random() * 3;
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
    
    createFloatingText: function(x, y, text) {
        this.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            life: 50,
            alpha: 1.0
        });
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
        
        // Draw shop indicators
        this.drawShopIndicators();
    },
    
    drawBackground: function() {
        // Simple grid background
        this.ctx.strokeStyle = 'rgba(50, 50, 80, 0.2)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    },
    
    drawResourceNodes: function() {
        for (const node of this.resourceNodes) {
            // Add glow effect for special nodes
            if (node.glowing) {
                node.pulsePhase += 0.05;
                const glowSize = Math.sin(node.pulsePhase) * 5 + 10;
                
                this.ctx.globalAlpha = 0.5;
                this.ctx.fillStyle = node.color;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius + glowSize, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            }
            
            // Draw node
            this.ctx.fillStyle = node.color;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw node type
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(config.nodeTypes[node.type].name, node.x, node.y - node.radius - 5);
            
            // Draw health bar if damaged
            if (node.health < node.maxHealth) {
                const healthPercent = node.health / node.maxHealth;
                const barWidth = node.radius * 2;
                
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(node.x - barWidth/2, node.y + node.radius + 5, barWidth, 5);
                
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(node.x - barWidth/2, node.y + node.radius + 5, barWidth * healthPercent, 5);
            }
            
            // Highlight if targeted
            if (node === this.targetedNode) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    },
    
    drawAIShips: function() {
        for (const ship of this.aiShips) {
            this.ctx.save();
            this.ctx.translate(ship.x, ship.y);
            this.ctx.rotate(ship.rotation);
            
            // Draw ship body
            this.ctx.fillStyle = '#ff5555';
            this.ctx.beginPath();
            this.ctx.moveTo(15, 0);
            this.ctx.lineTo(-10, -10);
            this.ctx.lineTo(-5, 0);
            this.ctx.lineTo(-10, 10);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
            
            // Draw health bar
            const healthPercent = ship.health / 50;
            const barWidth = 30;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(ship.x - barWidth/2, ship.y - 20, barWidth, 5);
            
            this.ctx.fillStyle = '#f00';
            this.ctx.fillRect(ship.x - barWidth/2, ship.y - 20, barWidth * healthPercent, 5);
            
            // Highlight if targeted
            if (ship === this.targetedShip) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(ship.x, ship.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    },
    
    drawPlayer: function() {
        const ctx = this.ctx;
        
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
            const module = config.modules[moduleKey];
            
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
    
    drawParticles: function() {
        for (const p of this.particles) {
            if (p.type === 'resource') {
                // Draw resource particle
                this.ctx.globalAlpha = p.life / 600;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } 
            else if (p.type === 'laser') {
                // Draw laser
                this.ctx.globalAlpha = p.life / 5;
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(p.startX, p.startY);
                this.ctx.lineTo(p.endX, p.endY);
                this.ctx.stroke();
            }
            else if (p.type === 'explosion') {
                // Draw explosion particle
                this.ctx.globalAlpha = p.life / 60;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1.0;
    },
    
    drawFloatingTexts: function() {
        for (const ft of this.floatingTexts) {
            this.ctx.globalAlpha = ft.life / 50;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
        }
        this.ctx.globalAlpha = 1.0;
    },
    
    drawShopIndicators: function() {
        // Draw shop locations
        for (const shop of config.shops) {
            this.ctx.fillStyle = shop.isSpecial ? '#ff0044' : '#33aaff';
            this.ctx.beginPath();
            this.ctx.arc(shop.x, shop.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(shop.cost, shop.x, shop.y + 4);
        }
    },
    
    updateHUD: function() {
        // Update HUD elements
        document.getElementById('veskarCount').textContent = Math.floor(this.player.resources.veskar);
        document.getElementById('opulCount').textContent = Math.floor(this.player.resources.opul);
        document.getElementById('shieldValue').textContent = Math.floor(this.player.shield);
        document.getElementById('scoreValue').textContent = Math.floor(this.player.score);
    },
    
    endMatch: function() {
        this.gameOver = true;
        this.running = false;
        
        // Update final score
        document.getElementById('finalScore').textContent = Math.floor(this.player.score);
        
        // Show game over screen
        document.getElementById('gameOver').style.display = 'flex';
    },
    
    setupEventListeners: function() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
        });
        
        // Left click for targeting
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Find if clicked on a node
            const node = this.getNodeAtPosition(mouseX, mouseY);
            if (node) {
                this.targetedNode = node;
                this.targetedShip = null;
                return;
            }
            
            // Find if clicked on a ship
            const ship = this.getShipAtPosition(mouseX, mouseY);
            if (ship) {
                this.targetedShip = ship;
                this.targetedNode = null;
                return;
            }
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
            // Number keys to select modules
            if (e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (index < this.player.activeModules.length) {
                    this.player.selectedModuleIndex = index;
                    this.updateModuleSelection();
                }
            }
            
            // Space to activate current module manually
            if (e.code === 'Space') {
                this.activateSelectedModule();
            }
        });
        
        // Shop UI buttons
        document.getElementById('closeShop')?.addEventListener('click', () => {
            this.closeShop();
        });
        
        document.getElementById('rerollOptions')?.addEventListener('click', () => {
            if (this.player.resources.opul >= 2) {
                this.player.resources.opul -= 2;
                this.shopOptions = this.getRandomModuleOptions();
                this.openModuleShop(false, 5); // Reopen shop with new options
                this.updateHUD();
            }
        });
        
        // Play again button
        document.getElementById('playAgain')?.addEventListener('click', () => {
            window.location.reload();
        });
    },
    
    activateSelectedModule: function() {
        const moduleKey = this.player.activeModules[this.player.selectedModuleIndex];
        const module = config.modules[moduleKey];
        
        if (!module || module.type === 'weapon') return;
        
        // Check cooldown
        if (this.player.moduleCooldowns[moduleKey] <= 0) {
            if (module.type === 'defense' && moduleKey === 'Nanoaegis') {
                // Shield regeneration
                const veskarAmount = Math.min(this.player.resources.veskar, 10);
                const shieldAmount = veskarAmount * module.efficiency;
                
                this.player.shield = Math.min(this.player.shield + shieldAmount, this.player.maxShield);
                this.player.resources.veskar -= veskarAmount;
                
                // Create effect
                this.createFloatingText(this.player.x, this.player.y - 20, `+${Math.floor(shieldAmount)} Shield`);
                
                // Set cooldown
                this.player.moduleCooldowns[moduleKey] = module.cooldown;
                this.updateHUD();
            }
            else if (module.type === 'utility' && moduleKey === 'StasisSnare') {
                // Check if we have enough resources
                if (this.player.resources.veskar >= module.veskarCost) {
                    // Apply snare to nearby ships
                    for (const ship of this.aiShips) {
                        if (this.distanceBetween(this.player, ship) < module.range) {
                            ship.speed *= 0.5; // Slow down
                            
                            // Create effect
                            this.createFloatingText(ship.x, ship.y - 20, "Slowed!");
                        }
                    }
                    
                    // Consume resources
                    this.player.resources.veskar -= module.veskarCost;
                    
                    // Set cooldown
                    this.player.moduleCooldowns[moduleKey] = module.cooldown;
                    this.updateHUD();
                }
            }
        }
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
            if (this.distanceBetween({x, y}, ship) < 25) {
                return ship;
            }
        }
        return null;
    },
    
    distanceBetween: function(obj1, obj2) {
        return Math.sqrt(
            Math.pow(obj2.x - obj1.x, 2) + 
            Math.pow(obj2.y - obj1.y, 2)
        );
    },
    
    formatTime: function(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
};

// Initialize game when page loads
window.addEventListener('load', () => {
    game.init();
});
