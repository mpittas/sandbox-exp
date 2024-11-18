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
        
        // Mobile detection
        this.isMobile = this.isMobileDevice();
        
        // Configuration options with mobile optimization
        this.config = {
            sandFlow: this.isMobile ? 12 : 20,
            fallSpeed: this.isMobile ? 3 : 5,
            colorSpeed: 0.5,
            particlesPerFrame: this.isMobile ? 8 : 20,
            pixelSize: this.isMobile ? 8 : 5,
            shapeType: 'none',
            shapeSize: this.isMobile ? 80 : 100,
            maxParticles: this.isMobile ? 3000 : 5000 // Increased for mobile
        };
        
        // Shape properties
        this.shape = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        
        // Grid system for collision detection
        this.gridSize = this.config.pixelSize;
        this.grid = new Set();
        
        // Color transition
        this.hue = 0;
        
        // Particle creation interval (slower on mobile)
        this.lastParticleTime = 0;
        this.particleInterval = this.isMobile ? 32 : 16;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 60;
        this.fpsUpdateInterval = 1000;
        
        // Set canvas to full window size
        this.resize();
        this.setupGUI();
        
        // Event listeners
        window.addEventListener('resize', () => this.resize());
        
        // Mouse events for desktop
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
        this.canvas.addEventListener('mousedown', () => this.isMouseDown = true);
        this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
        this.canvas.addEventListener('mouseleave', () => this.isMouseDown = false);
        
        // Touch events for mobile
        const touchOptions = { passive: false };
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e, true), touchOptions);
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e), touchOptions);
        this.canvas.addEventListener('touchend', () => {
            this.isTouching = false;
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
        }, touchOptions);
        this.canvas.addEventListener('touchcancel', () => {
            this.isTouching = false;
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
        }, touchOptions);
        
        // Prevent unwanted mobile behaviors
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'none';
        
        // Prevent default touch events on the canvas
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
        this.canvas.style.webkitUserSelect = 'none';
        this.canvas.style.webkitTouchCallout = 'none';
        
        // Start animation loop
        this.lastTime = performance.now();
        this.animate();
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
    
    handleMouse(e) {
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }
    
    handleTouch(e, isStart = false) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = Math.round(touch.clientX - rect.left);
        this.mouseY = Math.round(touch.clientY - rect.top);
        
        if (isStart) {
            this.isTouching = true;
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
        }
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
        // Allow creating particles even when at max, but clean up old ones
        if (this.particles.length >= this.config.maxParticles) {
            // Remove 10% of the oldest settled particles
            const settledParticles = this.particles.filter(p => p.settled);
            if (settledParticles.length > 0) {
                const removeCount = Math.floor(settledParticles.length * 0.1);
                const particlesToRemove = settledParticles.slice(0, removeCount);
                this.particles = this.particles.filter(p => !particlesToRemove.includes(p));
            }
        }
        
        const spread = this.config.sandFlow;
        const count = this.config.particlesPerFrame;
        
        // Calculate the movement vector
        const dx = this.mouseX - this.lastMouseX;
        const dy = this.mouseY - this.lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If there's significant movement, create particles along the path
        if (distance > 0) {
            const steps = Math.max(1, Math.floor(distance / (this.gridSize / 2)));
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const x = this.lastMouseX + dx * t;
                const y = this.lastMouseY + dy * t;
                
                for (let j = 0; j < count / steps; j++) {
                    const offsetX = (Math.random() - 0.5) * spread;
                    const offsetY = (Math.random() - 0.5) * spread;
                    const finalX = Math.round((x + offsetX) / this.gridSize) * this.gridSize;
                    const finalY = Math.round((y + offsetY) / this.gridSize) * this.gridSize;
                    
                    if (!this.isPositionOccupied(finalX, finalY) && 
                        finalX >= 0 && finalX < this.canvas.width &&
                        finalY >= 0 && finalY < this.canvas.height) {
                        this.particles.push({
                            x: finalX,
                            y: finalY,
                            color: this.getCurrentColor(),
                            settled: false,
                            birthTime: performance.now()
                        });
                    }
                }
            }
        } else {
            // If no movement, create particles at the current position
            for (let i = 0; i < count; i++) {
                const offsetX = (Math.random() - 0.5) * spread;
                const offsetY = (Math.random() - 0.5) * spread;
                const finalX = Math.round((this.mouseX + offsetX) / this.gridSize) * this.gridSize;
                const finalY = Math.round((this.mouseY + offsetY) / this.gridSize) * this.gridSize;
                
                if (!this.isPositionOccupied(finalX, finalY) && 
                    finalX >= 0 && finalX < this.canvas.width &&
                    finalY >= 0 && finalY < this.canvas.height) {
                    this.particles.push({
                        x: finalX,
                        y: finalY,
                        color: this.getCurrentColor(),
                        settled: false,
                        birthTime: performance.now()
                    });
                }
            }
        }
        
        // Update last position
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
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
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime > this.lastFPSUpdate + this.fpsUpdateInterval) {
            this.fps = (this.frameCount * 1000) / (currentTime - this.lastFPSUpdate);
            this.lastFPSUpdate = currentTime;
            this.frameCount = 0;
            
            // Clean up settled particles if we're near the limit
            if (this.particles.length > this.config.maxParticles * 0.9) {
                const settledParticles = this.particles.filter(p => p.settled);
                if (settledParticles.length > 0) {
                    // Remove 20% of settled particles
                    const removeCount = Math.floor(settledParticles.length * 0.2);
                    const particlesToRemove = settledParticles.slice(0, removeCount);
                    this.particles = this.particles.filter(p => !particlesToRemove.includes(p));
                }
            }
            
            // Dynamically adjust particle count based on FPS
            if (this.isMobile) {
                if (this.fps < 30) {
                    this.config.particlesPerFrame = Math.max(5, this.config.particlesPerFrame - 1);
                    this.particleInterval = Math.min(48, this.particleInterval + 2);
                } else if (this.fps > 45) {
                    this.config.particlesPerFrame = Math.min(12, this.config.particlesPerFrame + 1);
                    this.particleInterval = Math.max(16, this.particleInterval - 2);
                }
            }
        }
        
        // Create particles when mouse is down or touching
        if ((this.isMouseDown || this.isTouching) && 
            currentTime - this.lastParticleTime >= this.particleInterval) {
            this.createParticles();
            this.lastParticleTime = currentTime;
        }
        
        this.updateParticles(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.animate(time));
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// Initialize when the page load
window.addEventListener('load', () => {
    new SandSimulation();
});