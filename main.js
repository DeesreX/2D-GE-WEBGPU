import { initializeWebGPU, createTilePipeline } from './webgpu/webgpu-setup.js';

const CONSTANTS = Object.freeze({
    CANVAS: {
        WIDTH: window.innerWidth,
        HEIGHT: window.innerHeight
    },
    COLORS: {
        DEFAULT_TILE: Object.freeze({ r: 0.7, g: 0.8, b: 0.7, a: 1.0 }),
        WALL_TILE: Object.freeze({ r: 0.2, g: 0.2, b: 0.2, a: 1.0 }),
        OBJECT: Object.freeze({ r: 0.4, g: 0.1, b: 0.5, a: 1.0 }),
        BACKGROUND: Object.freeze({ r: 0.1, g: 0.1, b: 0.1, a: 1.0 }),
        HOVER_TILE: Object.freeze({ r: 1.0, g: 0.5, b: 0.0, a: 1.0 })
    },
    OBJECTS: ["Tree", "Rock", "House", "NPC"]
});

const gameState = {
    player: { x: 2, y: 2, speed: 100 },
    keysPressed: {},
    tileMap: [],
    objects: [],
    hoverTile: null
};

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    updateCanvasSize(canvas);

    const { device, context, format } = await initializeWebGPU(canvas);
    if (!device || !context || !format) {
        console.error('WebGPU initialization failed');
        return;
    }

    createDimensionSelectionForm(device, context, format);
    setupCanvasHandlers(canvas, device, context, format);
    setupInputHandling();
    setupMenuHandlers(device, context, format);
});

function createDimensionSelectionForm(device, context, format) {
    const formContainer = document.createElement('div');
    formContainer.className = 'dimension-form';
    formContainer.innerHTML = `
        <label for="mapWidth">Map Width:</label>
        <input type="number" id="mapWidth" name="mapWidth" min="1" value="20">
        <label for="mapHeight">Map Height:</label>
        <input type="number" id="mapHeight" name="mapHeight" min="1" value="15">
        <button id="startGameButton">Start Game</button>
    `;
    document.body.appendChild(formContainer);

    document.getElementById('startGameButton').addEventListener('click', () => {
        const mapWidth = parseInt(document.getElementById('mapWidth').value, 10) || 20;
        const mapHeight = parseInt(document.getElementById('mapHeight').value, 10) || 15;
        initializeTileMap(mapWidth, mapHeight, false);
        formContainer.remove();
        startGameLoop(device, context, format);
    });
}

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

function setupCanvasHandlers(canvas, device, context, format) {
    const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize(canvas);
        render(device, context, format);
    });
    resizeObserver.observe(canvas.parentElement);

    canvas.addEventListener('mousemove', throttle((e) => handlePointerMove(e, canvas), 16));
    canvas.addEventListener('mouseleave', () => {
        gameState.hoverTile = null;
    });
    canvas.addEventListener('click', (e) => handlePointerClick(e, canvas));

    setupDragAndDrop(canvas);
}

function setupMenuHandlers(device, context, format) {
    document.getElementById('saveButton')?.addEventListener('click', saveProject);
    document.getElementById('loadButton')?.addEventListener('click', () => loadProject(device, context, format));
}

function saveProject() {
    const saveData = {
        player: gameState.player,
        tileMap: gameState.tileMap,
        objects: gameState.objects
    };
    const saveDataString = JSON.stringify(saveData);
    localStorage.setItem('gameSaveData', saveDataString);
    alert('Game saved successfully!');
}

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

function handlePointerMove(event, canvas) {
    const { x, y } = getTileCoordinates(event, canvas);
    if (isValidTilePosition(x, y) && (!gameState.hoverTile || gameState.hoverTile.x !== x || gameState.hoverTile.y !== y)) {
        const previousHoverTile = gameState.hoverTile;
        gameState.hoverTile = { x, y };
        updateCoordinatesDisplay(x, y);

        const context = canvas.getContext('2d');
        if (previousHoverTile) {
            renderSingleTile(context, previousHoverTile.x, previousHoverTile.y);
        }
        renderSingleTile(context, x, y);
    }
}

