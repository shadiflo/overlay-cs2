// overlay.js - Enhanced with Faceit integration
class CS2SmokeOverlay {
    constructor() {
        this.currentMap = 'unknown';
        this.currentSite = 'a-site';
        this.currentTab = 'smokes';
        this.isOverlayVisible = false;
        this.smokeData = this.loadSmokeData();
        this.settings = this.loadSettings();
        this.currentMatch = null;

        this.initializeElements();
        this.bindEvents();
        this.setupGameStateListener();
        this.setupHotkeyListener();
        this.loadSavedSettings();

        // Set initial state
        this.setClickThrough(true);
    }

    initializeElements() {
        // Main elements
        this.toggleBtn = document.getElementById('toggle-btn');
        this.overlayPanel = document.getElementById('overlay-panel');
        this.closeBtn = document.getElementById('close-btn');
        this.currentMapEl = document.getElementById('current-map');
        this.connectionIndicator = document.getElementById('connection-indicator');
        this.connectionText = document.getElementById('connection-text');

        // Tab elements
        this.mainTabBtns = document.querySelectorAll('.main-tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Smokes tab elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.smokeList = document.getElementById('smoke-list');
        this.smokePreview = document.getElementById('smoke-preview');
        this.previewImage = document.getElementById('preview-image');
        this.previewTitle = document.getElementById('preview-title');
        this.previewDescription = document.getElementById('preview-description');
        this.closePreview = document.getElementById('close-preview');

        // Match tab elements
        this.loadMatchBtn = document.getElementById('load-match-btn');
        this.apiStatusText = document.getElementById('api-status-text');
        this.matchInfo = document.getElementById('match-info');
        this.noMatch = document.getElementById('no-match');
        this.matchTitle = document.getElementById('match-title');
        this.matchState = document.getElementById('match-state');
        this.team1Players = document.getElementById('team1-players');
        this.team2Players = document.getElementById('team2-players');
        this.matchMap = document.getElementById('match-map');
        this.matchMode = document.getElementById('match-mode');
        this.matchRoomLink = document.getElementById('match-room-link');

        // Settings elements
        this.faceitUsername = document.getElementById('faceit-username');
        this.faceitApiKey = document.getElementById('faceit-api-key');
        this.autoLoadMatch = document.getElementById('auto-load-match');
        this.showPlayerStats = document.getElementById('show-player-stats');
        this.saveSettingsBtn = document.getElementById('save-settings-btn');
    }

    bindEvents() {
        // Toggle button
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleOverlay();
        });

        this.closeBtn.addEventListener('click', () => this.hideOverlay());
        this.closePreview.addEventListener('click', () => this.hidePreview());

