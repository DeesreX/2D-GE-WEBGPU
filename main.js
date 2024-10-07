import { initializeWebGPU, createTilePipeline } from './webgpu-setup.js';
import { initializeTileMap, setupInputHandling, addObject, gameState } from './game.js';

let device, context, format;

document.addEventListener('DOMContentLoaded', () => {
    // Make each object draggable
    const objectItems = document.querySelectorAll('#objectPanel .object');
    objectItems.forEach(item => {
        item.setAttribute('draggable', true);
        item.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', item.innerText);
        });
    });

    // Set up dragover and drop events for the canvas
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('dragover', (event) => {
        event.preventDefault(); // Necessary to allow a drop
    });

    canvas.addEventListener('drop', (event) => {
        event.preventDefault();
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
        render(device, context, format);
    });
    
});

let lastTime = 0;
let tileSize;

async function gameLoop(device, context, format, timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    render(device, context, format);
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

function render(device, context, format) {
    const encoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store'
        }]
    };

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    const canvas = document.getElementById("gameCanvas");
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
            const tileColor = tile === 1 ? { r: 0.3, g: 0.3, b: 0.3, a: 1.0 } : { r: 0.8, g: 0.9, b: 0.8, a: 1.0 };
            passEncoder.setPipeline(createTilePipeline(device, tileColor));
            passEncoder.setViewport(Math.floor(x * tileSize), Math.floor(y * tileSize), Math.floor(tileSize), Math.floor(tileSize), 0, 1);
            passEncoder.draw(6, 1, 0, 0);
        });
    });
}

function renderObjects(passEncoder, device) {
    gameState.objects.forEach((obj) => {
        const objColor = { r: 0.5, g: 0.2, b: 0.7, a: 1.0 };
        passEncoder.setPipeline(createTilePipeline(device, objColor));
        passEncoder.setViewport(Math.floor(obj.x * tileSize), Math.floor(obj.y * tileSize), Math.floor(tileSize), Math.floor(tileSize), 0, 1);
        passEncoder.draw(6, 1, 0, 0);
    });
}

initializeWebGPU().then((gpuData) => {
    if (gpuData.device && gpuData.context && gpuData.format) {
        device = gpuData.device;
        context = gpuData.context;
        format = gpuData.format;

        initializeTileMap(20, 15);
        setupInputHandling();
        requestAnimationFrame((t) => gameLoop(device, context, format, t));
    }
});
