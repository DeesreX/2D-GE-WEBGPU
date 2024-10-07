import { initializeWebGPU, createTilePipeline } from './webgpu/webgpu-setup.js';
import { initializeTileMap, setupInputHandling, gameState } from './core/game.js';
// Force zoom level to 90%

document.body.style.zoom = "90%";

// Constants using Object.freeze for immutability
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
    // Set consistent canvas size
    const canvas = document.getElementById('gameCanvas');
    canvas.width = CONSTANTS.CANVAS.WIDTH;
    canvas.height = CONSTANTS.CANVAS.HEIGHT;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Initialize WebGPU
    const { device, context, format } = await initializeWebGPU();
    if (device && context && format) {
        initializeTileMap(20, 15);
        setupInputHandling();
        requestAnimationFrame((t) => gameLoop(device, context, format, t));
    }

    // Create draggable objects dynamically from CONSTANTS.OBJECTS
    const sidebar = document.querySelector('.sidebar');
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

    // Set up dragover and drop events for the canvas
    const hoverIndicator = document.createElement('div');
    hoverIndicator.id = 'hoverIndicator';
    document.body.appendChild(hoverIndicator);

    canvas.addEventListener('dragover', (event) => {
        event.preventDefault(); // Necessary to allow a drop

        // Calculate the hover position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        let hoverX = event.clientX - rect.left;
        let hoverY = event.clientY - rect.top;

        // Calculate the tile indices (snapping to the nearest tile)
        const tileX = Math.floor(hoverX / tileSize);
        const tileY = Math.floor(hoverY / tileSize);

        // Clamp tile indices to ensure they are within the map bounds
        const mapWidth = gameState.tileMap[0].length;
        const mapHeight = gameState.tileMap.length;
        const clampedX = Math.max(0, Math.min(mapWidth - 1, tileX));
        const clampedY = Math.max(0, Math.min(mapHeight - 1, tileY));

        // Update hover indicator position and size
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
        
        // Calculate the drop position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        let dropX = event.clientX - rect.left;
        let dropY = event.clientY - rect.top;

        // Calculate the tile indices (snapping to the nearest tile)
        const tileX = Math.floor(dropX / tileSize);
        const tileY = Math.floor(dropY / tileSize);

        // Clamp tile indices to ensure they are within the map bounds
        const mapWidth = gameState.tileMap[0].length;
        const mapHeight = gameState.tileMap.length;
        const clampedX = Math.max(0, Math.min(mapWidth - 1, tileX));
        const clampedY = Math.max(0, Math.min(mapHeight - 1, tileY));

        // Add the new object to the gameState at the clamped tile position
        const newObject = {
            type: objectType,
            x: clampedX,
            y: clampedY
        };
        gameState.objects.push(newObject);
        
        // Trigger a render update
        render(device, context, format, canvas);
    });
});

let lastTime = 0;
let tileSize;

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
    tileSize = Math.min(canvas.width / mapWidth, canvas.height / mapHeight);

    renderTiles(passEncoder, device);
    renderObjects(passEncoder, device);
    passEncoder.end();
    device.queue.submit([encoder.finish()]);
}

function renderTiles(passEncoder, device) {
    gameState.tileMap.forEach((row, y) => {
        row.forEach((tile, x) => {
            const tileColor = tile === 1 ? CONSTANTS.COLORS.WALL_TILE : CONSTANTS.COLORS.DEFAULT_TILE;
            passEncoder.setPipeline(createTilePipeline(device, tileColor));
            passEncoder.setViewport(Math.floor(x * tileSize), Math.floor(y * tileSize), Math.floor(tileSize), Math.floor(tileSize), 0, 1);
            passEncoder.draw(6, 1, 0, 0);
        });
    });
}

function renderObjects(passEncoder, device) {
    gameState.objects.forEach((obj) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        passEncoder.setPipeline(createTilePipeline(device, objColor));
        passEncoder.setViewport(Math.floor(obj.x * tileSize), Math.floor(obj.y * tileSize), Math.floor(tileSize), Math.floor(tileSize), 0, 1);
        passEncoder.draw(6, 1, 0, 0);
    });
}