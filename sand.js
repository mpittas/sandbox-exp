class SandSimulation {
    constructor() {
        this.canvas = document.getElementById('sandCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for performance
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isMouseDown = false;
        this.isTouching = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        
        // Configuration options with mobile optimization
        const isMobile = this.isMobileDevice();
        this.config = {
<<<<<<< Updated upstream
            sandFlow: 15,
            fallSpeed: 3.5,
            colorSpeed: 0.5,
            particlesPerFrame: 20,  // Fixed value, not exposed to GUI
            pixelSize: 5  
=======
            sandFlow: isMobile ? 15 : 20,
            fallSpeed: isMobile ? 4 : 5,
            colorSpeed: 0.5,
            particlesPerFrame: isMobile ? 8 : 20,
            pixelSize: isMobile ? 8 : 5,
            shapeType: 'none',
            shapeSize: isMobile ? 80 : 100,
            maxParticles: isMobile ? 2000 : 5000 // Limit total particles
        };
        
        // Shape properties
        this.shape = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
>>>>>>> Stashed changes
        };
        
        // Grid system for collision detection
        this.gridSize = this.config.pixelSize;
        this.grid = new Set();
        
        // Color transition
        this.hue = 0;
        
        // Particle creation interval
        this.lastParticleTime = 0;
        this.particleInterval = isMobile ? 32 : 16;
        
        // Performance monitoring
        this.lastFPSUpdate = 0;
        this.fpsUpdateInterval = 1000; // Update FPS every second
        
        // Multi-touch support
        this.touches = new Map(); // Store multiple touch points
        
        // Set canvas to full window size
        this.resize();
        this.setupGUI();
        
        // Event listeners with passive touch handling
        window.addEventListener('resize', () => this.resize());
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
        this.canvas.addEventListener('mousedown', () => this.isMouseDown = true);
        this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
        this.canvas.addEventListener('mouseleave', () => this.isMouseDown = false);
        
        // Touch events with options for better performance
        const touchOptions = { passive: false };
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), touchOptions);
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), touchOptions);
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), touchOptions);
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), touchOptions);
        
        // Prevent unwanted mobile behaviors
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'none';
        
        // Start animation loop
        this.lastTime = performance.now();
        this.animate();
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 800);
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.touches.set(touch.identifier, { x, y });
        });
        this.isTouching = true;
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.touches.set(touch.identifier, { x, y });
            
            // Update mouse position for particle creation
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
            this.mouseX = x;
            this.mouseY = y;
        });
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            this.touches.delete(touch.identifier);
        });
        this.isTouching = this.touches.size > 0;
    }
    
    handleMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }
    
    setupGUI() {
        const gui = new dat.GUI();
        gui.add(this.config, 'sandFlow', 0, 40).step(0.5).name('Sand Flow');
        gui.add(this.config, 'fallSpeed', 0.5, 10).step(0.5).name('Fall Speed');
        gui.add(this.config, 'colorSpeed', 0.1, 2).step(0.1).name('Color Speed');
        gui.add(this.config, 'pixelSize', 2, 12).step(1).name('Pixel Size').onChange(() => {
            this.resetCanvas();
        });
    }
    
    resetCanvas() {
        this.gridSize = this.config.pixelSize;
        this.particles = [];
        this.grid = new Set();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.particles = [];
        this.grid = new Set();
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
    
<<<<<<< Updated upstream
    createParticles() {
        const numParticles = this.config.particlesPerFrame;
        for (let i = 0; i < numParticles; i++) {
            // Reduce spread and align to grid for tighter stacking
            const spread = this.config.sandFlow;
            const rawX = this.mouseX + (Math.random() * spread * 2 - spread);
            const rawY = this.mouseY + (Math.random() * spread * 2 - spread);
            
            // Align to grid immediately for better stacking
            const x = Math.round(rawX / this.gridSize) * this.gridSize;
            const y = Math.round(rawY / this.gridSize) * this.gridSize;
            
=======
    isInsideShape(x, y) {
        const px = x + this.gridSize/2;
        const py = y + this.gridSize/2;
        
        switch (this.config.shapeType) {
            case 'circle':
                const dx = px - this.shape.x;
                const dy = py - this.shape.y;
                return Math.sqrt(dx * dx + dy * dy) < this.config.shapeSize + this.gridSize/2;
                
            case 'square':
                const halfSize = this.config.shapeSize;
                return px >= this.shape.x - halfSize &&
                       px <= this.shape.x + halfSize &&
                       py >= this.shape.y - halfSize &&
                       py <= this.shape.y + halfSize;
                
            case 'triangle':
                const size = this.config.shapeSize * 2;
                const height = size * Math.sqrt(3) / 2;
                const x1 = this.shape.x;
                const y1 = this.shape.y - height/2;
                const x2 = this.shape.x - size/2;
                const y2 = this.shape.y + height/2;
                const x3 = this.shape.x + size/2;
                const y3 = this.shape.y + height/2;
                
                const denominator = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
                const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denominator;
                const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denominator;
                const c = 1 - a - b;
                
                return a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1;
                
            default:
                return false;
        }
    }
    
    checkCollision(x, y) {
        // Enhanced collision detection
        if (x < 0 || x >= this.canvas.width || y >= this.canvas.height) {
            return true;
        }
        
        // Check shape collision with a small buffer
        if (this.isInsideShape(x, y)) {
            return true;
        }
        
        // Check grid collision
        return this.isPositionOccupied(x, y);
    }
    
    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime > this.lastFPSUpdate + this.fpsUpdateInterval) {
            this.fps = (this.frameCount * 1000) / (currentTime - this.lastFPSUpdate);
            this.lastFPSUpdate = currentTime;
            this.frameCount = 0;
            
            // Dynamically adjust particle count based on FPS
            if (this.isMobileDevice()) {
                if (this.fps < 30) {
                    this.config.particlesPerFrame = Math.max(4, this.config.particlesPerFrame - 1);
                } else if (this.fps > 50) {
                    this.config.particlesPerFrame = Math.min(12, this.config.particlesPerFrame + 1);
                }
            }
        }
    }
    
    createParticles() {
        // Check total particle limit
        if (this.particles.length >= this.config.maxParticles) {
            return;
        }
        
        const numParticles = this.config.particlesPerFrame;
        
        // Create particles for each active touch point
        if (this.isTouching) {
            this.touches.forEach(touch => {
                for (let i = 0; i < numParticles; i++) {
                    this.createParticle(touch.x, touch.y);
                }
            });
        } else if (this.isMouseDown) {
            for (let i = 0; i < numParticles; i++) {
                this.createParticle(this.mouseX, this.mouseY);
            }
        }
    }
    
    createParticle(x, y) {
        const spread = this.config.sandFlow;
        const rawX = x + (Math.random() * spread * 2 - spread);
        const rawY = y + (Math.random() * spread * 2 - spread);
        
        const px = Math.round(rawX / this.gridSize) * this.gridSize;
        const py = Math.round(rawY / this.gridSize) * this.gridSize;
        
        if (!this.isInsideShape(px, py)) {
>>>>>>> Stashed changes
            this.particles.push({
                x: px,
                y: py,
                size: this.gridSize,
                color: this.getCurrentColor(),
                settled: false,
                birthTime: performance.now()
            });
        }
    }
    
    checkCollision(x, y) {
        // Check canvas bounds first
        if (x < 0 || x >= this.canvas.width || y >= this.canvas.height) {
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
            const fallSpeed = this.config.fallSpeed;
            const steps = Math.max(1, Math.floor(fallSpeed * (deltaTime / 16)));
            
            // Process multiple steps per frame for smoother fast movement
            for (let step = 0; step < steps; step++) {
                const nextY = p.y + this.gridSize;
                
                // Check if can move down
                if (this.checkCollision(p.x, nextY)) {
                    // Check diagonal positions
                    const leftX = p.x - this.gridSize;
                    const rightX = p.x + this.gridSize;
                    const canMoveLeft = leftX >= 0 && !this.checkCollision(leftX, nextY);
                    const canMoveRight = rightX < this.canvas.width && !this.checkCollision(rightX, nextY);
                    
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
            this.ctx.fillRect(p.x, p.y, this.gridSize, this.gridSize);
        });
    }
    
    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update FPS counter and adjust performance
        this.updateFPS(currentTime);
        
        // Create particles for all active touches
        if ((this.isMouseDown || this.isTouching) && 
            currentTime - this.lastParticleTime >= this.particleInterval) {
            this.createParticles();
            this.lastParticleTime = currentTime;
        }
        
        this.updateParticles(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize when the page load
window.addEventListener('load', () => {
    new SandSimulation();
});