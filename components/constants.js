export const CONSTANTS = Object.freeze({
    CANVAS: {
        WIDTH: window.innerWidth,
        HEIGHT: window.innerHeight
    },
    COLORS: {
        DEFAULT_TILE: Object.freeze({ r: 0.8, g: 0.9, b: 0.8, a: 1.0 }),
        WALL_TILE: Object.freeze({ r: 0.3, g: 0.3, b: 0.3, a: 1.0 }),
        OBJECT: Object.freeze({ r: 0.5, g: 0.2, b: 0.7, a: 1.0 }),
        BACKGROUND: Object.freeze({ r: 0.15, g: 0.15, b: 0.15, a: 1.0 })
    },
    OBJECTS: ["Tree", "Rock", "House", "NPC"]
});