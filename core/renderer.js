import { CONSTANTS } from '../components/constants.js';
import { gameState } from './game.js';
import { createTilePipeline } from '../webgpu/webgpu-setup.js';

let tileSize;

export function render(device, context, format) {
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
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    
    // Calculate tile size with consideration for maintaining aspect ratio
    const aspectRatio = mapWidth / mapHeight;
    const availableWidth = canvas.clientWidth;
    const availableHeight = canvas.clientHeight;
    
    if (availableWidth / availableHeight > aspectRatio) {
        // Window is wider than the desired aspect ratio
        tileSize = Math.floor(availableHeight / mapHeight);
        canvas.width = tileSize * mapWidth;
        canvas.height = availableHeight;
    } else {
        // Window is taller than the desired aspect ratio
        tileSize = Math.floor(availableWidth / mapWidth);
        canvas.width = availableWidth;
        canvas.height = tileSize * mapHeight;
    }

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
            passEncoder.setViewport(x * tileSize, y * tileSize, tileSize, tileSize, 0, 1);
            passEncoder.draw(6, 1, 0, 0);
        });
    });
}

function renderObjects(passEncoder, device) {
    gameState.objects.forEach((obj) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        passEncoder.setPipeline(createTilePipeline(device, objColor));
        passEncoder.setViewport(obj.x * tileSize, obj.y * tileSize, tileSize, tileSize, 0, 1);
        passEncoder.draw(6, 1, 0, 0);
    });
}

// Disable zoom functionality with mouse scroll
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// Add resize event to adjust the canvas size dynamically
window.addEventListener('resize', () => {
    const canvas = document.getElementById("gameCanvas");
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    
    const aspectRatio = mapWidth / mapHeight;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    if (availableWidth / availableHeight > aspectRatio) {
        // Window is wider than the desired aspect ratio
        tileSize = Math.floor(availableHeight / mapHeight);
        canvas.width = tileSize * mapWidth;
        canvas.height = availableHeight;
    } else {
        // Window is taller than the desired aspect ratio
        tileSize = Math.floor(availableWidth / mapWidth);
        canvas.width = availableWidth;
        canvas.height = tileSize * mapHeight;
    }

    render(device, context, navigator.gpu.getPreferredCanvasFormat());
});

export { tileSize };