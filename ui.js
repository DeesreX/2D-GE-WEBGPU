class SidePanel {
    constructor(className, content) {
        this.Container = document.createElement('div');
        this.Container.className = className;
        this.Container.style.position = 'fixed';
        this.Container.style.left = '-240'; 
        this.Container.style.top = '0';
        this.Container.style.display = 'none';
        this.Container.style.width = '240px';
        this.Container.style.height = '100%';
        this.Container.style.backgroundColor = '#333';
        this.Container.style.color = '#fff';
        this.Container.style.padding = '10px';
        this.Container.style.overflowY = 'auto';
        this.Container.style.transition = 'left 0.3s ease';
        this.Container.style.boxShadow = '2px 0 5px rgba(0,0,0,0.5)';
        this.Container.innerHTML = content;
        document.body.appendChild(this.Container);
    }

    open() {
        this.Container.style.display = "block";
    }

    close() {
        this.Container.style.left = '-240';
        this.Container.style.display = "none";
    }

    updateContent(content){
        this.Container.innerHTML = content;
    }
}

class DimentionsSelectionSidePanel extends SidePanel {
    constructor(className, content) {
        super(className, content);
        this.Container.querySelector('#closeSidebarButton').addEventListener('click', () => {
            this.close();
        });
    }
}

class MapManagerSidePanel extends SidePanel {
    constructor(className, content) {
        super(className, content);
        document.getElementById('closeSidebarButton').addEventListener('click', () => {
            const sidebar = document.querySelector('.map-manager-sidebar');
            sidebar.style.left = '-240';
            sidebar.style.display = "none";
        });
    }
}

export function createDimensionSelectionForm() {
    var content = `
    <label for="mapWidth">Map Width:</label>
    <input type="number" id="mapWidth" name="mapWidth" min="1" value="20" style="margin-bottom: 10px; width: 60px;">
    <label for="mapHeight">Map Height:</label>
    <input type="number" id="mapHeight" name="mapHeight" min="1" value="15" style="margin-bottom: 10px; width: 60px;">
    <button id="startGameButton" style="padding: 5px 15px; margin-top: 10px;">Start Game</button>
    <button id="closeSidebarButton" class="sidebar-button" style="margin-top: 20px;">Close Sidebar</button>`;
    var dimentionsSelectionSideBar = new DimentionsSelectionSidePanel('dimentions', content);
    dimentionsSelectionSideBar.open();
}

export function createMapManagerSidebar(mapManager) {
    var className = 'map-manager-sidebar';
    var content = `
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
    var mapManagerSidePanel = new MapManagerSidePanel(className, content)

    // // Event listeners for saving and loading maps.
    // document.getElementById('saveMapButton').addEventListener('click', () => mapManager.saveCurrentMap());
    // document.getElementById('loadMapButton').addEventListener('click', () => mapManager.loadSavedMaps());
    // document.getElementById('addMapButton').addEventListener('click', () => {
    //     const mapName = document.getElementById('newMapName').value.trim();
    //     if (mapName && !mapManager.maps[mapName]) {
    //         mapManager.addMap(mapName, {
    //             tileMap: Array.from({ length: 10 }, () => Array(10).fill(0)),
    //             player: { x: 0, y: 0 },
    //             objects: []
    //         });
    //         mapManager.updateMapList();
    //     }
    // });

    mapManager.updateMapList();
}


export function createInspectorSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'inspectorDetails';
    sidebar.style.position = 'fixed';
    sidebar.style.left = '-240'; 
    sidebar.style.top = '0';
    sidebar.style.display = 'none';
    sidebar.style.width = '240px';
    sidebar.style.height = '100%';
    sidebar.style.backgroundColor = '#333';
    sidebar.style.color = '#fff';
    sidebar.style.padding = '10px';
    sidebar.style.overflowY = 'auto';
    sidebar.style.transition = 'left 0.3s ease';
    sidebar.style.boxShadow = '2px 0 5px rgba(0,0,0,0.5)';

    sidebar.innerHTML = `
        <h2>Inspector</h2>
            <section class="inspector-panel">
                <h3>Inspector</h3>
                <div class="inspector-details" id="inspectorDetails">
                    <p>Select an item to view its properties.</p>
                </div>
            </section>
        <button id="closeInspector" class="sidebar-button" style="margin-top: 20px;">Close Sidebar</button>
    `;
    document.body.appendChild(sidebar);


    // Event listener to toggle the sidebar's visibility.
    document.getElementById('btn_inspector').addEventListener('click', () => {
        const sidebar = document.querySelector('.inspectorDetails');
        if (sidebar.style.left === '0px') {
            sidebar.style.left = '-240';
            sidebar.style.display = "none";
        } else {
            sidebar.style.display = "block";
            sidebar.style.left = '0';
        }
    });

    // Event listener to close the sidebar.
    document.getElementById('closeInspector').addEventListener('click', () => {
        const sidebar = document.querySelector('.inspectorDetails');
        sidebar.style.left = '-300px';
        sidebar.style.display = "none";
    });

}