// Game constants
const GRAVITY = 0.05;
const FLAP_STRENGTH = -4;
const PIPE_SPEED = 3;
const PIPE_GAP = 300;
const PIPE_FREQUENCY = 2000;
const PIPE_WIDTH = 600;
const PIPE_COLOR = '#2ecc71'; // Nice green color for pillars

// Get DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverElement = document.getElementById('gameOver');
const coverPage = document.getElementById('coverPage');
const loadingScreen = document.getElementById('loadingScreen');
const loadingProgress = document.getElementById('loadingProgress');
const loadingText = document.getElementById('loadingText');
const playButton = document.getElementById('playButton');

// Set canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log('Canvas resized:', canvas.width, 'x', canvas.height);
}

// Call resize on load and when window is resized
window.addEventListener('load', async () => {
    console.log('Window loaded');
    resizeCanvas();
    
    // Hide cover page and show loading screen
    coverPage.style.display = 'none';
    loadingScreen.style.display = 'flex';
    
    // Start loading images
    const success = await loadAllImages();
    if (success) {
        console.log('All images loaded successfully');
        loadingScreen.style.display = 'none';
        showStartScreen = true;
        imagesLoaded = true;
        canvas.style.display = 'block'; // Make sure canvas is visible
        drawStartScreen();
        gameLoop(); // Start the game loop
    } else {
        console.error('Failed to load some images');
        loadingText.textContent = 'Failed to load images. Please check the console and refresh.';
        loadingText.style.color = '#ff0000';
    }
});
window.addEventListener('resize', resizeCanvas);

// Load images
const dragonImg1 = new Image();
const dragonImg2 = new Image();
const backgroundImg = new Image();
const pillarImg = new Image();
const startImg = new Image();
const endImg = new Image();

// Add error handling for image loading
function handleImageError(imageName) {
    console.error(`Failed to load ${imageName}`);
    loadingText.textContent = `Error loading ${imageName}. Please refresh the page.`;
    loadingText.style.color = '#ff0000';
}

dragonImg1.onerror = () => handleImageError('riyaldragonup.png.png');
dragonImg2.onerror = () => handleImageError('riyaldragondown.png.png');
backgroundImg.onerror = () => handleImageError('partn.png.png');
pillarImg.onerror = () => handleImageError('pillar.png.png');
startImg.onerror = () => handleImageError('start.png.png');
endImg.onerror = () => handleImageError('end.png.png');

// Set image sources
dragonImg1.src = 'riyaldragonup.png.png';
dragonImg2.src = 'riyaldragondown.png.png';
backgroundImg.src = 'partn.png.png';
pillarImg.src = 'pillar.png.png';
startImg.src = 'start.png.png';
endImg.src = 'end.png.png';

// Game state
let dragon = {
    x: canvas.width / 4,
    y: canvas.height / 2,
    velocity: 0,
    width: 180, // Increased size
    height: 180, // Increased size
    currentImage: 1, // Track which image to show
    animationState: 0 // Track animation state
};

let pipes = [];
let score = 0;
let gameOver = false;
let lastPipeTime = 0;
let imagesLoaded = false;
let gameStarted = false;
let showStartScreen = true;

// Countdown state variables
let countdownActive = false;
let countdownValue = 3;
let countdownTimer = null;

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        if (showStartScreen) {
            showStartScreen = false;
            initiateCountdown(); // Start countdown instead of game directly
            return;
        }
        
        if (gameOver) {
            resetGame(); // This will now set showStartScreen = true
            return;
        }
    }
    
    if (e.code === 'Space') {
        if (!gameStarted || gameOver || countdownActive) return; // Only flap if game is active
        
        dragon.velocity = FLAP_STRENGTH;
        dragon.currentImage = dragon.currentImage === 1 ? 2 : 1;
    }
});

function initiateCountdown() {
    countdownActive = true;
    countdownValue = 3;
    gameStarted = false; // Ensure game is not marked as started during countdown

    if(countdownTimer) clearInterval(countdownTimer);

    // gameLoop will call drawCountdownScreen immediately to show "3"
    countdownTimer = setInterval(() => {
        countdownValue--;
        if (countdownValue < 1) {
            clearInterval(countdownTimer);
            countdownActive = false;
            actuallyStartGame();
        }
    }, 1000);
}

