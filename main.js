
import { initializeWebGPU, createTilePipeline } from './webgpu/webgpu-setup.js';
import { initializeTileMap, setupInputHandling, gameState, updateCanvasSize } from './core/game.js';

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

    const { device, context, format } = await initializeWebGPU();
    if (device && context && format) {
        initializeTileMap(20, 15);
        alignCanvasToMap(canvas);
        setupInputHandling();
        requestAnimationFrame(gameLoop.bind(null, device, context, format));
    }

    createObjectContainer();
    setupCanvasDragEvents(canvas);
    setupMouseHoverEffect(canvas);
});

function createObjectContainer() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const objectContainer = document.createElement('div');
        objectContainer.className = 'object-container';
        sidebar.appendChild(objectContainer);
        CONSTANTS.OBJECTS.forEach(objName => {
            const objectItem = document.createElement('div');
            objectItem.className = 'object';
            objectItem.innerText = objName;
            objectItem.setAttribute('draggable', true);
            objectItem.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', objName);
            });
            objectContainer.appendChild(objectItem);
        });
    }
}

function setupCanvasDragEvents(canvas) {
    const hoverIndicator = document.createElement('div');
    hoverIndicator.id = 'hoverIndicator';
    document.body.appendChild(hoverIndicator);

    const tileSize = getTileSize(canvas);
    canvas.addEventListener('dragover', (event) => {
        event.preventDefault();
        const { clampedX, clampedY } = getTileIndices(event, canvas, tileSize);
        const rect = canvas.getBoundingClientRect();
        hoverIndicator.style.left = `${Math.floor(rect.left + clampedX * tileSize)}px`;
        hoverIndicator.style.top = `${Math.floor(rect.top + clampedY * tileSize)}px`;
        hoverIndicator.style.width = `${tileSize}px`;
        hoverIndicator.style.height = `${tileSize}px`;
        hoverIndicator.style.display = 'block';
    });

    canvas.addEventListener('dragleave', () => {
        hoverIndicator.style.display = 'none';
    });

    canvas.addEventListener('drop', (event) => {
        event.preventDefault();
        hoverIndicator.style.display = 'none';
        const objectType = event.dataTransfer.getData('text/plain');
        const { clampedX, clampedY } = getTileIndices(event, canvas, tileSize);
        gameState.objects.push({ type: objectType, x: clampedX, y: clampedY });
        render(navigator.gpu.device, navigator.gpu.getContext('webgpu'), navigator.gpu.getPreferredCanvasFormat());
    });
}

function getTileIndices(event, canvas, tileSize) {
    const rect = canvas.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const hoverY = event.clientY - rect.top;
    const tileX = Math.floor(hoverX / tileSize);
    const tileY = Math.floor(hoverY / tileSize);
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    return {
        clampedX: Math.max(0, Math.min(mapWidth - 1, tileX)),
        clampedY: Math.max(0, Math.min(mapHeight - 1, tileY))
    };
}

function alignCanvasToMap(canvas) {
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    const tileSize = getTileSize(canvas);
    canvas.width = tileSize * mapWidth;
    canvas.height = tileSize * mapHeight;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
}

function getTileSize(canvas) {
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    return Math.min(CONSTANTS.CANVAS.WIDTH / mapWidth, CONSTANTS.CANVAS.HEIGHT / mapHeight);
}

function setupMouseHoverEffect(canvas) {
    const tileSize = getTileSize(canvas);
    canvas.addEventListener('mousemove', (event) => {
        const coordinatesElement = document.getElementById('coordinates');
        const coordinatesText = coordinatesElement ? coordinatesElement.innerText : '';
        const match = coordinatesText.match(/X: (\d+), Y: (\d+)/);
        if (match) {
            const clampedX = parseInt(match[1], 10);
            const clampedY = parseInt(match[2], 10);
            gameState.hoverTile = { x: clampedX, y: clampedY };
        }
    });

    canvas.addEventListener('mouseleave', () => {
        gameState.hoverTile = null;
    });
}

let lastTime = 0;

function gameLoop(device, context, format, timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    renderCanvas(device, context, format);
    requestAnimationFrame(gameLoop.bind(null, device, context, format));
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

function renderCanvas(device, context, format) {
    const canvas = document.getElementById('gameCanvas');
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
    const tileSize = getTileSize(canvas);
    renderTiles(passEncoder, device, tileSize);
    renderObjects(passEncoder, device, tileSize);
    passEncoder.end();
    device.queue.submit([encoder.finish()]);
}

function renderTiles(passEncoder, device, tileSize) {
    gameState.tileMap.forEach((row, y) => {
        row.forEach((tile, x) => {
            let tileColor = tile === 1 ? CONSTANTS.COLORS.WALL_TILE : CONSTANTS.COLORS.DEFAULT_TILE;
            if (gameState.hoverTile && gameState.hoverTile.x === x && gameState.hoverTile.y === y) {
                tileColor = CONSTANTS.COLORS.HOVER_TILE;
            }
            passEncoder.setPipeline(createTilePipeline(device, tileColor));
            passEncoder.setViewport(x * tileSize, y * tileSize, tileSize, tileSize, 0, 1);
            passEncoder.draw(6, 1, 0, 0);
        });
    });
}

function renderObjects(passEncoder, device, tileSize) {
    gameState.objects.forEach(({ x, y }) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        passEncoder.setPipeline(createTilePipeline(device, objColor));
        passEncoder.setViewport(x * tileSize, y * tileSize, tileSize, tileSize, 0, 1);
        passEncoder.draw(6, 1, 0, 0);
    });
}