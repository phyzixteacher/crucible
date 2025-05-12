// Game configuration
const config = {
    shipSpeed: 3,
    rotationSpeed: 0.05,
    nodeGenerationInterval: 10000, // ms
    nodeLevels: [
        { health: 100, veskar: 3, opul: 0, color: 0xffcc00, radius: 15, name: "Lvl 1" },
        { health: 200, veskar: 4, opul: 4, color: 0x33aaff, radius: 20, name: "Lvl 2" },
        { health: 350, veskar: 8, opul: 8, color: 0xdd44ff, radius: 25, name: "Lvl 3" },
        { health: 400, veskar: 8, opul: 6, color: 0xff0044, radius: 30, name: "Special", glowing: true }
    ]
};

// Game state
const game = {
    canvas: null,
    ctx: null,
    player: {
        x: 400,
        y: 300,
        targetX: 400,
        targetY: 300,
        rotation: 0,
        resources: { veskar: 25, opul: 0 },
        shield: 100
    },
    resourceNodes: [],
    targetedNode: null,
    keysPressed: {},
    mousePosition: { x: 0, y: 0 },
    rightMouseDown: false,
    particles: [],
    floatingTexts: [],
    
    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.generateInitialNodes();
        this.updateHUD();
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // Start node generation
        setInterval(() => this.generateResourceNode(), config.nodeGenerationInterval);
    },
    
    setupEventListeners: function() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
        });
        
        // Left click for targeting
        this.canvas.addEventListener('click', (e) => {
            // Find if clicked on a node
            const node = this.getNodeAtPosition(this.mousePosition.x, this.mousePosition.y);
            if (node) {
                this.targetedNode = node;
            }
        });
        
        // Right click for movement
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.player.targetX = this.mousePosition.x;
            this.player.targetY = this.mousePosition.y;
        });
        
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keysPressed[e.code] = true;
            
            // Space to fire at target
            if (e.code === 'Space' && this.targetedNode) {
                this.fireAtTarget();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keysPressed[e.code] = false;
        });
    },
    
    generateInitialNodes: function() {
        // Create a few initial nodes
        for (let i = 0; i < 8; i++) {
            this.generateResourceNode();
        }
    },
    
    generateResourceNode: function() {
        // Don't exceed max nodes
        if (this.resourceNodes.length >= 15) return;
        
        // Randomize position away from player
        let x, y;
        do {
            x = Math.random() * this.canvas.width;
            y = Math.random() * this.canvas.height;
        } while (this.distanceBetween({x, y}, this.player) < 150);
        
        // Determine node level based on position and randomness
        const distFromCenter = this.distanceBetween(
            {x, y}, 
            {x: this.canvas.width/2, y: this.canvas.height/2}
        );
        
        let level;
        // Special nodes (rare)
        if (Math.random() < 0.05 && distFromCenter < 200) {
            level = 3; // Special node (rare, near center)
        }
        // Regular nodes based on distance
        else if (distFromCenter < 150) {
            level = 2; // Level 3 near center
        } else if (distFromCenter < 300) {
            level = 1; // Level 2 middle area
        } else {
            level = 0; // Level 1 outer area
        }
        
        const nodeType = config.nodeLevels[level];
        
        // Add random variation to resource amounts
        const veskarAmount = nodeType.veskar + Math.floor(Math.random() * 3);
        const opulAmount = nodeType.opul + Math.floor(Math.random() * 3);
        
        const node = {
            x,
            y,
            level,
            health: nodeType.health,
            maxHealth: nodeType.health,
            veskar: veskarAmount,
            opul: opulAmount,
            color: nodeType.color,
            radius: nodeType.radius,
            name: nodeType.name,
            glowing: nodeType.glowing || false,
            pulsePhase: 0 // For glowing animation
        };
        
        this.resourceNodes.push(node);
    },
    
    fireAtTarget: function() {
        if (!this.targetedNode) return;
        
        // Check if we have resources
        if (this.player.resources.veskar < 1) return;
        
        // Deduct ammo cost
        this.player.resources.veskar -= 1;
        this.updateHUD();
        
        // Calculate damage based on distance
        const distance = this.distanceBetween(this.player, this.targetedNode);
        let damage = 20; // Base damage
        
        // Reduce damage at longer ranges
        if (distance > 300) {
            damage = 10;
        } else if (distance > 150) {
            damage = 15;
        }
        
        // Deal damage to node
        this.targetedNode.health -= damage;
        
        // Visual effect for shot
        this.createLaserEffect(this.player.x, this.player.y, this.targetedNode.x, this.targetedNode.y);
        
        // Check if node destroyed
        if (this.targetedNode.health <= 0) {
            this.collectResources(this.targetedNode);
            const index = this.resourceNodes.indexOf(this.targetedNode);
            if (index > -1) {
                this.resourceNodes.splice(index, 1);
            }
            this.targetedNode = null;
        }
    },
    
    createLaserEffect: function(startX, startY, endX, endY) {
        // Create a simple laser line particle
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
    
    collectResources: function(node) {
        // Create visual effect
        if (node.veskar > 0) {
            this.createResourceParticles(node.x, node.y, '#ffdd00', node.veskar * 2);
        }
        if (node.opul > 0) {
            this.createResourceParticles(node.x, node.y, '#44aaff', node.opul * 2);
        }
        
        // Add resources to player
        this.player.resources.veskar += node.veskar;
        this.player.resources.opul += node.opul;
        this.updateHUD();
        
        // Display floating text for collected resources
        let text = `+${node.veskar} Veskar`;
        if (node.opul > 0) {
            text += ` +${node.opul} Opul`;
        }
        this.createFloatingText(node.x, node.y, text);
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
    
    createFloatingText: function(x, y, text) {
        this.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            life: 50,
            alpha: 1.0
        });
    },
    
    updateHUD: function() {
        document.getElementById('veskarCount').textContent = this.player.resources.veskar;
        document.getElementById('opulCount').textContent = this.player.resources.opul;
        document.getElementById('shieldValue').textContent = this.player.shield;
    },
    
    getNodeAtPosition: function(x, y) {
        for (const node of this.resourceNodes) {
            if (this.distanceBetween({x, y}, node) < node.radius) {
                return node;
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
    
    movePlayerToTarget: function() {
        // Calculate direction vector
        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update position if not at target
        if (distance > 5) {
            this.player.x += (dx / distance) * config.shipSpeed;
            this.player.y += (dy / distance) * config.shipSpeed;
            
            // Update rotation to face direction of movement
            this.player.rotation = Math.atan2(dy, dx);
        }
    },
    
    drawPlayer: function() {
        const ctx = this.ctx;
        
        // Draw ship
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.rotation);
        
        // Draw trajectory path if moving
        if (this.distanceBetween(this.player, {x: this.player.targetX, y: this.player.targetY}) > 5) {
            ctx.restore();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.moveTo(this.player.x, this.player.y);
            ctx.lineTo(this.player.targetX, this.player.targetY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.save();
            ctx.translate(this.player.x, this.player.y);
            ctx.rotate(this.player.rotation);
        }
        
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
        
        // Draw turret barrel
        let turretRotation = 0;
        if (this.targetedNode) {
            // Calculate angle to target
            const dx = this.targetedNode.x - this.player.x;
            const dy = this.targetedNode.y - this.player.y;
            turretRotation = Math.atan2(dy, dx) - this.player.rotation;
        }
        
        ctx.save();
        ctx.rotate(turretRotation);
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, -2, 10, 4);
        ctx.restore();
        
        ctx.restore();
        
        // Draw targeting line if a node is targeted
        if (this.targetedNode) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.moveTo(this.player.x, this.player.y);
            ctx.lineTo(this.targetedNode.x, this.targetedNode.y);
            ctx.stroke();
            
            // Draw firing arc
            const dx = this.targetedNode.x - this.player.x;
            const dy = this.targetedNode.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Calculate accuracy based on distance
            let arcWidth = Math.PI/6; // Default 30 degrees
            if (distance > 300) {
                arcWidth = Math.PI/4; // 45 degrees at long range
            } else if (distance < 100) {
                arcWidth = Math.PI/12; // 15 degrees at close range
            }
            
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            ctx.moveTo(this.player.x, this.player.y);
            ctx.arc(this.player.x, this.player.y, distance, angle - arcWidth/2, angle + arcWidth/2);
            ctx.closePath();
            ctx.fill();
        }
    },
    
    drawResourceNodes: function() {
        const ctx = this.ctx;
        
        for (const node of this.resourceNodes) {
            // Add glow effect for special nodes
            if (node.glowing) {
                node.pulsePhase += 0.05;
                const glowSize = Math.sin(node.pulsePhase) * 5 + 10;
                
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#' + node.color.toString(16).padStart(6, '0');
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + glowSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            
            // Basic node circle
            ctx.fillStyle = '#' + node.color.toString(16).padStart(6, '0');
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw node type label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, node.x, node.y - node.radius - 10);
            
            // Draw resources indicator
            let resourceText = `${node.veskar}V`;
            if (node.opul > 0) {
                resourceText += ` ${node.opul}O`;
            }
            ctx.fillText(resourceText, node.x, node.y + 4);
            
            // Draw health bar if damaged
            if (node.health < node.maxHealth) {
                const healthPercent = node.health / node.maxHealth;
                const barWidth = node.radius * 2;
                
                ctx.fillStyle = '#333';
                ctx.fillRect(node.x - barWidth/2, node.y + node.radius + 5, barWidth, 5);
                
                ctx.fillStyle = '#0f0';
                ctx.fillRect(node.x - barWidth/2, node.y + node.radius + 5, barWidth * healthPercent, 5);
            }
            
            // Highlight if targeted
            if (node === this.targetedNode) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    },
    
    updateAndDrawParticles: function() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.type === 'resource') {
                // Update resource particle
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                
                // Draw resource particle
                this.ctx.globalAlpha = p.life / 60;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            } 
            else if (p.type === 'laser') {
                // Update laser particle
                p.life--;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                
                // Draw laser
                this.ctx.globalAlpha = p.life / 5;
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(p.startX, p.startY);
                this.ctx.lineTo(p.endX, p.endY);
                this.ctx.stroke();
            }
        }
        this.ctx.globalAlpha = 1.0;
        
        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 1;
            ft.life--;
            
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }
            
            // Draw floating text
            this.ctx.globalAlpha = ft.life / 50;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
        }
        this.ctx.globalAlpha = 1.0;
    },
    
    gameLoop: function() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update
        this.movePlayerToTarget();
        
        // Draw
        this.drawResourceNodes();
        this.drawPlayer();
        this.updateAndDrawParticles();
        
        // Next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
};

// Start the game when page loads
window.addEventListener('load', () => {
    game.init();
});
