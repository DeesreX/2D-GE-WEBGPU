import { initializeWebGPU, createTilePipeline } from './webgpu/webgpu-setup.js';

const CONSTANTS = Object.freeze({
    CANVAS: {
        WIDTH: window.innerWidth,
        HEIGHT: window.innerHeight
    },
    COLORS: {
        DEFAULT_TILE: Object.freeze({ r: 0.7, g: 0.8, b: 0.7, a: 1.0 }),
        WALL_TILE: Object.freeze({ r: 0.2, g: 0.2, b: 0.2, a: 1.0 }),
        OBJECT: Object.freeze({ r: 0.4, g: 0.1, b: 0.5, a: 1.0 }),
        BACKGROUND: Object.freeze({ r: 0.1, g: 0.1, b: 0.1, a: 1.0 }),
        HOVER_TILE: Object.freeze({ r: 1.0, g: 0.5, b: 0.0, a: 1.0 })
    },
    OBJECTS: ["Tree", "Rock", "House", "NPC"]
});

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Set initial canvas size
    updateCanvasSize(canvas);

    const { device, context, format } = await initializeWebGPU(canvas);
    if (!device || !context || !format) {
        console.error('WebGPU initialization failed');
        return;
    }

    initializeTileMap(20, 15);
    setupCanvasHandlers(canvas, device, context, format);
    
    // Start game loop
    let animationFrameId;
    const gameLoop = (timestamp) => {
        update(timestamp);
        render(device, context, format);
        animationFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop(0);

    // Cleanup function
    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };
});

function updateCanvasSize(canvas) {
    // Get the container dimensions
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth - 250; // Adjusted for sidebar
    const containerHeight = container.clientHeight;

    // Calculate the tile size based on map dimensions
    const mapWidth = gameState.tileMap?.[0]?.length || 20;
    const mapHeight = gameState.tileMap?.length || 15;
    const tileSize = Math.min(
        containerWidth / mapWidth,
        containerHeight / mapHeight
    );

    // Set canvas size
    canvas.width = Math.floor(tileSize * mapWidth);
    canvas.height = Math.floor(tileSize * mapHeight);
    
    // Set CSS dimensions to match actual dimensions
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
}

function setupCanvasHandlers(canvas, device, context, format) {
    const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize(canvas);
        render(device, context, format);
    });
    resizeObserver.observe(canvas.parentElement);

    // Touch event handling
    let touchStartX, touchStartY;
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        handlePointerMove(touch, canvas);
    });

    // Mouse event handling
    canvas.addEventListener('mousemove', (e) => handlePointerMove(e, canvas));
    canvas.addEventListener('mouseleave', () => {
        gameState.hoverTile = null;
    });

    // Click/tap handling
    canvas.addEventListener('click', (e) => handlePointerClick(e, canvas));
    canvas.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        if (Math.abs(touch.clientX - touchStartX) < 10 && Math.abs(touch.clientY - touchStartY) < 10) {
            handlePointerClick(touch, canvas);
        }
    });

    setupDragAndDrop(canvas);
}

function handlePointerMove(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const tileSize = getTileSize(canvas);
    const x = Math.floor((event.clientX - rect.left) / tileSize);
    const y = Math.floor((event.clientY - rect.top) / tileSize);

    if (isValidTilePosition(x, y)) {
        gameState.hoverTile = { x, y };
        updateCoordinatesDisplay(x, y);
    }
}

function handlePointerClick(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const tileSize = getTileSize(canvas);
    const x = Math.floor((event.clientX - rect.left) / tileSize);
    const y = Math.floor((event.clientY - rect.top) / tileSize);

    if (isValidTilePosition(x, y)) {
        const tileType = gameState.tileMap[y][x];
        updateInspector(tileType, x, y);
    }
}

function setupDragAndDrop(canvas) {
    const hoverIndicator = document.createElement('div');
    hoverIndicator.id = 'hoverIndicator';
    document.body.appendChild(hoverIndicator);

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        updateHoverIndicator(e, canvas, hoverIndicator);
    });

    canvas.addEventListener('dragleave', () => {
        hoverIndicator.style.display = 'none';
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        hoverIndicator.style.display = 'none';
        handleObjectDrop(e, canvas);
    });
}

function updateHoverIndicator(event, canvas, indicator) {
    const tileSize = getTileSize(canvas);
    const { clampedX, clampedY } = getTileIndices(event, canvas, tileSize);
    const rect = canvas.getBoundingClientRect();
    
    Object.assign(indicator.style, {
        left: `${Math.floor(rect.left + clampedX * tileSize)}px`,
        top: `${Math.floor(rect.top + clampedY * tileSize)}px`,
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        display: 'block'
    });
}

