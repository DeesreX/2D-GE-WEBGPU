
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
        BACKGROUND: Object.freeze({ r: 0.1, g: 0.1, b: 0.1, a: 1.0 })
    },
    OBJECTS: ["Tree", "Rock", "House", "NPC"]
});

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    updateCanvasSize(canvas, CONSTANTS.CANVAS.WIDTH, CONSTANTS.CANVAS.HEIGHT);

    const { device, context, format } = await initializeWebGPU();
    if (device && context && format) {
        initializeTileMap(20, 15);
        setupInputHandling();
        requestAnimationFrame((t) => gameLoop(device, context, format, t));
    }

    createObjectContainer();
    setupCanvasDragEvents(canvas);
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

    const tileSize = Math.min(canvas.width / 20, canvas.height / 15);
    canvas.addEventListener('dragover', (event) => {
        event.preventDefault();
        const { clampedX, clampedY } = getTileIndices(event, canvas, tileSize);
        const rect = canvas.getBoundingClientRect();
        hoverIndicator.style.left = `${Math.round(rect.left + clampedX * tileSize)}px`;
        hoverIndicator.style.top = `${Math.round(rect.top + clampedY * tileSize)}px`;
        hoverIndicator.style.width = `${Math.round(tileSize)}px`;
        hoverIndicator.style.height = `${Math.round(tileSize)}px`;
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
        render(device, context, format, canvas);
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

let lastTime = 0;

async function gameLoop(device, context, format, timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    render(device, context, format, document.getElementById('gameCanvas'));
    requestAnimationFrame((t) => gameLoop(device, context, format, t));
}

function update(deltaTime) {
    const { player, keysPressed } = gameState;
    if (keysPressed["ArrowUp"]) player.y -= player.speed * deltaTime;
    if (keysPressed["ArrowDown"]) player.y += player.speed * deltaTime;
    if (keysPressed["ArrowLeft"]) player.x -= player.speed * deltaTime;
    if (keysPressed["ArrowRight"]) player.x += player.speed * deltaTime;

    const canvas = document.getElementById("gameCanvas");
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    const tileSize = Math.min(canvas.width / mapWidth, canvas.height / mapHeight);

    player.x = Math.max(0, Math.min(canvas.width - tileSize, player.x));
    player.y = Math.max(0, Math.min(canvas.height - tileSize, player.y));
}

function render(device, context, format, canvas) {
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
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    const tileSize = Math.min(canvas.width / mapWidth, canvas.height / mapHeight);

    renderTiles(passEncoder, device, tileSize);
    renderObjects(passEncoder, device, tileSize);
    passEncoder.end();
    device.queue.submit([encoder.finish()]);
}

function renderTiles(passEncoder, device, tileSize) {
    gameState.tileMap.forEach((row, y) => {
        row.forEach((tile, x) => {
            const tileColor = tile === 1 ? CONSTANTS.COLORS.WALL_TILE : CONSTANTS.COLORS.DEFAULT_TILE;
            passEncoder.setPipeline(createTilePipeline(device, tileColor));
            passEncoder.setViewport(Math.floor(x * tileSize), Math.floor(y * tileSize), Math.floor(tileSize), Math.floor(tileSize), 0, 1);
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