// Updates the size of the canvas element based on the container's dimensions.
export function updateCanvasSize(canvas, gameState) {
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
export function setupCanvasHandlers(canvas, device, context, format) {
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