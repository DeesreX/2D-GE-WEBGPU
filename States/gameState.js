// The current state of the game, including player position, key states, and map data.
export const gameState = {
    player: { x: 2, y: 2, speed: 1 },
    keysPressed: {},
    tileMap: Array.from({ length: 15 }, () => Array(20).fill(0)), // 15 rows, 20 columns filled with 0
    objects: [],
    hoverTile: null
};