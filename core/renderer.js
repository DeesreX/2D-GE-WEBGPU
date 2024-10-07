
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
    
    const aspectRatio = mapWidth / mapHeight;
    const availableWidth = canvas.clientWidth;
    const availableHeight = canvas.clientHeight;
    
    tileSize = availableWidth / availableHeight > aspectRatio
        ? Math.floor(availableHeight / mapHeight)
        : Math.floor(availableWidth / mapWidth);

    canvas.width = tileSize * mapWidth;
    canvas.height = tileSize * mapHeight;

    renderTiles(passEncoder, device);
    renderObjects(passEncoder, device);

    passEncoder.end();
    device.queue.submit([encoder.finish()]);
}

function renderTiles(passEncoder, device) {
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

function renderObjects(passEncoder, device) {
    gameState.objects.forEach(({ x, y }) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        passEncoder.setPipeline(createTilePipeline(device, objColor));
        passEncoder.setViewport(x * tileSize, y * tileSize, tileSize, tileSize, 0, 1);
        passEncoder.draw(6, 1, 0, 0);
    });
}

window.addEventListener('resize', () => {
    const canvas = document.getElementById("gameCanvas");
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    
    const aspectRatio = mapWidth / mapHeight;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    tileSize = availableWidth / availableHeight > aspectRatio
        ? Math.floor(availableHeight / mapHeight)
        : Math.floor(availableWidth / mapWidth);

    canvas.width = tileSize * mapWidth;
    canvas.height = tileSize * mapHeight;

    render(navigator.gpu.device, navigator.gpu.getContext('webgpu'), navigator.gpu.getPreferredCanvasFormat());
});

export { tileSize };
