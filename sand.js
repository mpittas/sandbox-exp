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
        this.gridSize = 4;
        this.grid = new Set();
        
        // Color transition
        this.hue = 0;
        this.colorSpeed = 0.5;
        
        // Particle creation interval
        this.lastParticleTime = 0;
        this.particleInterval = 16; // Create particles every 16ms (roughly 60fps)
        
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
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const spread = 5;
            const x = this.mouseX + (Math.random() * spread * 2 - spread);
            const y = this.mouseY + (Math.random() * spread * 2 - spread);
            
            this.particles.push({
                x,
                y,
                size: this.gridSize,
                speedX: (Math.random() - 0.5) * 1,
                speedY: Math.random() * 1 - 0.5,
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
            
            // Ensure grid alignment at all times
            p.x = Math.round(p.x / this.gridSize) * this.gridSize;
            p.y = Math.round(p.y / this.gridSize) * this.gridSize;
            
            // Calculate fall distance based on deltaTime
            const fallSpeed = 2; // Increased fall speed
            const steps = Math.max(1, Math.floor(fallSpeed * (deltaTime / 16))); // Smooth multi-step movement
            
            // Process multiple steps per frame for smoother fast movement
            for (let step = 0; step < steps; step++) {
                const nextY = p.y + this.gridSize;
                
                // Check if can move down
                if (this.checkCollision(p.x, nextY)) {
                    // Check diagonal positions
                    const leftX = p.x - this.gridSize;
                    const rightX = p.x + this.gridSize;
                    const canMoveLeft = !this.checkCollision(leftX, nextY);
                    const canMoveRight = !this.checkCollision(rightX, nextY);
                    
                    if (canMoveLeft || canMoveRight) {
                        // Determine direction based on row for consistent stacking
                        const row = Math.floor(p.y / this.gridSize);
                        
                        if (canMoveLeft && canMoveRight) {
                            // Choose direction based on row number for alternating pattern
                            p.x = (row % 2 === 0) ? leftX : rightX;
                        } else {
                            // Move to the only available side
                            p.x = canMoveLeft ? leftX : rightX;
                        }
                        p.y = nextY;
                    } else {
                        // If can't move diagonally, settle here
                        p.settled = true;
                        this.setGridPosition(p.x, p.y, true);
                        break; // Exit the step loop if settled
                    }
                } else {
                    // Move straight down
                    p.y = nextY;
                }
                
                // Keep within bounds
                p.x = Math.max(0, Math.min(this.canvas.width - this.gridSize, p.x));
                
                // If we've hit the bottom or another particle, no need to continue steps
                if (p.settled) break;
            }
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