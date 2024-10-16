export const CONSTANTS = Object.freeze({
    TILE_SIZE: 64, // This is the default immutable tile size
    CANVAS: Object.freeze({
        WIDTH: window.innerWidth,
        HEIGHT: window.innerHeight
    }),
    COLORS: Object.freeze({
        DEFAULT_TILE: Object.freeze({ r: 0.7, g: 0.8, b: 0.7, a: 1.0 }),
        WALL_TILE: Object.freeze({ r: 0.2, g: 0.2, b: 0.2, a: 1.0 }),
        OBJECT: Object.freeze({ r: 0.4, g: 0.1, b: 0.5, a: 1.0 }),
        PLAYER: Object.freeze({ r: 1.0, g: 0.0, b: 0.0, a: 1.0 }),
        BACKGROUND: Object.freeze({ r: 0.1, g: 0.1, b: 0.1, a: 1.0 }),
        // HOVER_TILE: Object.freeze({ r: 1.0, g: 0.5, b: 0.0, a: 1.0 })
    }),
    OBJECTS: Object.freeze(["Tree", "Rock", "House", "NPC"])
});

export const TILE_TYPES = [
    { name: 'floor', textureUrl: './textures/floor.png', collidable: false },
    { name: 'wall', textureUrl: './textures/wall.png', collidable: true },
    { name: 'water', textureUrl: './textures/water.png', collidable: false },
    { name: 'lava', textureUrl: './textures/lava.png', collidable: false },
    { name: 'player', textureUrl: './textures/player.png', collidable: false },
    { name: 'object', textureUrl: './textures/object.png', collidable: false },
    { name: 'grass', textureUrl: './textures/grass.png', collidable: false },
    { name: 'tree', textureUrl: './textures/tree.png', collidable: true },
  ];
  