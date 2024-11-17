class SandSimulation {
    constructor() {
        this.canvas = document.getElementById('sandCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isMouseDown = false;
        
        // Grid system for collision detection
        this.gridSize = 5; // Smaller particles
        this.grid = new Set();
        
        // Color transition
        this.hue = 0;
        this.colorSpeed = 0.5;
        
        // Particle creation interval
        this.lastParticleTime = 0;
        this.particleInterval = 8; // Create particles more frequently (120fps)
        
        // Set canvas to full window size
        this.resize();
        
        // Event listeners
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
        this.canvas.addEventListener('mousedown', () => this.isMouseDown = true);
        this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
        this.canvas.addEventListener('mouseleave', () => this.isMouseDown = false);
        
        // Start animation loop
        this.lastTime = performance.now();
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.grid = new Set();
    }
    
    handleMouse(e) {
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }
    
    getGridPosition(x, y) {
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        return `${gridX},${gridY}`;
    }
    
    isPositionOccupied(x, y) {
        return this.grid.has(this.getGridPosition(x, y));
    }
    
    setGridPosition(x, y, occupied) {
        const pos = this.getGridPosition(x, y);
        if (occupied) {
            this.grid.add(pos);
        } else {
            this.grid.delete(pos);
        }
    }
    
    getCurrentColor() {
        // Get the main color from the current hue
        const mainHue = this.hue;
        const saturation = 80;
        const lightness = 60;
        
        // Create slight variations for visual interest
        const hueVariation = (Math.random() - 0.5) * 10;
        const satVariation = (Math.random() - 0.5) * 10;
        const lightVariation = (Math.random() - 0.5) * 10;
        
        return `hsl(${mainHue + hueVariation}, ${saturation + satVariation}%, ${lightness + lightVariation}%)`;
    }
    
    createParticles() {
        const numParticles = 12; // Create more particles per batch
        for (let i = 0; i < numParticles; i++) {
            const spread = 3; // Tighter spread for more focused flow
            const x = this.mouseX + (Math.random() * spread * 2 - spread);
            const y = this.mouseY + (Math.random() * spread * 2 - spread);
            
            this.particles.push({
                x,
                y,
                size: this.gridSize,
                speedX: (Math.random() - 0.5) * 0.8, // Reduced initial horizontal speed
                speedY: Math.random() * 0.5, // Reduced initial vertical speed
                color: this.getCurrentColor(),
                settled: false,
                birthTime: performance.now()
            });
        }
    }
    
    checkCollision(x, y) {
        if (y >= this.canvas.height - this.gridSize) {
            return true;
        }
        return this.isPositionOccupied(x, y);
    }
    
    updateParticles(deltaTime) {
        this.particles.forEach(p => {
            if (p.settled) return;
            
            // Remove from old position
            if (p.settled) {
                this.setGridPosition(p.x, p.y, false);
            }
            
            const newX = p.x + p.speedX;
            const newY = p.y + p.speedY;
            
            // Check if can move down
            if (this.checkCollision(newX, newY + this.gridSize)) {
                // Try moving diagonally
                const canMoveLeft = !this.checkCollision(newX - this.gridSize, newY + this.gridSize);
                const canMoveRight = !this.checkCollision(newX + this.gridSize, newY + this.gridSize);
                
                if (canMoveLeft || canMoveRight) {
                    // Choose a direction randomly if both are available
                    if (canMoveLeft && canMoveRight) {
                        p.x += (Math.random() < 0.5 ? -1 : 1) * this.gridSize;
                        p.speedX *= 0.8; // Maintain some horizontal momentum
                    } else if (canMoveLeft) {
                        p.x -= this.gridSize;
                        p.speedX = Math.min(p.speedX, -0.2); // Add slight left momentum
                    } else {
                        p.x += this.gridSize;
                        p.speedX = Math.max(p.speedX, 0.2); // Add slight right momentum
                    }
                    p.y = newY;
                } else {
                    // If can't move diagonally, settle
                    p.x = Math.floor(newX / this.gridSize) * this.gridSize;
                    p.y = Math.floor(newY / this.gridSize) * this.gridSize;
                    p.settled = true;
                    this.setGridPosition(p.x, p.y, true);
                }
            } else {
                // Can move straight down
                p.x = newX;
                p.y = newY;
            }
            
            p.speedY += 0.2; // Increased gravity
            p.speedX *= 0.95; // Reduced horizontal drag for more movement
            
            // Keep within bounds
            p.x = Math.max(0, Math.min(this.canvas.width - this.gridSize, p.x));
        });
        
        // Update the global hue for color transition
        this.hue = (this.hue + this.colorSpeed) % 360;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, this.gridSize, this.gridSize);
        });
    }
    
    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Create particles continuously when mouse is held down
        if (this.isMouseDown && currentTime - this.lastParticleTime >= this.particleInterval) {
            this.createParticles();
            this.lastParticleTime = currentTime;
        }
        
        this.updateParticles(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize when the page loads
window.addEventListener('load', () => {
    new SandSimulation();
});