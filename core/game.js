
export const gameState = {
    player: { x: 2, y: 2, speed: 100 },
    keysPressed: {},
    tileMap: [],
    objects: []
};

export function initializeTileMap(mapWidth, mapHeight, useDemoMap = true) {
    gameState.tileMap = useDemoMap ? [
        [0, 0, 0, 0],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [0, 0, 0, 0]
    ] : Array.from({ length: mapHeight }, () => (
        Array.from({ length: mapWidth }, () => (Math.random() > 0.8 ? 1 : 0))
    ));
}

export function updateCanvasSize(canvas, mapWidth, mapHeight) {
    const tileSize = Math.min(
        (window.innerWidth - 250) / mapWidth, // Adjusted for sidebar width
        window.innerHeight / mapHeight
    );

    canvas.width = tileSize * mapWidth;
    canvas.height = tileSize * mapHeight;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    initializeTileMap(8, 8, true);
    updateCanvasSize(canvas, gameState.tileMap[0].length, gameState.tileMap.length);

    window.addEventListener('resize', () => {
        if (document.activeElement !== canvas) {
            updateCanvasSize(canvas, gameState.tileMap[0].length, gameState.tileMap.length);
            render();
        }
    });
});

export function setupInputHandling() {
    window.addEventListener("keydown", (e) => gameState.keysPressed[e.key] = true);
    window.addEventListener("keyup", (e) => delete gameState.keysPressed[e.key]);
}

export function addObject(type) {
    const x = Math.floor(Math.random() * 20);
    const y = Math.floor(Math.random() * 15);
    gameState.objects.push({ type, x, y });
    console.log(`Added ${type} at (${x}, ${y})`);
}

function render() {
    console.log('Canvas resized and rendering updated');
}
