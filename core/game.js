export const gameState = {
    player: { x: 50, y: 50, speed: 100 },
    keysPressed: {},
    tileMap: [],
    objects: []
};

export function initializeTileMap(mapWidth, mapHeight, useDemoMap = true) {
    if (useDemoMap) {
        gameState.tileMap = [
            [1, 0, 0, 1],
            [1, 0, 0, 1],
            [1, 0, 0, 1],
            [1, 0, 0, 1]
        ];
    } else {
        gameState.tileMap = Array.from({ length: mapHeight }, () => (
            Array.from({ length: mapWidth }, () => (Math.random() > 0.8 ? 1 : 0))
        ));
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    initializeTileMap(20, 15, true); // Initialize the tile map first
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    let tileSize = Math.min(window.innerWidth / mapWidth, window.innerHeight / mapHeight);

    // Set initial canvas dimensions
    canvas.width = tileSize * mapWidth;
    canvas.height = tileSize * mapHeight;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    canvas.style.display = 'block';

    // Add resize event listener to adjust canvas size dynamically
    window.addEventListener('resize', () => {
        tileSize = Math.min(window.innerWidth / mapWidth, window.innerHeight / mapHeight);
        canvas.width = tileSize * mapWidth;
        canvas.height = tileSize * mapHeight;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        render();
    });

    // Initialize WebGPU and other game elements here...
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
    // This would trigger a re-render after resizing, adjusting all elements accordingly
    console.log('Canvas resized and rendering updated');
    // Add rendering logic here...
}