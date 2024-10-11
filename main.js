import {
  initializeWebGPU,
  createTilePipeline,
  loadTextures,
} from "./webgpu/webgpu-setup.js";
import MapManager from "./MapManager.js";
import { gameState } from "./States/gameState.js";
import { CONSTANTS } from "./components/constants.js";
import {
  createDimensionSelectionForm,
  createMapManagerSidebar,
  createInspectorSidebar,
} from "./ui.js";

class Game {
  constructor() {
    this.tileTexture = null;
    this.sampler = null;
    this.mapManager = new MapManager(gameState);
    this.canvas = null;
    this.device = null;
    this.context = null;
    this.format = null;
    this.pipelineInfo = null;
    this.lastTime = 0;
  }

  async init() {
    this.canvas = document.getElementById("gameCanvas");
    const { device, context, format } = await initializeWebGPU(this.canvas);
    this.device = device;
    this.context = context;
    this.format = format;
    this.textures = await loadTextures(this.device);
    // Create a sampler
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'nearest',
    });
    this.pipelineInfo = createTilePipeline(
        this.device,
        this.textures,
        this.sampler
      );

    // Initialize other game systems and start the render loop.
    createDimensionSelectionForm();
    this.setupCanvasHandlers();
    setupInputHandling();
    this.setupMenuHandlers();
    createMapManagerSidebar(this.mapManager);
    createInspectorSidebar();
    this.mapManager.Init();
    this.startGameLoop();
  }

  updateCanvasSize() {
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const mapWidth = gameState.tileMap?.[0]?.length || 20;
    const mapHeight = gameState.tileMap?.length || 15;
    const tileSize = Math.min(
      containerWidth / mapWidth,
      containerHeight / mapHeight
    );

    this.canvas.width = Math.floor(tileSize * mapWidth);
    this.canvas.height = Math.floor(tileSize * mapHeight);
    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;
  }

  setupCanvasHandlers() {
    const resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
      this.render();
    });
    resizeObserver.observe(this.canvas.parentElement);

    // Handle mouse movement, leaving the canvas, and clicking.
    this.canvas.addEventListener(
      "mousemove",
      throttle((e) => this.handlePointerMove(e), 16)
    );
    this.canvas.addEventListener("mouseleave", () => {
      gameState.hoverTile = null;
    });
    this.canvas.addEventListener("click", (e) => this.handlePointerClick(e));

    this.setupDragAndDrop();
  }

  setupMenuHandlers() {
    document
      .getElementById("saveButton")
      ?.addEventListener("click", () =>
        this.mapManager.saveCurrentMap()
      );
    document
      .getElementById("loadButton")
      ?.addEventListener("click", () => this.loadProject());
  }

  loadProject() {
    const saveDataString = localStorage.getItem("gameSaveData");
    if (!saveDataString) {
      alert("No saved game data found.");
      return;
    }
    const saveData = JSON.parse(saveDataString);
    gameState.player = saveData.player;
    gameState.tileMap = saveData.tileMap;
    gameState.objects = saveData.objects;
    alert("Game loaded successfully!");
    this.updateCanvasSize();
    this.startGameLoop();
  }

  handlePointerMove(event) {
    const { x, y } = getTileCoordinates(event, this.canvas);
    if (
      isValidTilePosition(x, y) &&
      (!gameState.hoverTile ||
        gameState.hoverTile.x !== x ||
        gameState.hoverTile.y !== y)
    ) {
      gameState.hoverTile = { x, y };
      updateCoordinatesDisplay(x, y);
    }
  }

  handlePointerClick(event) {
    const { x, y } = getTileCoordinates(event, this.canvas);
    if (isValidTilePosition(x, y)) {
      const tileType = gameState.tileMap[y][x];
      const sidebar = document.querySelector(".inspector-details");
      if (sidebar.style.display === "none") {
        sidebar.style.display = "block";
        sidebar.style.left = "0";
      }
      updateInspector(tileType, x, y, this.mapManager);
    }
  }

  setupDragAndDrop() {
    const hoverIndicator = document.createElement("div");
    hoverIndicator.id = "hoverIndicator";
    document.body.appendChild(hoverIndicator);

    this.canvas.addEventListener(
      "dragover",
      throttle((e) => {
        e.preventDefault();
        this.updateHoverIndicator(e, hoverIndicator);
      }, 16)
    );
    this.canvas.addEventListener("dragleave", () => {
      hoverIndicator.style.display = "none";
    });
    this.canvas.addEventListener("drop", (e) => {
      e.preventDefault();
      hoverIndicator.style.display = "none";
      this.handleObjectDrop(e);
    });
  }

  updateHoverIndicator(event, indicator) {
    const tileSize = getTileSize(this.canvas);
    const { x, y } = getTileCoordinates(event, this.canvas);
    const rect = this.canvas.getBoundingClientRect();

    Object.assign(indicator.style, {
      left: `${Math.floor(rect.left + x * tileSize)}px`,
      top: `${Math.floor(rect.top + y * tileSize)}px`,
      width: `${tileSize}px`,
      height: `${tileSize}px`,
      display: "block",
    });
  }

  handleObjectDrop(event) {
    const objectType = event.dataTransfer.getData("text/plain");
    const { x, y } = getTileCoordinates(event, this.canvas);

    if (isValidTilePosition(x, y)) {
      gameState.objects.push({ type: objectType, x, y });
    }
  }

  startGameLoop() {
    const gameLoop = (timestamp) => {
      const deltaTime = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      this.update(deltaTime);
      this.render();
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }

  update(deltaTime) {
    const { player, keysPressed } = gameState;
    let moved = false;

    // Move the player based on keys pressed.
    if (
      keysPressed["w"] &&
      isValidTilePosition(player.x, player.y - 1) &&
      !isCollidableTile(player.x, player.y - 1)
    ) {
      player.y -= 1;
      delete keysPressed["w"];
      moved = true;
    }
    if (
      keysPressed["s"] &&
      isValidTilePosition(player.x, player.y + 1) &&
      !isCollidableTile(player.x, player.y + 1)
    ) {
      player.y += 1;
      delete keysPressed["s"];
      moved = true;
    }
    if (
      keysPressed["a"] &&
      isValidTilePosition(player.x - 1, player.y) &&
      !isCollidableTile(player.x - 1, player.y)
    ) {
      player.x -= 1;
      delete keysPressed["a"];
      moved = true;
    }
    if (
      keysPressed["d"] &&
      isValidTilePosition(player.x + 1, player.y) &&
      !isCollidableTile(player.x + 1, player.y)
    ) {
      player.x += 1;
      delete keysPressed["d"];
      moved = true;
    }

    // Handle map transition if the player moves to a transition tile.
    if (moved) {
      this.handleMapTransition();
    }
  }

  handleMapTransition() {
    const { x, y } = gameState.player;
    const tileType = gameState.tileMap[y][x];

    // Assuming tileType 2 is a transition tile.
    if (tileType === 2) {
      if (this.mapManager.currentMap === "startMap") {
        this.mapManager.saveCurrentMap();
        this.mapManager.loadMap("secondMap");
      } else if (this.mapManager.currentMap === "secondMap") {
        this.mapManager.saveCurrentMap();
        this.mapManager.loadMap("startMap");
      }
    }
  }
  render() {
    const device = this.device;
    const context = this.context;
    const pipelineInfo = this.pipelineInfo;
  
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: CONSTANTS.COLORS.BACKGROUND,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };
  
    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
  
    const canvas = this.canvas;
    const tileSize = getTileSize(canvas);
  
    // Update uniform buffers
    device.queue.writeBuffer(
      pipelineInfo.canvasSizeUniformBuffer,
      0,
      new Float32Array([canvas.width, canvas.height])
    );
    device.queue.writeBuffer(
      pipelineInfo.tileSizeUniformBuffer,
      0,
      new Float32Array([tileSize])
    );
  
    // Prepare data for instanced rendering
    const tileInstances = [];
  
    gameState.tileMap.forEach((row, y) => {
      row.forEach((tile, x) => {
        let textureIndex = 0; // Default to floor texture
  
        // Map tile types to texture indices
        switch (tile) {
          case 0: // Floor
            textureIndex = 0;
            break;
          case 1: // Wall
            textureIndex = 1;
            break;
          case 2: // Water
            textureIndex = 2;
            break;
          case 3: // Lava
            textureIndex = 3;
            break;
          default:
            textureIndex = 0;
        }
  
        if (
          gameState.hoverTile &&
          gameState.hoverTile.x === x &&
          gameState.hoverTile.y === y
        ) {
          textureIndex = 6; // Hover texture
        }
  
        tileInstances.push({
          offset: [x * tileSize, y * tileSize],
          textureIndex: textureIndex,
        });
      });
    });
  
    // Include objects
    gameState.objects.forEach(({ x, y }) => {
      tileInstances.push({
        offset: [x * tileSize, y * tileSize],
        textureIndex: 5, // Object texture
      });
    });
  
    // Include player
    const { x: playerX, y: playerY } = gameState.player;
    tileInstances.push({
      offset: [playerX * tileSize, playerY * tileSize],
      textureIndex: 4, // Player texture
    });
  
    // Convert tileInstances to a Float32Array
    const instanceData = new Float32Array(tileInstances.length * 3);
    tileInstances.forEach((instance, index) => {
      instanceData[index * 3 + 0] = instance.offset[0];       // offset.x
      instanceData[index * 3 + 1] = instance.offset[1];       // offset.y
      instanceData[index * 3 + 2] = instance.textureIndex;    // textureIndex
    });
  
    // Create or update the instance buffer
    if (!this.instanceBuffer || this.instanceBuffer.size < instanceData.byteLength) {
      // Create a new buffer if it doesn't exist or is too small
      this.instanceBuffer = device.createBuffer({
        size: instanceData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
    }
    device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
  
    // Set pipeline and draw
    renderPass.setPipeline(pipelineInfo.pipeline);
    renderPass.setBindGroup(0, pipelineInfo.bindGroup);
    renderPass.setVertexBuffer(0, pipelineInfo.vertexBuffer);
    renderPass.setVertexBuffer(1, this.instanceBuffer);
  
    const vertexCount = 4; // Number of vertices in the quad
    const instanceCount = tileInstances.length; // Number of instances
  
    renderPass.draw(vertexCount, instanceCount, 0, 0);
  
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}

// Utility Functions
function setupInputHandling() {
  window.addEventListener("keydown", (e) => (gameState.keysPressed[e.key] = true)); // Track keys pressed.
  window.addEventListener("keyup", (e) => delete gameState.keysPressed[e.key]); // Track keys released.
}

function updateCoordinatesDisplay(x, y) {
  const coordinatesElement = document.getElementById("coordinates");
  if (coordinatesElement) {
    coordinatesElement.innerText = `X: ${x}, Y: ${y}`;
  }
}

function updateInspector(tileType, x, y, mapManager) {
  const inspectorDetails = document.getElementById("inspectorDetails");
  if (inspectorDetails) {
    inspectorDetails.innerHTML = `
            <p><strong>Tile Properties:</strong></p>
            <ul>
                <li><label>Type: 
                    <select id="tileTypeSelect">
                        <option value="floor" ${
                          tileType === 0 ? "selected" : ""
                        }>Floor</option>
                        <option value="wall" ${
                          tileType === 1 ? "selected" : ""
                        }>Wall</option>
                        <option value="water" ${
                          tileType === 2 ? "selected" : ""
                        }>Water</option>
                        <option value="lava" ${
                          tileType === 3 ? "selected" : ""
                        }>Lava</option>
                    </select>
                </label></li>
                <li>Coordinates: (${x}, ${y})</li>
                <li><label>Move to Map: 
                    <select id="moveToMapSelect">
                        ${Object.keys(mapManager.maps)
                          .map(
                            (mapName) =>
                              `<option value="${mapName}">${mapName}</option>`
                          )
                          .join("")}
                    </select>
                </label></li>
                <button id="moveToMapButton">Move Player to Selected Map</button>
            </ul>
        `;
    document
      .getElementById("tileTypeSelect")
      .addEventListener("change", (e) => {
        const newType = e.target.value;
        if (newType === "wall") {
          gameState.tileMap[y][x] = 1;
        } else if (newType === "floor") {
          gameState.tileMap[y][x] = 0;
        } else if (newType === "water") {
          gameState.tileMap[y][x] = 2;
        } else if (newType === "lava") {
          gameState.tileMap[y][x] = 3;
        }
      });
    document
      .getElementById("moveToMapButton")
      .addEventListener("click", () => {
        const selectedMap = document.getElementById("moveToMapSelect").value;
        if (selectedMap) {
          mapManager.saveCurrentMap();
          mapManager.loadMap(selectedMap);
        }
      });
  }
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

function getTileCoordinates(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const tileSize = getTileSize(canvas);
  return {
    x: Math.floor((event.clientX - rect.left) / tileSize),
    y: Math.floor((event.clientY - rect.top) / tileSize),
  };
}

function getTileSize(canvas) {
  const mapWidth = gameState.tileMap[0].length;
  const mapHeight = gameState.tileMap.length;
  return Math.min(canvas.width / mapWidth, canvas.height / mapHeight);
}

function isValidTilePosition(x, y) {
  return (
    x >= 0 &&
    y >= 0 &&
    y < gameState.tileMap.length &&
    x < gameState.tileMap[0].length
  );
}

function isCollidableTile(x, y) {
  return gameState.tileMap[y][x] === 1; // Wall tiles are collidable.
}

// Initialize the game when the DOM is loaded.
document.addEventListener("DOMContentLoaded", async () => {
  const game = new Game();
  await game.init();
});
