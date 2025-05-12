// Game configuration
const config = {
    shipSpeed: 3,
    rotationSpeed: 0.05,
    nodeGenerationInterval: 10000, // ms
    nodeLevels: [
        { health: 100, veskar: 5, opul: 0, color: 0xffaa00, radius: 15 },
        { health: 200, veskar: 5, opul: 5, color: 0x00aaff, radius: 20 },
        { health: 350, veskar: 10, opul: 10, color: 0xff00ff, radius: 25 }
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
    
    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.generateInitialNodes();
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
        // Don't exceed 15 nodes
        if (this.resourceNodes.length >= 15) return;
        
        // Randomize position away from player
        let x, y;
        do {
            x = Math.random() * this.canvas.width;
            y = Math.random() * this.canvas.height;
        } while (this.distanceBetween({x, y}, this.player) < 150);
        
        // Randomize node level based on distance from center
        const distFromCenter = this.distanceBetween(
            {x, y}, 
            {x: this.canvas.width/2, y: this.canvas.height/2}
        );
        
        let level;
        if (distFromCenter < 150) {
            level = 2; // Level 3 near center
        } else if (distFromCenter < 300) {
            level = 1; // Level 2 middle area
        } else {
            level = 0; // Level 1 outer area
        }
        
        const nodeType = config.nodeLevels[level];
        
        const node = {
            x,
            y,
            level,
            health: nodeType.health,
            maxHealth: nodeType.health,
            veskar: nodeType.veskar,
            opul: nodeType.opul,
            color: nodeType.color,
            radius: nodeType.radius
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
        
        // Deal damage to node
        this.targetedNode.health -= 20;
        
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
    
    collectResources: function(node) {
        // Add resources to player
        this.player.resources.veskar += node.veskar;
        this.player.resources.opul += node.opul;
        this.updateHUD();
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
        
        // Ship body
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        
        // Draw targeting line if a node is targeted
        if (this.targetedNode) {
            ctx.restore();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.moveTo(this.player.x, this.player.y);
            ctx.lineTo(this.targetedNode.x, this.targetedNode.y);
            ctx.stroke();
        } else {
            ctx.restore();
        }
    },
    
    drawResourceNodes: function() {
        const ctx = this.ctx;
        
        for (const node of this.resourceNodes) {
            // Draw node
            ctx.fillStyle = '#' + node.color.toString(16).padStart(6, '0');
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
            
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
    
    gameLoop: function() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update
        this.movePlayerToTarget();
        
        // Draw
        this.drawResourceNodes();
        this.drawPlayer();
        
        // Next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
};

// Start the game when page loads
window.addEventListener('load', () => {
    game.init();
});