        // Main tab switching
        this.mainTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMainTab(e.target.dataset.tab);
            });
        });

        // Smoke site tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSite(e.target.dataset.site);
            });
        });

        // Match tab events
        this.loadMatchBtn.addEventListener('click', () => this.loadFaceitMatch());

        // Settings events
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.smokePreview && !this.smokePreview.classList.contains('hidden')) {
                    this.hidePreview();
                } else if (this.isOverlayVisible) {
                    this.hideOverlay();
                }
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOverlayVisible && !this.overlayPanel.contains(e.target) && !this.toggleBtn.contains(e.target)) {
                this.hideOverlay();
            }
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setupGameStateListener() {
        if (window.electronAPI) {
            window.electronAPI.onGameStateUpdate((event, gameState) => {
                this.handleGameStateUpdate(gameState);
            });
        }
    }

    setupHotkeyListener() {
        if (window.electronAPI) {
            window.electronAPI.onHotkeyToggle(() => {
                this.toggleOverlay();
            });

            window.electronAPI.onForceShow(() => {
                this.showOverlay();
            });

            window.electronAPI.onForceHide(() => {
                this.hideOverlay();
            });
        }
    }

    handleGameStateUpdate(gameState) {
        // Update connection status
        this.connectionIndicator.classList.remove('disconnected');
        this.connectionIndicator.classList.add('connected');
        this.connectionText.textContent = 'Connected';

        if (gameState.map && gameState.map.name) {
            const mapName = gameState.map.name.replace('de_', '');
            this.currentMap = mapName;
            this.currentMapEl.textContent = `Map: ${mapName.charAt(0).toUpperCase() + mapName.slice(1)}`;
            this.updateSmokeList();

            // Auto-load match if enabled and map changed
            if (this.settings.autoLoadMatch && this.currentTab === 'match') {
                this.loadFaceitMatch();
            }
        }
    }

    // Tab Management
    switchMainTab(tab) {
        this.currentTab = tab;

        // Update active tab button
        this.mainTabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update active tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
        });

        // Load tab-specific content
        if (tab === 'match' && !this.currentMatch) {
            this.showNoMatch();
        } else if (tab === 'smokes') {
            this.updateSmokeList();
        }
    }

    // Overlay Management
    setClickThrough(enabled) {
        if (window.electronAPI) {
            window.electronAPI.toggleClickthrough(enabled);
        }
    }

    toggleOverlay() {
        if (this.isOverlayVisible) {
            this.hideOverlay();
        } else {
            this.showOverlay();
        }
    }

    showOverlay() {
        this.overlayPanel.classList.remove('hidden');
        this.isOverlayVisible = true;
        this.setClickThrough(false);

        setTimeout(() => {
            this.overlayPanel.focus();
        }, 50);

        if (this.currentTab === 'smokes') {
            this.updateSmokeList();
        }
    }

    hideOverlay() {
        this.overlayPanel.classList.add('hidden');
        this.isOverlayVisible = false;
        this.hidePreview();

        setTimeout(() => {
            this.setClickThrough(true);
        }, 150);
    }

    // Smokes functionality (existing)
    switchSite(site) {
        this.currentSite = site;

        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.site === site);
        });

        this.updateSmokeList();
    }

    updateSmokeList() {
        const smokes = this.getSmokesByMapAndSite(this.currentMap, this.currentSite);

        this.smokeList.innerHTML = '';

        if (smokes.length === 0) {
            this.smokeList.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No smokes available for this map/site</div>';
            return;
        }

        smokes.forEach(smoke => {
            const smokeItem = document.createElement('div');
            smokeItem.className = 'smoke-item';
            smokeItem.innerHTML = `
                <h4>${smoke.name}</h4>
                <p>${smoke.description}</p>
            `;

            smokeItem.addEventListener('click', () => {
                this.showSmokePreview(smoke);
            });

            this.smokeList.appendChild(smokeItem);
        });
    }

    showSmokePreview(smoke) {
        this.previewImage.src = smoke.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
        this.previewTitle.textContent = smoke.name;
        this.previewDescription.textContent = smoke.fullDescription || smoke.description;
        this.smokePreview.classList.remove('hidden');
    }

    hidePreview() {
        this.smokePreview.classList.add('hidden');
    }

    getSmokesByMapAndSite(map, site) {
        return this.smokeData[map] ? (this.smokeData[map][site] || []) : [];
    }

    // Faceit API Integration
    async loadFaceitMatch() {
        if (!this.settings.faceitUsername) {
            this.showError('Please set your Faceit username in Settings first');
            this.switchMainTab('settings');
            return;
        }

        this.setLoadingState(true);

        try {
            // Get player ID first
            const playerId = await this.getFaceitPlayerId(this.settings.faceitUsername);
            if (!playerId) {
                throw new Error('Player not found');
            }

            // Get active match
            const matchData = await this.getActiveMatch(playerId);
            if (!matchData) {
                this.showNoMatch();
                return;
            }

            // Get detailed match information
            const detailedMatch = await this.getMatchDetails(matchData.match_id);
            this.currentMatch = detailedMatch;
            this.displayMatchInfo(detailedMatch);

        } catch (error) {
            console.error('Error loading Faceit match:', error);
            this.showError(`Failed to load match: ${error.message}`);
            this.showNoMatch();
        } finally {
            this.setLoadingState(false);
        }
    }

    async getFaceitPlayerId(username) {
        const response = await fetch(`https://open.faceit.com/data/v4/players?nickname=${username}`, {
            headers: this.getFaceitHeaders()
        });

        if (!response.ok) {
            throw new Error('Player not found');
        }

        const data = await response.json();
        return data.player_id;
    }

    async getActiveMatch(playerId) {
        const response = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, {
            headers: this.getFaceitHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to get player data');
        }

        const playerData = await response.json();

        // Check if player is in an active match
        if (playerData.games && playerData.games.cs2 && playerData.games.cs2.faceit_elo) {
            // Try to get recent matches to find active one
            const matchesResponse = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/matches?game=cs2&offset=0&limit=1`, {
                headers: this.getFaceitHeaders()
            });

            if (matchesResponse.ok) {
                const matchesData = await matchesResponse.json();
                if (matchesData.items && matchesData.items.length > 0) {
                    const latestMatch = matchesData.items[0];
                    // Check if match is recent and potentially active
                    const matchTime = new Date(latestMatch.started_at);
                    const now = new Date();
                    const timeDiff = now - matchTime;

                    // If match started within last 2 hours, consider it potentially active
                    if (timeDiff < 2 * 60 * 60 * 1000 && (latestMatch.status === 'ONGOING' || latestMatch.status === 'READY')) {
                        return latestMatch;
                    }
                }
            }
        }

        return null;
    }

    async getMatchDetails(matchId) {
        const response = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
            headers: this.getFaceitHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to get match details');
        }

        return await response.json();
    }

    getFaceitHeaders() {
        const headers = {
            'Accept': 'application/json'
        };

        if (this.settings.faceitApiKey) {
            headers['Authorization'] = `Bearer ${this.settings.faceitApiKey}`;
        }

        return headers;
    }

    displayMatchInfo(matchData) {
        this.matchInfo.classList.remove('hidden');
        this.noMatch.style.display = 'none';

        // Update match header
        this.matchTitle.textContent = `${matchData.competition_name || 'Faceit Match'}`;
        this.matchState.textContent = matchData.status || 'UNKNOWN';
        this.matchState.className = `match-state ${matchData.status?.toLowerCase() || 'unknown'}`;

        // Update match details
        this.matchMap.textContent = matchData.voting?.map?.pick?.[0] || matchData.teams?.faction1?.name || 'TBD';
        this.matchMode.textContent = matchData.competition_type || '5v5';
        this.matchRoomLink.href = matchData.faceit_url || '#';
        this.matchRoomLink.textContent = matchData.faceit_url ? 'Open Match Room' : 'No room available';

        // Display teams
        this.displayTeams(matchData.teams);

        this.apiStatusText.textContent = 'Match loaded successfully';
    }

    displayTeams(teams) {
        if (!teams) return;

        const team1 = teams.faction1;
        const team2 = teams.faction2;

        this.displayTeamPlayers(this.team1Players, team1);
        this.displayTeamPlayers(this.team2Players, team2);
    }

    displayTeamPlayers(container, team) {
        container.innerHTML = '';

        if (!team || !team.roster) return;

        team.roster.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player-item';

            const playerName = player.nickname || player.game_player_name || 'Unknown';
            const playerLevel = player.game_skill_level || player.skill_level || '?';

            playerEl.innerHTML = `
                <span class="player-name">${playerName}</span>
                <span class="player-level">Lvl ${playerLevel}</span>
            `;

            container.appendChild(playerEl);
        });
    }

    showNoMatch() {
        this.matchInfo.classList.add('hidden');
        this.noMatch.style.display = 'flex';
        this.apiStatusText.textContent = 'No active match found';
    }

    setLoadingState(loading) {
        this.loadMatchBtn.classList.toggle('loading', loading);
        this.loadMatchBtn.disabled = loading;

        if (loading) {
            this.loadMatchBtn.innerHTML = '<span class="btn-icon">🔄</span>Loading Match...';
            this.apiStatusText.textContent = 'Fetching match data...';
        } else {
            this.loadMatchBtn.innerHTML = '<span class="btn-icon">🎮</span>Load Faceit Match';
        }
    }

    showError(message) {
        this.apiStatusText.textContent = `Error: ${message}`;
        console.error('Faceit API Error:', message);
    }

    // Settings Management
    loadSettings() {
        const defaultSettings = {
            faceitUsername: '',
            faceitApiKey: '',
            autoLoadMatch: false,
            showPlayerStats: true
        };

        try {
            const saved = localStorage.getItem('cs2-overlay-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch {
            return defaultSettings;
        }
    }

    saveSettings() {
        this.settings = {
            faceitUsername: this.faceitUsername.value.trim(),
            faceitApiKey: this.faceitApiKey.value.trim(),
            autoLoadMatch: this.autoLoadMatch.checked,
            showPlayerStats: this.showPlayerStats.checked
        };

        try {
            localStorage.setItem('cs2-overlay-settings', JSON.stringify(this.settings));

            // Visual feedback
            const originalText = this.saveSettingsBtn.textContent;
            this.saveSettingsBtn.textContent = 'Saved!';
            this.saveSettingsBtn.style.background = 'rgba(76, 175, 80, 0.3)';

            setTimeout(() => {
                this.saveSettingsBtn.textContent = originalText;
                this.saveSettingsBtn.style.background = '';
            }, 2000);

        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    loadSavedSettings() {
        this.faceitUsername.value = this.settings.faceitUsername;
        this.faceitApiKey.value = this.settings.faceitApiKey;
        this.autoLoadMatch.checked = this.settings.autoLoadMatch;
        this.showPlayerStats.checked = this.settings.showPlayerStats;
    }

    // Smoke data (existing)
    loadSmokeData() {
        return {
            dust2: {
                'a-site': [
                    {
                        name: 'Xbox Smoke',
                        description: 'Standard xbox smoke from T spawn',
                        fullDescription: 'Line up crosshair with corner of roof, aim slightly left, and throw. This smoke will land on xbox and block CT vision.',
                        image: null
                    },
                    {
                        name: 'CT Smoke',
                        description: 'Smoke CT from long',
                        fullDescription: 'From long doors, aim at the antenna and throw. Blocks CT players rotating from site.',
                        image: null
                    }
                ],
                'b-site': [
                    {
                        name: 'Window Smoke',
                        description: 'Block window from tunnels',
                        fullDescription: 'From upper tunnels, aim at the window frame and throw to block sniper vision.',
                        image: null
                    }
                ],
                'mid': [
                    {
                        name: 'Cross Smoke',
                        description: 'Standard mid cross smoke',
                        fullDescription: 'From T spawn, line up with the corner and throw to block AWPer vision across mid.',
                        image: null
                    }
                ],
                'misc': []
            },
            mirage: {
                'a-site': [
                    {
                        name: 'CT Smoke',
                        description: 'Block CT from A site',
                        fullDescription: 'Standard CT smoke for A site execute.',
                        image: null
                    }
                ],
                'b-site': [
                    {
                        name: 'Bench Smoke',
                        description: 'Smoke bench position',
                        fullDescription: 'Smoke the bench area for B site execute.',
                        image: null
                    }
                ],
                'mid': [],
                'misc': []
            }
        };
    }
}

// Initialize the overlay when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CS2SmokeOverlay();
});
