// canvasHandlers.js
import { gameState } from '../gameState.js';
import { renderSingleTile } from '../renderer.js';

export function setupCanvasHandlers(canvas) {
    canvas.addEventListener('mousemove', (e) => handlePointerMove(e, canvas));
    canvas.addEventListener('click', (e) => handlePointerClick(e, canvas));
}

export function handlePointerMove(event, canvas) {
    const { x, y } = getTileCoordinates(event, canvas);
    if (isValidTilePosition(x, y)) {
        updateCoordinatesDisplay(x, y);
        if (gameState.hoverTile?.x !== x || gameState.hoverTile?.y !== y) {
            gameState.hoverTile = { x, y };
            renderSingleTile(canvas, x, y, gameState.hoverTile);
        }
    }
}

export function handlePointerClick(event, canvas) {
    const { x, y } = getTileCoordinates(event, canvas);
    if (isValidTilePosition(x, y)) {
        const tileType = gameState.tileMap[y][x];
        updateInspector(tileType, x, y);
    }
}

function getTileCoordinates(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const tileSize = Math.min(canvas.width / gameState.tileMap[0].length, canvas.height / gameState.tileMap.length);
    return {
        x: Math.floor((event.clientX - rect.left) / tileSize),
        y: Math.floor((event.clientY - rect.top) / tileSize)
    };
}

function isValidTilePosition(x, y) {
    return (
        x >= 0 &&
        y >= 0 &&
        y < gameState.tileMap.length &&
        x < gameState.tileMap[0].length
    );
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
            </ul>
        `;
    }
}