function handleObjectDrop(event, canvas) {
    const objectType = event.dataTransfer.getData('text/plain');
    const tileSize = getTileSize(canvas);
    const { clampedX, clampedY } = getTileIndices(event, canvas, tileSize);
    
    if (isValidTilePosition(clampedX, clampedY)) {
        gameState.objects.push({ type: objectType, x: clampedX, y: clampedY });
    }
}

function isValidTilePosition(x, y) {
    return (
        x >= 0 &&
        y >= 0 &&
        y < gameState.tileMap.length &&
        x < gameState.tileMap[0].length
    );
}

function getTileSize(canvas) {
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    return Math.min(canvas.width / mapWidth, canvas.height / mapHeight);
}

function updateCoordinatesDisplay(x, y) {
    const coordinatesElement = document.getElementById('coordinates');
    if (coordinatesElement) {
        coordinatesElement.innerText = `X: ${x}, Y: ${y}`;
    }
}

let lastTime = 0;

function gameLoop(device, context, format, timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    render(device, context, format);
    requestAnimationFrame((timestamp) => gameLoop(device, context, format, timestamp));
}

function update(deltaTime) {
    const { player, keysPressed } = gameState;
    if (keysPressed["ArrowUp"]) player.y -= player.speed * deltaTime;
    if (keysPressed["ArrowDown"]) player.y += player.speed * deltaTime;
    if (keysPressed["ArrowLeft"]) player.x -= player.speed * deltaTime;
    if (keysPressed["ArrowRight"]) player.x += player.speed * deltaTime;

    const canvas = document.getElementById("gameCanvas");
    const tileSize = getTileSize(canvas);
    player.x = Math.max(0, Math.min(canvas.width - tileSize, player.x));
    player.y = Math.max(0, Math.min(canvas.height - tileSize, player.y));
}

function render(device, context, format) {
    const encoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: CONSTANTS.COLORS.BACKGROUND,
            loadOp: 'clear',
            storeOp: 'store'
        }]
    };

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    const canvas = document.getElementById("gameCanvas");
    const tileSize = getTileSize(canvas);

    renderTiles(passEncoder, device, canvas.width, canvas.height, tileSize);
    renderObjects(passEncoder, device, canvas.width, canvas.height, tileSize);

    passEncoder.end();
    device.queue.submit([encoder.finish()]);
}

function renderTiles(passEncoder, device, canvasWidth, canvasHeight, tileSize) {
    gameState.tileMap.forEach((row, y) => {
        row.forEach((tile, x) => {
            let tileColor = tile === 1 ? CONSTANTS.COLORS.WALL_TILE : CONSTANTS.COLORS.DEFAULT_TILE;
            if (gameState.hoverTile && gameState.hoverTile.x === x && gameState.hoverTile.y === y) {
                tileColor = CONSTANTS.COLORS.HOVER_TILE;
            }
            const viewportX = x * tileSize;
            const viewportY = y * tileSize;
            if (viewportX >= 0 && viewportY >= 0 && viewportX + tileSize <= canvasWidth && viewportY + tileSize <= canvasHeight) {
                passEncoder.setPipeline(createTilePipeline(device, tileColor));
                passEncoder.setViewport(viewportX, viewportY, tileSize, tileSize, 0, 1);
                passEncoder.draw(6, 1, 0, 0);
            }
        });
    });
}

function renderObjects(passEncoder, device, canvasWidth, canvasHeight, tileSize) {
    gameState.objects.forEach(({ x, y }) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        const viewportX = x * tileSize;
        const viewportY = y * tileSize;
        if (viewportX >= 0 && viewportY >= 0 && viewportX + tileSize <= canvasWidth && viewportY + tileSize <= canvasHeight) {
            passEncoder.setPipeline(createTilePipeline(device, objColor));
            passEncoder.setViewport(viewportX, viewportY, tileSize, tileSize, 0, 1);
            passEncoder.draw(6, 1, 0, 0);
        }
    });
}

function setupInputHandling() {
    window.addEventListener("keydown", (e) => gameState.keysPressed[e.key] = true);
    window.addEventListener("keyup", (e) => delete gameState.keysPressed[e.key]);
}

function updateInspector(tileType, x, y) {
    const inspectorDetails = document.getElementById('inspectorDetails');
    if (inspectorDetails) {
        inspectorDetails.innerHTML = `
            <p><strong>Tile Properties:</strong></p>
            <p>Type: ${tileType === 1 ? 'Wall' : 'Floor'}</p>
            <p>Coordinates: (${x}, ${y})</p>
        `;
    }
}

const gameState = {
    player: { x: 2, y: 2, speed: 100 },
    keysPressed: {},
    tileMap: [],
    objects: [],
    hoverTile: null
};

function initializeTileMap(mapWidth, mapHeight, useDemoMap = true) {
    gameState.tileMap = useDemoMap ? [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
    ] : Array.from({ length: mapHeight }, () => (
        Array.from({ length: mapWidth }, () => (Math.random() > 0.8 ? 1 : 0))
    ));
}
