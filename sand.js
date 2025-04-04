class SandSimulation {
    constructor() {
      this.canvas = document.getElementById("sandCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.particles = [];
      this.mouseX = 0;
      this.mouseY = 0;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.isMouseDown = false;
  
      // Initial state flag
      this.showInstructions = true;
  
      // Configuration options
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      this.config = {
        sandFlow: 20,
        fallSpeed: 5,
        colorSpeed: 0.5,
        particlesPerFrame: 20,
        pixelSize: this.isMobile ? 8 : 5,
        shapeType: "none",
        shapeSize: 100
      };
  
      // Shape propertie
      this.shape = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };
  
      // Grid system for collision detection
      this.gridSize = this.config.pixelSize;
      this.grid = new Set();
  
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
      window.addEventListener("resize", () => this.resize());
      this.canvas.addEventListener("mousemove", (e) => this.handleMouse(e));
      this.canvas.addEventListener("mousedown", () => (this.isMouseDown = true));
      this.canvas.addEventListener("mouseup", () => (this.isMouseDown = false));
      this.canvas.addEventListener(
        "mouseleave",
        () => (this.isMouseDown = false)
      );

      // Touch event listeners for mobile support
      this.canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.isMouseDown = true;
        const touch = e.touches[0];
        this.handleMouse(touch);
      });
      
      this.canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouse(touch);
      });
      
      this.canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.isMouseDown = false;
      });
      
      this.canvas.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        this.isMouseDown = false;
      });

      // Start animation loop
      this.lastTime = performance.now();
      this.animate();
    }
  
    setupGUI() {
      const gui = new dat.GUI();
      
      // Adjust GUI scaling for mobile
      if (this.isMobile) {
        const style = document.createElement('style');
        style.textContent = `
          /* Mobile portrait (default) */
          .dg.main {
            transform: scale(2.5);
            transform-origin: top right;
          }
          
          /* Mobile landscape */
          @media (orientation: landscape) and (max-height: 500px) {
            .dg.main {
              transform: scale(1.85);
            }
          }
          
          /* Tablet */
          @media (min-width: 768px) and (max-width: 1024px) {
            .dg.main {
              transform: scale(1.5);
            }
          }
        `;
        document.head.appendChild(style);
      }

      gui.add(this.config, "sandFlow", 0, 40).step(0.5).name("Sand Flow");
      gui.add(this.config, "fallSpeed", 0.5, 10).step(0.5).name("Fall Speed");
      gui.add(this.config, "colorSpeed", 0.1, 2).step(0.1).name("Color Speed");
      gui
        .add(this.config, "pixelSize", 2, 12)
        .step(1)
        .name("Pixel Size")
        .onChange(() => {
          this.resetCanvas();
        });
      gui
        .add(this.config, "shapeType", ["none", "circle", "square", "triangle"])
        .name("Shape Type")
        .onChange(() => {
          this.resetCanvas();
        });
      gui
        .add(this.config, "shapeSize", 20, 200)
        .step(2)
        .name("Shape Size")
        .onChange(() => {
          this.handleShapeChange();
        });
    }
  
    handleShapeChange() {
      if (this.config.shapeType === "none") return;
  
      // Clear the entire grid
      this.grid = new Set();
  
      // First pass: Mark all particles as unsettled and identify affected ones
      const affectedParticles = this.particles.filter((p) =>
        this.isInsideShape(p.x, p.y)
      );
  
      // Sort affected particles from bottom to top to prevent stacking issues
      affectedParticles.sort((a, b) => b.y - a.y);
  
      // Process affected particles
      affectedParticles.forEach((p) => {
        p.settled = false; // Unsettle the particle
  
        // Initialize search parameters
        let found = false;
        const maxRadius = Math.max(
          20,
          Math.ceil(this.config.shapeSize / this.gridSize)
        );
        const startAngle = Math.random() * Math.PI * 2; // Random start angle for better distribution
  
        // Spiral search pattern
        for (let radius = 1; radius <= maxRadius && !found; radius++) {
          // Try more positions at larger radii
          const angleStep = Math.PI / (4 * radius);
  
          for (let angle = 0; angle < Math.PI * 2 && !found; angle += angleStep) {
            const searchAngle = startAngle + angle;
            const dx = Math.round(Math.cos(searchAngle) * radius) * this.gridSize;
            const dy = Math.round(Math.sin(searchAngle) * radius) * this.gridSize;
  
            const newX = p.x + dx;
            const newY = p.y + dy;
  
            // Check if new position is valid
            if (
              newX >= 0 &&
              newX < this.canvas.width &&
              newY >= 0 &&
              newY < this.canvas.height &&
              !this.isInsideShape(newX, newY)
            ) {
              // Move particle to new position
              p.x = newX;
              p.y = newY;
              found = true;
            }
          }
        }
  
        // If no position found, move particle to a safe position above the shape
        if (!found) {
          const shapeTop = this.shape.y - this.config.shapeSize;
          const safeY = Math.max(this.gridSize, shapeTop - this.gridSize * 2);
          const spreadX = Math.min(50, this.canvas.width / 4);
          const safeX = Math.max(
            this.gridSize,
            Math.min(
              this.canvas.width - this.gridSize,
              this.shape.x + (Math.random() - 0.5) * spreadX
            )
          );
  
          p.x = Math.round(safeX / this.gridSize) * this.gridSize;
          p.y = Math.round(safeY / this.gridSize) * this.gridSize;
        }
      });
  
      // Mark all non-affected particles as unsettled to allow for natural falling
      this.particles.forEach((p) => {
        if (!affectedParticles.includes(p)) {
          p.settled = false;
        }
      });
    }
  
    resetCanvas() {
      this.gridSize = this.config.pixelSize;
  
      // Clear the grid but keep particles
      this.grid = new Set();
  
      // Reset all particles to unsettled state
      this.particles.forEach((p) => {
        p.settled = false;
      });
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
  
      return `hsl(${mainHue + hueVariation}, ${saturation + satVariation}%, ${
        lightness + lightVariation
      }%)`;
    }
  
    isInsideShape(x, y) {
      const px = x + this.gridSize / 2;
      const py = y + this.gridSize / 2;
  
      switch (this.config.shapeType) {
        case "circle":
          const dx = px - this.shape.x;
          const dy = py - this.shape.y;
          return (
            Math.sqrt(dx * dx + dy * dy) <
            this.config.shapeSize + this.gridSize / 2
          );
  
        case "square":
          const halfSize = this.config.shapeSize;
          return (
            px >= this.shape.x - halfSize &&
            px <= this.shape.x + halfSize &&
            py >= this.shape.y - halfSize &&
            py <= this.shape.y + halfSize
          );
  
        case "triangle":
          const size = this.config.shapeSize * 2;
          const height = (size * Math.sqrt(3)) / 2;
          const x1 = this.shape.x;
          const y1 = this.shape.y - height / 2;
          const x2 = this.shape.x - size / 2;
          const y2 = this.shape.y + height / 2;
          const x3 = this.shape.x + size / 2;
          const y3 = this.shape.y + height / 2;
  
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
  
        // Skip if position is inside shape
        if (this.isInsideShape(x, y)) {
          continue;
        }
  
        // Hide instructions on first particle creation
        if (this.showInstructions) {
          this.showInstructions = false;
        }

        this.particles.push({
          x,
          y,
          size: this.gridSize,
          speedX: 0,
          speedY: 0,
          color: this.getCurrentColor(),
          settled: false,
          birthTime: performance.now()
        });
      }
    }
  
    updateParticles(deltaTime) {
      // Clear grid before updating
      this.grid = new Set();
  
      // Re-add all settled particles to grid
      this.particles.forEach((p) => {
        if (p.settled) {
          this.setGridPosition(p.x, p.y, true);
        }
      });
  
      this.particles.forEach((p) => {
        if (p.settled) return;
  
        // Ensure grid alignment
        p.x = Math.round(p.x / this.gridSize) * this.gridSize;
        p.y = Math.round(p.y / this.gridSize) * this.gridSize;
  
        const fallSpeed = this.config.fallSpeed;
        const steps = Math.max(1, Math.floor(fallSpeed * (deltaTime / 16)));
  
        for (let step = 0; step < steps; step++) {
          const nextY = p.y + this.gridSize;
  
          if (this.checkCollision(p.x, nextY)) {
            const leftX = p.x - this.gridSize;
            const rightX = p.x + this.gridSize;
            const canMoveLeft = leftX >= 0 && !this.checkCollision(leftX, nextY);
            const canMoveRight =
              rightX < this.canvas.width && !this.checkCollision(rightX, nextY);
  
            if (canMoveLeft || canMoveRight) {
              const row = Math.floor(p.y / this.gridSize);
              if (canMoveLeft && canMoveRight) {
                p.x = row % 2 === 0 ? leftX : rightX;
              } else {
                p.x = canMoveLeft ? leftX : rightX;
              }
              p.y = nextY;
            } else {
              p.settled = true;
              this.setGridPosition(p.x, p.y, true);
              break;
            }
          } else {
            p.y = nextY;
          }
  
          if (p.settled) break;
        }
      });
  
      this.hue = (this.hue + this.config.colorSpeed) % 360;
    }
  
    drawShape() {
      if (this.config.shapeType === "none") return;
  
      this.ctx.fillStyle = "#444";
      this.ctx.beginPath();
  
      switch (this.config.shapeType) {
        case "circle":
          this.ctx.arc(
            this.shape.x,
            this.shape.y,
            this.config.shapeSize,
            0,
            Math.PI * 2
          );
          break;
  
        case "square":
          const halfSize = this.config.shapeSize;
          this.ctx.rect(
            this.shape.x - halfSize,
            this.shape.y - halfSize,
            halfSize * 2,
            halfSize * 2
          );
          break;
  
        case "triangle":
          const size = this.config.shapeSize * 2;
          const height = (size * Math.sqrt(3)) / 2;
          this.ctx.moveTo(this.shape.x, this.shape.y - height / 2);
          this.ctx.lineTo(this.shape.x - size / 2, this.shape.y + height / 2);
          this.ctx.lineTo(this.shape.x + size / 2, this.shape.y + height / 2);
          this.ctx.closePath();
          break;
      }
  
      this.ctx.fill();
    }
  
    draw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
      // Draw the shape first
      this.drawShape();
  
      // Draw instructions if needed
      if (this.showInstructions) {
        this.ctx.fillStyle = "#444"; // Dark grey color for text
        const fontSize = this.isMobile ? 24 : 32;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const text1 = "Click and drag";
        const text2 = "to make sand fall";
        const lineHeight = fontSize * 1.2; // Adjust line height multiplier as needed
        const y1 = this.canvas.height / 2 - lineHeight / 2;
        const y2 = this.canvas.height / 2 + lineHeight / 2;

        this.ctx.fillText(text1, this.canvas.width / 2, y1);
        this.ctx.fillText(text2, this.canvas.width / 2, y2);
      }
  
      // Then draw particles
      this.particles.forEach((p) => {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(p.x, p.y, this.gridSize, this.gridSize);
      });
    }
  
    animate(currentTime) {
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;
  
      // Create particles continuously when mouse is held down
      if (
        this.isMouseDown &&
        currentTime - this.lastParticleTime >= this.particleInterval
      ) {
        this.createParticles();
        this.lastParticleTime = currentTime;
      }
  
      this.updateParticles(deltaTime);
      this.draw();
  
      requestAnimationFrame((time) => this.animate(time));
    }
  }
  
  // Initialize when the page load
  window.addEventListener("load", () => {
    new SandSimulation();
  });