function actuallyStartGame() {
    // Setup game state for active play
    dragon.y = canvas.height / 2;
    dragon.velocity = 0;
    dragon.currentImage = 1;
    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = true; // Now the game is officially started
    lastPipeTime = Date.now(); // Start pipe generation timing

    console.log('Game started after countdown!');
}

function resetGame() {
    dragon.y = canvas.height / 2;
    dragon.velocity = 0;
    dragon.currentImage = 1;
    dragon.animationState = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    lastPipeTime = 0;
    
    gameStarted = false; // Game is no longer active
    showStartScreen = true; // Go back to the start screen
    countdownActive = false; // Ensure countdown is not active
    if (countdownTimer) clearInterval(countdownTimer); // Clear any existing countdown timer
}

function createPipe() {
    const gapY = Math.random() * (canvas.height - 300) + 150;
    pipes.push({
        x: canvas.width,
        gapY: gapY,
        passed: false
    });
}

function updatePipes() {
    const currentTime = Date.now();
    if (currentTime - lastPipeTime > PIPE_FREQUENCY) {
        createPipe();
        lastPipeTime = currentTime;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;

        // Remove pipes that are off screen
        if (pipes[i].x < -100) {
            pipes.splice(i, 1);
            continue;
        }

        // Check if dragon passed the pipe
        if (!pipes[i].passed && pipes[i].x < dragon.x) {
            pipes[i].passed = true;
            score++;
        }

        // Check collision
        if (checkCollision(pipes[i])) {
            gameOver = true;
        }
    }
}

function checkCollision(pipe) {
    const dragonRight = dragon.x + dragon.width;
    const dragonLeft = dragon.x;
    const dragonTop = dragon.y;
    const dragonBottom = dragon.y + dragon.height;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;
    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;

    // Add a much larger buffer zone for more forgiving collision
    const horizontalBuffer = 200;
    const verticalBuffer = 100;

    // Only check collision if dragon is within the pipe's horizontal bounds (with buffer)
    if (dragonRight < pipeLeft + horizontalBuffer || dragonLeft > pipeRight - horizontalBuffer) {
        return false;
    }

    // Check if dragon is within the vertical gap (with buffer)
    if (dragonTop < gapTop - verticalBuffer || dragonBottom > gapBottom + verticalBuffer) {
        return true;
    }

    return false;
}

function updateDragon() {
    // Apply gravity with a smoother acceleration
    dragon.velocity += GRAVITY;
    
    // Add a terminal velocity to prevent too fast falling
    const TERMINAL_VELOCITY = 5;
    if (dragon.velocity > TERMINAL_VELOCITY) {
        dragon.velocity = TERMINAL_VELOCITY;
    }
    
    dragon.y += dragon.velocity;

    // Check if dragon hits the ground or ceiling
    if (dragon.y < 0) {
        dragon.y = 0;
        dragon.velocity = 0;
    } else if (dragon.y + dragon.height > canvas.height) {
        gameOver = true;
    }
}

function drawStartScreen() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw start screen
    if (startImg.complete) {
        console.log('Drawing start screen, image dimensions:', startImg.width, 'x', startImg.height);
        // Draw the start image centered on the canvas
        const scale = Math.min(canvas.width / startImg.width, canvas.height / startImg.height);
        const width = startImg.width * scale;
        const height = startImg.height * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        
        ctx.drawImage(startImg, x, y, width, height);
    } else {
        console.log('Start image not loaded yet');
        // Draw a background color while waiting
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw loading text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
    }
}

