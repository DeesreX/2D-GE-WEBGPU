import { initializeWebGPU, createTilePipeline } from './webgpu/webgpu-setup.js';
import MapManager from './MapManager.js';
import { gameState } from './States/gameState.js';
import { CONSTANTS, TILE_TYPES } from './components/constants.js';
import { createDimensionSelectionForm, createMapManagerSidebar, createInspectorSidebar } from './ui.js';

const mapManager = new MapManager(gameState);

document.addEventListener('DOMContentLoaded', async () => {

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {  
        console.error('Canvas element not found');
        return;
    }

    updateCanvasSize(canvas); // Update canvas size to fit the screen.

    const { device, context, format } = await initializeWebGPU(canvas); 
    if (!device || !context || !format) {
        console.error('WebGPU initialization failed');
        return;
    }

    createDimensionSelectionForm(); // Create UI for selecting map dimensions.
    setupCanvasHandlers(canvas, device, context, format); // Set up event handlers for the canvas.
    setupInputHandling(); // Set up keyboard input handling.
    setupMenuHandlers(device, context, format); // Set up handlers for the menu.
    createMapManagerSidebar(mapManager); // Create the sidebar for managing maps.
    createInspectorSidebar();
    mapManager.Init();
    startGameLoop(device, context, format); 
});

// Updates the size of the canvas element based on the container's dimensions.
function updateCanvasSize(canvas) {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const mapWidth = gameState.tileMap?.[0]?.length || 20;
    const mapHeight = gameState.tileMap?.length || 15;
    const tileSize = Math.min(
        containerWidth / mapWidth,
        containerHeight / mapHeight
    );

    canvas.width = Math.floor(tileSize * mapWidth);
    canvas.height = Math.floor(tileSize * mapHeight);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
}

// Sets up event handlers for the canvas.
function setupCanvasHandlers(canvas, device, context, format) {
    const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize(canvas);
        render(device, context, format);
    });
    resizeObserver.observe(canvas.parentElement);

    // Handle mouse movement, leaving the canvas, and clicking.
    canvas.addEventListener('mousemove', throttle((e) => handlePointerMove(e, canvas), 16));
    canvas.addEventListener('mouseleave', () => {
        gameState.hoverTile = null;
    });
    canvas.addEventListener('click', (e) => handlePointerClick(e, canvas));

    setupDragAndDrop(canvas); // Set up drag-and-drop functionality.
}

// Sets up handlers for the menu buttons.
function setupMenuHandlers(device, context, format) {
    document.getElementById('saveButton')?.addEventListener('click', () => mapManager.saveCurrentMap());
    document.getElementById('loadButton')?.addEventListener('click', () => loadProject(device, context, format));
}

// Loads a saved project from local storage.
function loadProject(device, context, format) {
    const saveDataString = localStorage.getItem('gameSaveData');
    if (!saveDataString) {
        alert('No saved game data found.');
        return;
    }
    const saveData = JSON.parse(saveDataString);
    gameState.player = saveData.player;
    gameState.tileMap = saveData.tileMap;
    gameState.objects = saveData.objects;
    alert('Game loaded successfully!');
    updateCanvasSize(document.getElementById('gameCanvas'));
    startGameLoop(device, context, format);
}

// Handles pointer movement over the canvas.
function handlePointerMove(event, canvas) {
    const { x, y } = getTileCoordinates(event, canvas);
    if (isValidTilePosition(x, y) && (!gameState.hoverTile || gameState.hoverTile.x !== x || gameState.hoverTile.y !== y)) {
        const previousHoverTile = gameState.hoverTile;
        gameState.hoverTile = { x, y };
        updateCoordinatesDisplay(x, y);

        const context = canvas.getContext('2d');
        if (context) {
            if (previousHoverTile) {
                renderSingleTile(context, previousHoverTile.x, previousHoverTile.y);
            }
            renderSingleTile(context, x, y);
        } else {
            console.error('Failed to get 2D context from canvas');
        }
    }
}

// Renders a single tile on the canvas.
function renderSingleTile(context, x, y) {
    const canvas = document.getElementById('gameCanvas');
    const tileSize = getTileSize(canvas);
    const tile = gameState.tileMap[y][x];
    const color = (gameState.hoverTile && gameState.hoverTile.x === x && gameState.hoverTile.y === y)
        ? CONSTANTS.COLORS.HOVER_TILE
        : (tile === 1 ? CONSTANTS.COLORS.WALL_TILE : (tile === 2 ? { r: 0.0, g: 0.0, b: 1.0, a: 1.0 } : CONSTANTS.COLORS.DEFAULT_TILE));

    if (context) {
        context.fillStyle = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
        context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    } else {
        console.error('Failed to get 2D context from canvas during rendering');
    }
}

