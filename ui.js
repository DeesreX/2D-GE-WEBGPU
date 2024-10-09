
// Creates a form to select map dimensions.
export function createDimensionSelectionForm(device, context, format) {
    const formContainer = document.createElement('div');
    formContainer.className = 'dimension-form';
    formContainer.style.position = 'fixed';
    formContainer.style.right = '20px';
    formContainer.style.top = '20px';
    formContainer.style.zIndex = '1000';
    formContainer.style.backgroundColor = '#444';
    formContainer.style.padding = '15px';
    formContainer.style.borderRadius = '10px';
    formContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
    formContainer.innerHTML = `
        <label for="mapWidth">Map Width:</label>
        <input type="number" id="mapWidth" name="mapWidth" min="1" value="20" style="margin-bottom: 10px; width: 60px;">
        <label for="mapHeight">Map Height:</label>
        <input type="number" id="mapHeight" name="mapHeight" min="1" value="15" style="margin-bottom: 10px; width: 60px;">
        <button id="startGameButton" style="padding: 5px 15px; margin-top: 10px;">Start Game</button>
    `;
    document.body.appendChild(formContainer);

    // Event listener for starting the game with selected dimensions.
    document.getElementById('startGameButton').addEventListener('click', () => {
        const mapWidth = parseInt(document.getElementById('mapWidth').value, 10) || 20;
        const mapHeight = parseInt(document.getElementById('mapHeight').value, 10) || 15;
        initializeTileMap(mapWidth, mapHeight, false);
        formContainer.remove();
        startGameLoop(device, context, format);
    });
}

export function createMapManagerSidebar(mapManager) {
    const sidebar = document.createElement('div');
    sidebar.className = 'map-manager-sidebar';
    sidebar.style.position = 'fixed';
    sidebar.style.left = '-300px'; // Initially hidden off-screen
    sidebar.style.top = '0';
    sidebar.style.display = 'none';
    sidebar.style.width = '300px';
    sidebar.style.height = '100%';
    sidebar.style.backgroundColor = '#333';
    sidebar.style.color = '#fff';
    sidebar.style.padding = '20px';
    sidebar.style.overflowY = 'auto';
    sidebar.style.transition = 'left 0.3s ease';
    sidebar.style.boxShadow = '2px 0 5px rgba(0,0,0,0.5)';

    sidebar.innerHTML = `
        <h2>Map Manager</h2>
        <div class="map-actions">
            <button id="saveMapButton" class="sidebar-button">Save Current Map</button>
            <button id="loadMapButton" class="sidebar-button">Load Saved Maps</button>
        </div>
        <h3>Available Maps</h3>
        <ul id="mapList" class="map-list"></ul>
        <h3>Add New Map</h3>
        <div class="add-map-container">
            <input type="text" id="newMapName" placeholder="Map Name">
            <button id="addMapButton" class="sidebar-button">Add Map</button>
        </div>
        <button id="closeSidebarButton" class="sidebar-button" style="margin-top: 20px;">Close Sidebar</button>
    `;
    document.body.appendChild(sidebar);

    // Event listener to toggle the sidebar's visibility.
    document.getElementById('toggleSidebarButton').addEventListener('click', () => {
        const sidebar = document.querySelector('.map-manager-sidebar');
        if (sidebar.style.left === '0px') {
            sidebar.style.left = '-300px';
            sidebar.style.display = "none"; 
        } else {
            sidebar.style.display = "block";
            sidebar.style.left = '0';
        }
    });

    // Event listener to close the sidebar.
    document.getElementById('closeSidebarButton').addEventListener('click', () => {
        const sidebar = document.querySelector('.map-manager-sidebar');
        sidebar.style.left = '-300px';
        sidebar.style.display = "none"; 
    });

    // Event listeners for saving and loading maps.
    document.getElementById('saveMapButton').addEventListener('click', () => mapManager.saveCurrentMap());
    document.getElementById('loadMapButton').addEventListener('click', () => mapManager.loadSavedMaps());
    document.getElementById('addMapButton').addEventListener('click', () => {
        const mapName = document.getElementById('newMapName').value.trim();
        if (mapName && !mapManager.maps[mapName]) {
            mapManager.addMap(mapName, {
                tileMap: Array.from({ length: 10 }, () => Array(10).fill(0)),
                player: { x: 0, y: 0 },
                objects: []
            });
            mapManager.updateMapList();
        }
    });

    mapManager.updateMapList(); 
}