function draw() {
    if (showStartScreen) {
        drawStartScreen();
        return;
    }

    // Clear the canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (backgroundImg.complete) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    }

    // Draw dragon
    if (imagesLoaded && (dragon.currentImage === 1 ? dragonImg1.complete : dragonImg2.complete)) {
        ctx.drawImage(
            dragon.currentImage === 1 ? dragonImg1 : dragonImg2,
            dragon.x,
            dragon.y,
            dragon.width,
            dragon.height
        );
    }

    // Draw pipes
    if (pillarImg.complete) {
        pipes.forEach(pipe => {
            // Draw top pipe - extend above screen
            ctx.drawImage(
                pillarImg,
                pipe.x,
                -canvas.height,
                PIPE_WIDTH,
                pipe.gapY - PIPE_GAP / 2 + canvas.height
            );

            // Draw bottom pipe - extend below screen and flip upside down
            ctx.save();
            ctx.translate(pipe.x, pipe.gapY + PIPE_GAP / 2);
            ctx.scale(1, -1);
            ctx.drawImage(
                pillarImg,
                0,
                -canvas.height * 2,
                PIPE_WIDTH,
                canvas.height * 2
            );
            ctx.restore();
        });
    }

    // Draw score with lava effect
    const scoreText = `Score: ${score}`;
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Comic Sans MS", cursive';
    
    // Add glow effect
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 15;
    
    // Draw multiple layers for lava effect
    // Outer glow
    ctx.fillStyle = '#ff4500';
    ctx.fillText(scoreText, canvas.width / 2, 50);
    
    // Middle layer
    ctx.fillStyle = '#ff8c00';
    ctx.fillText(scoreText, canvas.width / 2, 48);
    
    // Inner layer
    ctx.fillStyle = '#ffd700';
    ctx.fillText(scoreText, canvas.width / 2, 46);
    
    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw end screen if game is over
    if (gameOver && endImg.complete) {
        const scale = Math.min(canvas.width / endImg.width, canvas.height / endImg.height);
        const width = endImg.width * scale;
        const height = endImg.height * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        
        ctx.drawImage(endImg, x, y, width, height);
        
        // Draw final score with the same lava effect as in-game score
        const finalScoreText = `Final Score: ${score}`;
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px "Comic Sans MS", cursive';
        
        // Add glow effect
        ctx.shadowColor = '#ff4500';
        ctx.shadowBlur = 15;
        
        // Draw multiple layers for lava effect
        // Outer glow
        ctx.fillStyle = '#ff4500';
        ctx.fillText(finalScoreText, canvas.width / 2, 100);
        
        // Middle layer
        ctx.fillStyle = '#ff8c00';
        ctx.fillText(finalScoreText, canvas.width / 2, 98);
        
        // Inner layer
        ctx.fillStyle = '#ffd700';
        ctx.fillText(finalScoreText, canvas.width / 2, 96);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
}

function drawCountdownScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (optional, or can be black)
    if (backgroundImg.complete) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#333'; // Fallback background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw countdown number
    ctx.fillStyle = 'white';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(countdownValue.toString(), canvas.width / 2, canvas.height / 2);

    // Draw disclaimer text
    ctx.font = 'bold 36px Arial';
    ctx.fillText('Control dragon with Spacebar', canvas.width / 2, canvas.height / 2 + 80);
}

function gameLoop() {
    if (showStartScreen) {
        drawStartScreen();
    } else if (countdownActive) {
        drawCountdownScreen();
    } else { // Covers active game play or game over states
        if (gameStarted && !gameOver) { // Only update if game is active and not over
            updateDragon();
            updatePipes();
        }
        draw(); // Draws game elements, and if gameOver, also the end screen overlay
    }
    requestAnimationFrame(gameLoop);
}

// Load all images
async function loadAllImages() {
    try {
        console.log('Starting to load all images...');
        
        // Load start image first
        await loadImage(startImg, 'start.png.png');
        console.log('Start image loaded');
        
        // Then load other images
        await Promise.all([
            loadImage(dragonImg1, 'riyaldragonup.png.png'),
            loadImage(dragonImg2, 'riyaldragondown.png.png'),
            loadImage(backgroundImg, 'partn.png.png'),
            loadImage(pillarImg, 'pillar.png.png'),
            loadImage(endImg, 'end.png.png')
        ]);
        console.log('All images loaded successfully');
        
        return true;
    } catch (error) {
        console.error('Error loading images:', error);
        return false;
    }
}

function loadImage(img, src) {
    return new Promise((resolve, reject) => {
        img.onload = () => {
            console.log(`Successfully loaded: ${src}`);
            resolve();
        };
        img.onerror = () => {
            console.error(`Failed to load: ${src}`);
            reject(`Failed to load: ${src}`);
        };
        img.src = src;
    });
}

// Start the game loop immediately
gameLoop(); 