// Handles pointer click events on the canvas.
function handlePointerClick(event, canvas) {
    const { x, y } = getTileCoordinates(event, canvas);
    if (isValidTilePosition(x, y)) {
        const tileType = gameState.tileMap[y][x];
        const sidebar = document.querySelector('.inspectorDetails');
        if (sidebar.style.display === 'none') {
            sidebar.style.display = "block";
            sidebar.style.left = '0';
        }
        updateInspector(tileType, x, y);
    }
}  

// Sets up drag-and-drop functionality for the canvas.
function setupDragAndDrop(canvas) {
    const hoverIndicator = document.createElement('div');
    hoverIndicator.id = 'hoverIndicator';
    document.body.appendChild(hoverIndicator);

    canvas.addEventListener('dragover', throttle((e) => {
        e.preventDefault();
        updateHoverIndicator(e, canvas, hoverIndicator);
    }, 16));
    canvas.addEventListener('dragleave', () => {
        hoverIndicator.style.display = 'none';
    });
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        hoverIndicator.style.display = 'none';
        handleObjectDrop(e, canvas);
    });
}

// Updates the hover indicator's position.
function updateHoverIndicator(event, canvas, indicator) {
    const tileSize = getTileSize(canvas);
    const { x, y } = getTileCoordinates(event, canvas);
    const rect = canvas.getBoundingClientRect();

    Object.assign(indicator.style, {
        left: `${Math.floor(rect.left + x * tileSize)}px`,
        top: `${Math.floor(rect.top + y * tileSize)}px`,
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        display: 'block'
    });
}

// Handles the drop of an object onto the canvas.
function handleObjectDrop(event, canvas) {
    const objectType = event.dataTransfer.getData('text/plain');
    const { x, y } = getTileCoordinates(event, canvas);

    if (isValidTilePosition(x, y)) {
        gameState.objects.push({ type: objectType, x, y });
    }
}

// Validates if a tile position is within the tile map boundaries.
function isValidTilePosition(x, y) {
    return (
        x >= 0 &&
        y >= 0 &&
        y < gameState.tileMap.length &&
        x < gameState.tileMap[0].length
    );
}

// Checks if a tile is collidable (e.g., a wall).
function isCollidableTile(x, y) {
    return gameState.tileMap[y][x] === 1; // Wall tiles are collidable.
}

// Gets the coordinates of a tile based on the mouse event.
function getTileCoordinates(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const tileSize = getTileSize(canvas);
    return {
        x: Math.floor((event.clientX - rect.left) / tileSize),
        y: Math.floor((event.clientY - rect.top) / tileSize)
    };
}

// Gets the size of a tile in pixels.
function getTileSize(canvas) {
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    return Math.min(canvas.width / mapWidth, canvas.height / mapHeight);
}

// Starts the game loop that updates and renders the game.
function startGameLoop(device, context, format) {
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        update(deltaTime); // Update the game state.
        render(device, context, format); // Render the game.
        requestAnimationFrame(gameLoop); // Request the next animation frame.
    }
    requestAnimationFrame(gameLoop);
}

// Updates the game state based on input and time passed.
function update(deltaTime) {
    const { player, keysPressed } = gameState;
    let moved = false;

    // Move the player based on keys pressed.
    if (keysPressed["w"] && isValidTilePosition(player.x, player.y - 1) && !isCollidableTile(player.x, player.y - 1)) {
        player.y -= 1;
        delete keysPressed["w"];
        moved = true;
    }
    if (keysPressed["s"] && isValidTilePosition(player.x, player.y + 1) && !isCollidableTile(player.x, player.y + 1)) {
        player.y += 1;
        delete keysPressed["s"];
        moved = true;
    }
    if (keysPressed["a"] && isValidTilePosition(player.x - 1, player.y) && !isCollidableTile(player.x - 1, player.y)) {
        player.x -= 1;
        delete keysPressed["a"];
        moved = true;
    }
    if (keysPressed["d"] && isValidTilePosition(player.x + 1, player.y) && !isCollidableTile(player.x + 1, player.y)) {
        player.x += 1;
        delete keysPressed["d"];
        moved = true;
    }

    // Handle map transition if the player moves to a transition tile.
    if (moved) {
        handleMapTransition();
    }
}

// Handles the transition between maps.
function handleMapTransition() {
    const { x, y } = gameState.player;
    const tileType = gameState.tileMap[y][x];

    // Assuming tileType 2 is a transition tile.
    if (tileType === 2) {
        if (mapManager.currentMap === 'startMap') {
            mapManager.saveCurrentMap();
            mapManager.loadMap('secondMap');
        } else if (mapManager.currentMap === 'secondMap') {
            mapManager.saveCurrentMap();
            mapManager.loadMap('startMap');
        }
    }
}

// Renders the game on the canvas using WebGPU.
function render(device, context, format) {
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
    const tileSize = getTileSize(canvas);

    renderTiles(passEncoder, device, canvas.width, canvas.height, tileSize); // Render all tiles.
    renderObjects(passEncoder, device, canvas.width, canvas.height, tileSize); // Render all objects.
    renderPlayer(passEncoder, device, tileSize); // Render the player.

    passEncoder.end();
    device.queue.submit([encoder.finish()]); // Submit rendering commands to the GPU.
}

