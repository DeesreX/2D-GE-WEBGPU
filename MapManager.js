import { map_01 } from './Maps/map_01.js';
// Class to manage different maps in the game.
export default class MapManager {
    constructor(gameState) {
        this.maps = {}; // Stores maps by name.
        this.currentMap = null; // Keeps track of the currently loaded map.
        this.gameState = gameState;


        // Bind updateMapList to the current instance
        this.updateMapList = this.updateMapList.bind(this);
    }

    Init(){
        this.loadSavedMaps();
        this.addMap('MAP_01', {
            tileMap: map_01,
            player: { x: 2, y: 2 },
            objects: []
        });
        this.loadMap('startMap');
    }

    GetMaps(){
        return this.maps;
    }

    // Adds a new map to the maps collection.
    addMap(name, mapData) {
        this.maps[name] = mapData;
    }

    updateCanvasSize(canvas) {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
    
        const mapWidth = this.gameState.tileMap?.[0]?.length || 20;
        const mapHeight = this.gameState.tileMap?.length || 15;
        const tileSize = Math.min(
            containerWidth / mapWidth,
            containerHeight / mapHeight
        );
    
        canvas.width = Math.floor(tileSize * mapWidth);
        canvas.height = Math.floor(tileSize * mapHeight);
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
    }

    // Loads a specified map by name.
    loadMap(name,) {
        if (this.maps[name]) {
            this.gameState.tileMap = this.maps[name].tileMap; // Set the game's tile map to the loaded map.
            this.gameState.objects = this.maps[name].objects || []; // Set the objects on the map.
            this.gameState.player = { ...this.maps[name].player }; // Set the player's position.
            this.currentMap = name; // Update the current map name.
            this.updateCanvasSize(document.getElementById('gameCanvas')); // Update the canvas size accordingly.
        } else {
            console.error(`Map ${name} not found.`); // Log an error if the map is not found.
        }
    }

    // Saves the current state of the current map.
    saveCurrentMap() {
        if (this.currentMap) {
            this.maps[this.currentMap] = {
                tileMap: this.gameState.tileMap,
                objects: this.gameState.objects,
                player: { ...this.gameState.player }
            };
            localStorage.setItem('gameMaps', JSON.stringify(this.maps)); // Save the maps to local storage.
        }
    }

    // Loads maps that have been saved in the browser's local storage.
    loadSavedMaps() {
        const savedMapsString = localStorage.getItem('gameMaps');
        if (savedMapsString) {
            this.maps = JSON.parse(savedMapsString); // Parse and load saved maps.
        }
    }

    updateMapList() {
        const allMaps = this.GetMaps(); // Make sure 'allMaps' correctly gets the maps object.
        const mapList = document.getElementById('mapList');
        if (mapList) {
            mapList.innerHTML = ''; // Clear the map list.
    
            // Iterate over the maps and create list items for each map.
            Object.keys(allMaps).forEach(mapName => {
                const listItem = document.createElement('li');
                listItem.className = 'map-list-item';
                listItem.textContent = mapName;
                listItem.style.cursor = 'pointer';
                listItem.style.padding = '10px';
                listItem.style.borderBottom = '1px solid #555';
    
                // Attach a click event handler to load the selected map.
                listItem.addEventListener('click', () => {
                    this.saveCurrentMap(); // Save the current map before loading a new one.
                    this.loadMap(mapName); // Load the selected map.
                });
    
                // Add the list item to the map list in the DOM.
                mapList.appendChild(listItem);
            });
        }
    }
    
    
}