function renderSingleTile(context, x, y) {
    const canvas = document.getElementById('gameCanvas');
    const tileSize = getTileSize(canvas);
    const tile = gameState.tileMap[y][x];
    const color = (gameState.hoverTile && gameState.hoverTile.x === x && gameState.hoverTile.y === y)
        ? CONSTANTS.COLORS.HOVER_TILE
        : (tile === 1 ? CONSTANTS.COLORS.WALL_TILE : CONSTANTS.COLORS.DEFAULT_TILE);

    context.fillStyle = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
    context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

function handlePointerClick(event, canvas) {
    const { x, y } = getTileCoordinates(event, canvas);
    if (isValidTilePosition(x, y)) {
        const tileType = gameState.tileMap[y][x];
        updateInspector(tileType, x, y);
    }
}

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

function handleObjectDrop(event, canvas) {
    const objectType = event.dataTransfer.getData('text/plain');
    const { x, y } = getTileCoordinates(event, canvas);

    if (isValidTilePosition(x, y)) {
        gameState.objects.push({ type: objectType, x, y });
    }
}

function isValidTilePosition(x, y) {
    return (
        x >= 0 &&
        y >= 0 &&
        y < gameState.tileMap.length &&
        x < gameState.tileMap[0].length
    );
}

function getTileCoordinates(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const tileSize = getTileSize(canvas);
    return {
        x: Math.floor((event.clientX - rect.left) / tileSize),
        y: Math.floor((event.clientY - rect.top) / tileSize)
    };
}

function getTileSize(canvas) {
    const mapWidth = gameState.tileMap[0].length;
    const mapHeight = gameState.tileMap.length;
    return Math.min(canvas.width / mapWidth, canvas.height / mapHeight);
}

function startGameLoop(device, context, format) {
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        update(deltaTime);
        render(device, context, format);
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    const { player, keysPressed } = gameState;
    if (keysPressed["ArrowUp"]) player.y -= player.speed * deltaTime;
    if (keysPressed["ArrowDown"]) player.y += player.speed * deltaTime;
    if (keysPressed["ArrowLeft"]) player.x -= player.speed * deltaTime;
    if (keysPressed["ArrowRight"]) player.x += player.speed * deltaTime;

    const canvas = document.getElementById("gameCanvas");
    const tileSize = getTileSize(canvas);
    player.x = Math.max(0, Math.min(canvas.width - tileSize, player.x));
    player.y = Math.max(0, Math.min(canvas.height - tileSize, player.y));
}

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

    renderTiles(passEncoder, device, canvas.width, canvas.height, tileSize);
    renderObjects(passEncoder, device, canvas.width, canvas.height, tileSize);

    passEncoder.end();
    device.queue.submit([encoder.finish()]);
}

function renderTiles(passEncoder, device, canvasWidth, canvasHeight, tileSize) {
    gameState.tileMap.forEach((row, y) => {
        row.forEach((tile, x) => {
            let tileColor = tile === 1 ? CONSTANTS.COLORS.WALL_TILE : CONSTANTS.COLORS.DEFAULT_TILE;
            if (gameState.hoverTile && gameState.hoverTile.x === x && gameState.hoverTile.y === y) {
                tileColor = CONSTANTS.COLORS.HOVER_TILE;
            }
            renderTile(passEncoder, device, x, y, tileColor, canvasWidth, canvasHeight, tileSize);
        });
    });
}

function renderObjects(passEncoder, device, canvasWidth, canvasHeight, tileSize) {
    gameState.objects.forEach(({ x, y }) => {
        const objColor = CONSTANTS.COLORS.OBJECT;
        renderTile(passEncoder, device, x, y, objColor, canvasWidth, canvasHeight, tileSize);
    });
}

function renderTile(passEncoder, device, x, y, color, canvasWidth, canvasHeight, tileSize) {
    const viewportX = Math.max(0, Math.min(x * tileSize, canvasWidth - tileSize));
    const viewportY = Math.max(0, Math.min(y * tileSize, canvasHeight - tileSize));
    const clampedWidth = Math.min(tileSize, canvasWidth - viewportX);
    const clampedHeight = Math.min(tileSize, canvasHeight - viewportY);

    passEncoder.setPipeline(createTilePipeline(device, color));
    passEncoder.setViewport(viewportX, viewportY, clampedWidth, clampedHeight, 0, 1);
    passEncoder.draw(6, 1, 0, 0);
}

function setupInputHandling() {
    window.addEventListener("keydown", (e) => gameState.keysPressed[e.key] = true);
    window.addEventListener("keyup", (e) => delete gameState.keysPressed[e.key]);
}

function updateCoordinatesDisplay(x, y) {
    const coordinatesElement = document.getElementById('coordinates');
    if (coordinatesElement) {
        coordinatesElement.innerText = `X: ${x}, Y: ${y}`;
    }
}

function updateInspector(tileType, x, y) {
    const inspectorDetails = document.getElementById('inspectorDetails');
    if (inspectorDetails) {
        inspectorDetails.innerHTML = `
            <p><strong>Tile Properties:</strong></p>
            <p>Type: ${tileType === 1 ? 'Wall' : 'Floor'}</p>
            <p>Coordinates: (${x}, ${y})</p>
        `;
    }
}

function initializeTileMap(mapWidth, mapHeight, useDemoMap = true) {
    gameState.tileMap = useDemoMap ? [
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
    ] : Array.from({ length: mapHeight }, () => (
        Array.from({ length: mapWidth }, () => (Math.random() > 0.8 ? 1 : 0))
    ));
}

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