// Renders all tiles on the canvas.
function renderTiles(passEncoder, device, canvasWidth, canvasHeight, tileSize) {
    gameState.tileMap.forEach((row, y) => {
        row.forEach((tile, x) => {
            let tileColor = tile === 1 ? CONSTANTS.COLORS.WALL_TILE : (tile === 2 ? { r: 0.0, g: 0.0, b: 1.0, a: 1.0 } : CONSTANTS.COLORS.DEFAULT_TILE);
            if (gameState.hoverTile && gameState.hoverTile.x === x && gameState.hoverTile.y === y) {
                tileColor = CONSTANTS.COLORS.HOVER_TILE;
            }
            renderTile(passEncoder, device, x, y, tileColor, canvasWidth, canvasHeight, tileSize); // Render individual tile.
        });
    });
}

// Renders all objects in the game state.
function renderObjects(passEncoder, device, canvasWidth, canvasHeight, tileSize) {
    gameState.objects.forEach(({ x, y }) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        renderTile(passEncoder, device, x, y, objColor, canvasWidth, canvasHeight, tileSize); // Render individual object.
    });
}

// Renders the player on the canvas.
function renderPlayer(passEncoder, device, tileSize) {
    const { x, y } = gameState.player;
    const playerColor = CONSTANTS.COLORS.PLAYER;
    renderTile(passEncoder, device, x, y, playerColor, tileSize * gameState.tileMap[0].length, tileSize * gameState.tileMap.length, tileSize); // Render player.
}

// Renders a single tile with given color and position.
function renderTile(passEncoder, device, x, y, color, canvasWidth, canvasHeight, tileSize) {
    const viewportX = Math.max(0, Math.min(x * tileSize, canvasWidth - tileSize));
    const viewportY = Math.max(0, Math.min(y * tileSize, canvasHeight - tileSize));
    const clampedWidth = Math.min(tileSize, canvasWidth - viewportX);
    const clampedHeight = Math.min(tileSize, canvasHeight - viewportY);

    passEncoder.setPipeline(createTilePipeline(device, color)); // Set rendering pipeline.
    passEncoder.setViewport(viewportX, viewportY, clampedWidth, clampedHeight, 0, 1); // Set the viewport for rendering.
    passEncoder.draw(6, 1, 0, 0); // Draw the tile.
}

// Sets up keyboard input handling for the game.
function setupInputHandling() {
    window.addEventListener("keydown", (e) => gameState.keysPressed[e.key] = true); // Track keys pressed.
    window.addEventListener("keyup", (e) => delete gameState.keysPressed[e.key]); // Track keys released.
}

// Updates the display with the current tile coordinates.
function updateCoordinatesDisplay(x, y) {
    const coordinatesElement = document.getElementById('coordinates');
    if (coordinatesElement) {
        coordinatesElement.innerText = `X: ${x}, Y: ${y}`;
    }
}

// Updates the inspector details for the selected tile.
function updateInspector(tileType, x, y) {
    const inspectorDetails = document.getElementById('inspectorDetails');
    if (inspectorDetails) {
        inspectorDetails.innerHTML = `
            <p><strong>Tile Properties:</strong></p>
            <ul>
                <li><label>Type: 
                    <select id="tileTypeSelect">
                        <option value="floor" ${tileType === 0 ? 'selected' : ''}>Floor</option>
                        <option value="wall" ${tileType === 1 ? 'selected' : ''}>Wall</option>
                        <option value="water" ${tileType === 2 ? 'selected' : ''}>Water</option>
                        <option value="lava" ${tileType === 3 ? 'selected' : ''}>Lava</option>
                    </select>
                </label></li>
                <li>Coordinates: (${x}, ${y})</li>
                <li><label>Move to Map: 
                    <select id="moveToMapSelect">
                        ${Object.keys(mapManager.maps).map(mapName => `<option value="${mapName}">${mapName}</option>`).join('')}
                    </select>
                </label></li>
                <button id="moveToMapButton">Move Player to Selected Map</button>
            </ul>
        `;
        document.getElementById('tileTypeSelect').addEventListener('change', (e) => {
            const newType = e.target.value;
            if (newType === 'wall') {
                gameState.tileMap[y][x] = 1;
            } else if (newType === 'floor') {
                gameState.tileMap[y][x] = 0;
            } else if (newType === 'water') {
                gameState.tileMap[y][x] = 2;
            }  else if (newType === 'lava') {
                gameState.tileMap[y][x] = 3;
            }
        });
        document.getElementById('moveToMapButton').addEventListener('click', () => {
            const selectedMap = document.getElementById('moveToMapSelect').value;
            if (selectedMap) {
                mapManager.saveCurrentMap();
                mapManager.loadMap(selectedMap);
            }
        });
    }
}

// Utility function to throttle the execution of a function.
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}