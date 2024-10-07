
export const gameState = {
    player: { x: 50, y: 50, speed: 100 },
    keysPressed: {},
    tileMap: [],
    objects: []
};

export function initializeTileMap(mapWidth, mapHeight) {
    gameState.tileMap = Array.from({ length: mapHeight }, () => (
        Array.from({ length: mapWidth }, () => (Math.random() > 0.8 ? 1 : 0))
    ));
}

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
