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
        
        // Configuration options
        this.config = {
            sandFlow: 2,
            fallSpeed: 2,
            colorSpeed: 0.5,
            pixelSize: 4,     // Controls size of new particles
            particlesPerFrame: 20  // Fixed value, not exposed to GUI
        };
        
        // Grid system for collision detection
        this.gridSize = this.config.pixelSize;
        
        // Color transition
        this.hue = 0;
        
        // Particle creation interval
        this.lastParticleTime = 0;
        this.particleInterval = 16; // Create particles every 16ms (roughly 60fps)
        
        // Set canvas to full window size
        this.resize();
        
        // Setup GUI
        this.setupGUI();
        
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
    
    setupGUI() {
        const gui = new dat.GUI();
        gui.add(this.config, 'sandFlow', 0, 40).step(0.5).name('Sand Flow');
        gui.add(this.config, 'fallSpeed', 0.5, 20).step(0.5).name('Fall Speed');
        gui.add(this.config, 'colorSpeed', 0.1, 2).step(0.1).name('Color Speed');
        gui.add(this.config, 'pixelSize', 1, 8).step(1).name('Pixel Size')
            .onChange((value) => {
                this.gridSize = value;
            });
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
        // Use smallest possible grid size (1) for consistent collision detection
        return `${Math.floor(x)},${Math.floor(y)}`;
    }
    
    isPositionOccupied(x, y, size) {
        // Check each pixel position within the particle's size
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                if (this.grid.has(this.getGridPosition(x + dx, y + dy))) {
                    return true;
                }
            }
        }
        return false;
    }
    
    setGridPosition(x, y, size, occupied) {
        // Set all pixel positions within the particle's size
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                const pos = this.getGridPosition(x + dx, y + dy);
                if (occupied) {
                    this.grid.add(pos);
                } else {
                    this.grid.delete(pos);
                }
            }
        }
    }
    
    checkCollision(x, y, size) {
        // Check canvas bounds first
        if (x < 0 || x + size > this.canvas.width || y + size > this.canvas.height) {
            return true;
        }
        return this.isPositionOccupied(x, y, size);
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
        const numParticles = this.config.particlesPerFrame;
        for (let i = 0; i < numParticles; i++) {
            // Reduce spread and align to grid for tighter stacking
            const spread = this.config.sandFlow;
            const rawX = this.mouseX + (Math.random() * spread * 2 - spread);
            const rawY = this.mouseY + (Math.random() * spread * 2 - spread);
            
            // Use current pixel size for new particles
            const size = this.config.pixelSize;
            
            // Align to current grid size for better stacking
            const x = Math.round(rawX / size) * size;
            const y = Math.round(rawY / size) * size;
            
            this.particles.push({
                x,
                y,
                size: size,  // Store size with particle
                speedX: 0,
                speedY: 0,
                color: this.getCurrentColor(),
                settled: false,
                birthTime: performance.now()
            });
        }
    }
    
    updateParticles(deltaTime) {
        this.particles.forEach(p => {
            if (p.settled) return;
            
            // Use particle's own size for grid alignment
            p.x = Math.round(p.x / p.size) * p.size;
            p.y = Math.round(p.y / p.size) * p.size;
            
            // Calculate pixels to move based on fall speed
            const pixelsToMove = Math.max(1, Math.floor(this.config.fallSpeed * (deltaTime / 16)));
            
            // Process multiple steps for smoother fast movement
            for (let step = 0; step < pixelsToMove; step++) {
                const nextY = p.y + 1; // Move one pixel at a time
                
                // Check if can move down
                if (this.checkCollision(p.x, nextY, p.size)) {
                    // Check diagonal positions
                    const leftX = p.x - 1;
                    const rightX = p.x + 1;
                    const canMoveLeft = leftX >= 0 && !this.checkCollision(leftX, nextY, p.size);
                    const canMoveRight = rightX + p.size <= this.canvas.width && !this.checkCollision(rightX, nextY, p.size);
                    
                    if (canMoveLeft || canMoveRight) {
                        // Determine direction based on row for consistent stacking
                        const row = Math.floor(p.y);
                        
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
                        this.setGridPosition(p.x, p.y, p.size, true);
                        break; // Exit the step loop if settled
                    }
                } else {
                    // Move straight down
                    p.y = nextY;
                }
                
                // If we've hit the bottom or another particle, no need to continue steps
                if (p.settled) break;
            }
        });
        
        // Update the global hue for color transition
        this.hue = (this.hue + this.config.colorSpeed) % 360;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);  // Use particle's own size
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