document.addEventListener('DOMContentLoaded', () => {
    const ball = document.getElementById('basketball');
    const ballImg = ball ? ball.querySelector('img') : null;
    const gameContainer = document.getElementById('basketball-game');
    const scoreElement = document.getElementById('score');
    const startBtn = document.getElementById('start-game-btn');
    const closeBtn = document.getElementById('close-game-btn');

    if (!ball || !gameContainer) return;

    let gameActive = false;
    let score = 0;
    let isDragging = false;
    let ballX = window.innerWidth / 2 - 40; // Center of screen
    let ballY = window.innerHeight - 100; // Bottom area
    let velocityX = 0;
    let velocityY = 0;
    let rotation = 0;
    let angularVelocity = 0;
    
    // Casual physics constants
    let gravity = 0.25; // Even lower gravity for slower feel
    let bounce = 0.7; // Slightly less bounce
    let friction = 0.995; // Less friction
    let throwPower = 15; // Slower throw

    let lastMouseX, lastMouseY;
    let lastTime;
    let wasAboveRim = false;

    // Hoop coordinates based on new image
    // Container is full screen.
    // Hoop container is absolute right: 0, top: 150px, width: 200px.
    // So hoop center X is roughly window.innerWidth - 100 (center of 200px container).
    // Y is 150 + 100 = 250.
    let hoopX = window.innerWidth - 100;
    let hoopY = 250;
    const rimRadius = 45; // Bigger rim

    // Debug Hitboxes
    const debugMode = true;
    const debugElements = [];

    function createDebugElement(x, y, width, height, color = 'red', borderRadius = '0') {
        if (!debugMode) return;
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        el.style.backgroundColor = color;
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '9998';
        el.style.borderRadius = borderRadius;
        gameContainer.appendChild(el);
        debugElements.push(el);
        return el;
    }

    function updateDebugElements() {
        if (!debugMode) return;
        // Clear old elements
        debugElements.forEach(el => el.remove());
        debugElements.length = 0;

        // Rim Points
        const rimLeftX = hoopX - rimRadius;
        const rimRightX = hoopX + rimRadius;
        const rimY = hoopY;

        createDebugElement(rimLeftX - 5, rimY - 5, 10, 10, 'blue', '50%');
        createDebugElement(rimRightX - 5, rimY - 5, 10, 10, 'blue', '50%');
        
        // Hoop Center
        createDebugElement(hoopX - 2, hoopY - 2, 4, 4, 'green', '50%');

        // Ball Hitbox
        createDebugElement(ballX, ballY, 80, 80, 'rgba(255, 0, 0, 0.2)', '50%');
    }

    window.addEventListener('resize', () => {
        hoopX = window.innerWidth - 100;
        if (!isDragging && !gameActive) {
             ballX = window.innerWidth / 2 - 40;
             ballY = window.innerHeight - 100;
             updateBallPosition();
        }
    });

    function updateBallPosition() {
        ball.style.left = `${ballX}px`;
        ball.style.top = `${ballY}px`;
        if (ballImg) {
            ballImg.style.transform = `rotate(${rotation}deg)`;
        }
        updateDebugElements();
    }

    // Game Control
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            gameContainer.classList.add('active');
            document.body.classList.add('game-mode');
            gameActive = true;
            // Reset ball
            ballX = window.innerWidth / 2 - 40;
            ballY = window.innerHeight - 100;
            velocityX = 0;
            velocityY = 0;
            angularVelocity = 0;
            updateBallPosition();
            gameLoop();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            gameContainer.classList.remove('active');
            document.body.classList.remove('game-mode');
            gameActive = false;
        });
    }

    const customCursor = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><text y=\"28\" font-size=\"28\">🖕</text></svg>') 16 16, auto";

    ball.addEventListener('mousedown', (e) => {
        if (!gameActive) return;
        isDragging = true;
        ball.style.cursor = customCursor;
        document.body.style.cursor = customCursor; // Force cursor on body
        velocityX = 0;
        velocityY = 0;
        angularVelocity = 0;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastTime = Date.now();
        wasAboveRim = false;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // No container offset needed for full screen fixed container
        ballX = e.clientX - 40; // Center ball (80px width)
        ballY = e.clientY - 40;

        const now = Date.now();
        const dt = now - lastTime;
        
        if (dt > 0) {
            // Calculate velocity
            const newVx = (e.clientX - lastMouseX) / dt * throwPower;
            const newVy = (e.clientY - lastMouseY) / dt * throwPower;
            
            // Smooth velocity
            velocityX = newVx;
            velocityY = newVy;
        }

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastTime = now;

        updateBallPosition();
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        ball.style.cursor = ''; // Revert to CSS
        document.body.style.cursor = ''; // Reset cursor on body
        
        // Add spin based on horizontal velocity
        angularVelocity = velocityX * 2;
    });

    function checkCollision() {
        const ballSize = 80;
        const ballRadius = ballSize / 2;
        const floorY = window.innerHeight - ballSize;
        const leftWall = 0;
        const rightWall = window.innerWidth - ballSize;

        // Floor
        if (ballY > floorY) {
            ballY = floorY;
            velocityY *= -bounce;
            velocityX *= friction;
            angularVelocity *= friction;
            
            // Stop if slow
            if (Math.abs(velocityY) < 1 && Math.abs(velocityX) < 1) {
                velocityY = 0;
                velocityX = 0;
                angularVelocity = 0;
            }
        }

        // Walls
        if (ballX < leftWall) {
            ballX = leftWall;
            velocityX *= -bounce;
            angularVelocity *= -0.5; // Spin reversal/loss on wall hit
        }
        if (ballX > rightWall) {
            ballX = rightWall;
            velocityX *= -bounce;
            angularVelocity *= -0.5;
        }

        // Ceiling
        if (ballY < 0) {
            ballY = 0;
            velocityY *= -bounce;
        }

        // Rim collision (simplified)
        // Rim is at hoopX, hoopY.
        // We check collision with "rim points" to simulate the ring.
        // Left rim point: hoopX - rimRadius, hoopY
        // Right rim point: hoopX + rimRadius, hoopY
        
        const rimLeftX = hoopX - rimRadius - 20; // Adjust for ball center vs top-left coord
        const rimRightX = hoopX + rimRadius - 20;
        const rimY = hoopY - 20; // Adjust for ball center

        [rimLeftX, rimRightX].forEach(rimPointX => {
            // Distance from ball center to rim point
            const ballCenterX = ballX + ballRadius;
            const ballCenterY = ballY + ballRadius;
            
            const dx = ballCenterX - rimPointX;
            const dy = ballCenterY - rimY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Collision radius = ball radius + rim thickness (approx 5)
            if (dist < ballRadius + 5) {
                // Bounce
                const angle = Math.atan2(dy, dx);
                const speed = Math.sqrt(velocityX*velocityX + velocityY*velocityY);
                
                // Reflect velocity vector
                // Simplified bounce: push away
                const pushForce = 0.5;
                velocityX += Math.cos(angle) * pushForce * speed + Math.cos(angle) * 2;
                velocityY += Math.sin(angle) * pushForce * speed + Math.sin(angle) * 2;
                
                // Push out of collision
                const overlap = (ballRadius + 5) - dist;
                ballX += Math.cos(angle) * overlap;
                ballY += Math.sin(angle) * overlap;
                
                // Add spin on rim hit
                angularVelocity += (dx > 0 ? -5 : 5);
            }
        });
    }

    function gameLoop() {
        if (!gameActive) return; // Stop loop if game closed

        if (!isDragging) {
            velocityY += gravity;
            ballX += velocityX;
            ballY += velocityY;
            rotation += angularVelocity;

            // Air resistance
            velocityX *= 0.998;
            velocityY *= 0.998;
            angularVelocity *= 0.99;

            checkCollision();

            // Scoring
            // Ball center
            const ballCenterX = ballX + 40;
            const ballCenterY = ballY + 40;

            // Check if ball passes through hoop center
            // Must be within X range and pass Y from top to bottom
            if (Math.abs(ballCenterX - hoopX) < rimRadius) {
                if (ballCenterY < hoopY && velocityY > 0) {
                    wasAboveRim = true;
                } else if (ballCenterY > hoopY && wasAboveRim && velocityY > 0) {
                    // Scored!
                    score++;
                    scoreElement.textContent = score;
                    scoreElement.style.color = '#f4c430'; // Primary color
                    scoreElement.style.transform = 'scale(1.5)';
                    setTimeout(() => {
                        scoreElement.style.color = '';
                        scoreElement.style.transform = 'scale(1)';
                    }, 500);
                    wasAboveRim = false;
                    
                    // Slow down slightly on swish
                    velocityY *= 0.8;
                }
            } else if (ballCenterY > hoopY + 50) {
                wasAboveRim = false;
            }

            updateBallPosition();
        }
        requestAnimationFrame(gameLoop);
    }

    // Initial setup
    // updateBallPosition(); // Don't update until game starts to avoid weird initial position
});
