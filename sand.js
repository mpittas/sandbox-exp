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
        
        if (this.isMouseDown) {
            this.createParticles();
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
        
        const belowY = y + this.gridSize;
        return this.isPositionOccupied(x, belowY);
    }
    
    updateParticles(deltaTime) {
        this.particles.forEach(p => {
            if (p.settled) return;
            
            const newX = p.x + p.speedX;
            const newY = p.y + p.speedY;
            
            if (this.checkCollision(newX, newY)) {
                p.x = Math.floor(newX / this.gridSize) * this.gridSize;
                p.y = Math.floor(newY / this.gridSize) * this.gridSize;
                p.settled = true;
                this.setGridPosition(p.x, p.y, true);
                return;
            }
            
            p.x = newX;
            p.y = newY;
            
            p.speedY += 0.15;
            p.speedX *= 0.99;
            
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
        
        this.updateParticles(deltaTime);
        this.draw();
        
        requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize when the page loads
window.addEventListener('load', () => {
    new SandSimulation();
});