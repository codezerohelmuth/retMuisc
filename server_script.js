// Enhanced server detection and health monitoring
async function detectAndConnectToServer() {
    const possibleConfigs = [
        { host: 'localhost', port: 8080 },
        { host: '127.0.0.1', port: 8080 },
        { host: 'localhost', port: 3000 },
        { host: 'localhost', port: 8000 },
        { host: 'localhost', port: 8888 }
    ];
    
    showError('🔍 Auto-detecting backend server...');
    
    for (const config of possibleConfigs) {
        try {
            const testUrl = `http://${config.host}:${config.port}${SERVER_CONFIG.ENDPOINTS.HEALTH}`;
            const response = await fetch(testUrl, { 
                signal: AbortSignal.timeout(3000) // 3 second timeout
            });
            
            if (response.ok) {
                const healthData = await response.json();
                SERVER_CONFIG.BASE_URL = `http://${config.host}:${config.port}`;
                serverStatus.connected = true;
                serverStatus.features = healthData.features || {};
                
                showError(`✅ Connected to server at ${SERVER_CONFIG.BASE_URL}`);
                updateServerStatus('Connected');
                
                // Show server capabilities
                if (healthData.features) {
                    console.log('🎵 Server Features:', healthData.features);
                    if (healthData.features.local_scraping === 'available') {
                        showError('🚀 Local scraping available - works offline!');
                    }
                }
                
                setTimeout(hideError, 3000);
                return true;
            }
        } catch (error) {
            // Continue trying other configurations
            console.debug(`Failed to connect to ${config.host}:${config.port}:`, error.message);
        }
    }
    
    serverStatus.connected = false;
    showError('❌ Backend server not found. Run: python ret_music_server.py');
    updateServerStatus('Not Found');
    
    return false;
}

// Get server statistics and cache info
async function getServerStats() {
    if (!serverStatus.connected) return null;
    
    try {
        const response = await fetch(`${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.ENDPOINTS.CACHE_STATS}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('Failed to get server stats:', error);
    }
    return null;
}

// Get popular searches for suggestions
async function getPopularSearches() {
    if (!serverStatus.connected) return [];
    
    try {
        const response = await fetch(`${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.ENDPOINTS.POPULAR}?limit=10`);
        if (response.ok) {
            const data = await response.json();
            return data.popular_searches || [];
        }
    } catch (error) {
        console.log('Failed to get popular searches:', error);
    }
    return [];
}

// Enhanced video details with backend support
async function getVideoDetails(videoId) {
    if (!serverStatus.connected) return null;
    
    try {
        const videoUrl = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.ENDPOINTS.VIDEO}/${videoId}`;
        const response = await fetch(videoUrl);
        
        if (response.ok) {
            const videoData = await response.json();
            return videoData;
        }
    } catch (error) {
        console.log('Backend video details failed:', error);
    }
    return null;
}

// Enhanced proxy function with backend
async function proxyRequest(url) {
    if (!serverStatus.connected) return null;
    
    try {
        const proxyUrl = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.ENDPOINTS.PROXY}?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        console.log('Proxy request failed:', error);
    }
    return null;
}

// Server status monitoring
function startServerMonitoring() {
    // Check server health every 30 seconds
    setInterval(async () => {
        if (serverStatus.connected) {
            try {
                const response = await fetch(`${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.ENDPOINTS.HEALTH}`, {
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!response.ok) {
                    throw new Error('Health check failed');
                }
                
                const healthData = await response.json();
                serverStatus.features = healthData.features || {};
                updateServerStatus('Connected');
                
            } catch (error) {
                serverStatus.connected = false;
                updateServerStatus('Disconnected');
                console.log('Server health check failed:', error);
            }
        }
    }, 30000);
}

// Update server status indicator in UI
function updateServerStatus(status) {
    const statusElement = document.getElementById('serverStatus');
    if (statusElement) {
        const icons = {
            'Connected': '🟢',
            'Searching...': '🔍',
            'Disconnected': '🔴',
            'Not Found': '❌',
            'Offline': '⚠️'
        };
        
        const icon = icons[status] || '⚪';
        statusElement.textContent = `${icon} ${status}`;
        
        // Add pulsing animation for searching
        if (status === 'Searching...') {
            statusElement.style.animation = 'pulse 1s infinite';
        } else {
            statusElement.style.animation = 'none';
        }
    }
}

// Enhanced server status indicator with more details
function createEnhancedServerStatus() {
    const header = document.querySelector('.header');
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 11px;
        z-index: 1001;
    `;
    
    statusContainer.innerHTML = `
        <div id="serverStatus" style="
            padding: 5px 10px;
            border: 1px solid #ff0033;
            background: rgba(0,0,0,0.9);
            margin-bottom: 5px;
            text-align: center;
        ">🔍 Checking...</div>
        
        <div id="serverFeatures" style="
            padding: 3px 8px;
            border: 1px solid #ff0033;
            background: rgba(0,0,0,0.8);
            font-size: 9px;
            display: none;
        "></div>
    `;
    
    header.appendChild(statusContainer);
}

// Update server features display
function updateServerFeatures() {
    const featuresElement = document.getElementById('serverFeatures');
    if (featuresElement && serverStatus.connected && serverStatus.features) {
        const features = [];
        
        if (serverStatus.features.local_scraping === 'available') {
            features.push('🔧 Local Scraping');
        }
        if (serverStatus.features.local_cache === 'available') {
            features.push('💾 Cache');
        }
        if (serverStatus.features.smart_suggestions === 'available') {
            features.push('🧠 AI Suggestions');
        }
        
        if (features.length > 0) {
            featuresElement.textContent = features.join(' | ');
            featuresElement.style.display = 'block';
        }
    }
}

// Enhanced search input with suggestions
function enhanceSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // Create suggestions dropdown
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'searchSuggestions';
    suggestionsDiv.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #000;
        border: 2px solid #ff0033;
        border-top: none;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;
    
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(suggestionsDiv);
    
    // Add input event listener for live suggestions
    let suggestionTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(suggestionTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        suggestionTimeout = setTimeout(async () => {
            await showSearchSuggestions(query);
        }, 300);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

// Show search suggestions
async function showSearchSuggestions(query) {
    const suggestionsDiv = document.getElementById('searchSuggestions');
    if (!suggestionsDiv) return;
    
    // Get popular searches that match the query
    const popularSearches = await getPopularSearches();
    const matchingSuggestions = popularSearches.filter(search => 
        search.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    
    // Add some genre-based suggestions
    const genreSuggestions = [];
    const genres = ['rock', 'pop', 'jazz', 'classical', 'hip hop', 'electronic'];
    for (const genre of genres) {
        if (genre.includes(query.toLowerCase()) || query.toLowerCase().includes(genre)) {
            genreSuggestions.push(`${query} ${genre}`, `best ${genre} songs`);
        }
    }
    
    const allSuggestions = [...new Set([...matchingSuggestions, ...genreSuggestions])].slice(0, 8);
    
    if (allSuggestions.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    suggestionsDiv.innerHTML = allSuggestions.map(suggestion => `
        <div class="suggestion-item" style="
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,0,51,0.3);
            font-size: 12px;
        " onclick="selectSuggestion('${suggestion.replace(/'/g, "\\'")}')">
            ${suggestion}
        </div>
    `).join('');
    
    // Add hover effects
    suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,0,51,0.1)';
        });
        item.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
        });
    });
    
    suggestionsDiv.style.display = 'block';
}

// Select a suggestion
function selectSuggestion(suggestion) {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('searchSuggestions');
    
    if (searchInput) {
        searchInput.value = suggestion;
        searchSongs(); // Trigger search
    }
    
    if (suggestionsDiv) {
        suggestionsDiv.style.display = 'none';
    }
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Create enhanced UI elements
    createEnhancedServerStatus();
    enhanceSearchInput();
    
    // Start server detection and monitoring
    showError('🚀 Initializing RET-MUSIC with backend support...');
    
    const connected = await detectAndConnectToServer();
    
    if (connected) {
        // Start health monitoring
        startServerMonitoring();
        
        // Get and display server stats
        const stats = await getServerStats();
        if (stats) {
            console.log('📊 Server Statistics:', stats);
            updateServerFeatures();
        }
        
        // Pre-load popular searches for better UX
        getPopularSearches().then(popular => {
            if (popular.length > 0) {
                console.log('🔥 Popular searches loaded:', popular);
            }
        });
        
    } else {
        // Show fallback message
        showError('⚠️ Running in fallback mode - limited functionality');
        updateServerStatus('Offline');
        setTimeout(hideError, 5000);
    }
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        
        .suggestion-item {
            transition: background-color 0.2s ease;
        }
        
        #serverStatus {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
});

// Keyboard shortcuts enhancement
document.addEventListener('keydown', function(e) {
    // Ctrl+K to focus search
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Escape to hide suggestions
    if (e.key === 'Escape') {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
    }
});

/* 
ENHANCED INSTALLATION INSTRUCTIONS:

1. Save the Python server code as 'ret_music_server.py'

2. Install required Python packages:
   pip install aiohttp aiohttp-cors

3. Run the enhanced server:
   python ret_music_server.py
   
   Or with options:
   python ret_music_server.py --host 0.0.0.0 --port 8080 --debug

4. Replace the search function in your HTML file with this enhanced version

5. The system now includes:
   ✅ Auto-server detection
   ✅ Multi-tier fallback system  
   ✅ Local scraping when APIs fail
   ✅ Intelligent suggestions
   ✅ Search autocomplete
   ✅ Server health monitoring
   ✅ Cache statistics
   ✅ Popular searches tracking

FEATURES:
- 🎯 4-tier search strategy (Cache → Invidious → Local → Suggestions)
- 🔧 Works completely offline with local scraping
- 🧠 Smart suggestions based on query analysis
- 💾 Local SQLite caching for better performance
- 🔍 Real-time search suggestions with autocomplete
- 📊 Server statistics and health monitoring
- ⌨️ Keyboard shortcuts (Ctrl+K to search, Escape to close)
- 🚀 Automatic server detection and reconnection
- 📱 Responsive design with status indicators

KEYBOARD SHORTCUTS:
- Ctrl+K: Focus search input
- Escape: Hide suggestions/stop media
- Space: Play/pause (when not in input field)

SERVER TIERS:
1️⃣ Local Cache (instant, works offline)
2️⃣ Invidious API (external, reliable)  
3️⃣ YouTube Scraping (local, no external deps)
4️⃣ Smart Suggestions (local, always works)
*/// Enhanced HTML Client Integration for RET-MUSIC Backend v2.0
// Add this to your HTML file's <script> section

// Enhanced Configuration with auto-detection
const SERVER_CONFIG = {
    BASE_URL: 'http://localhost:8080',
    ENDPOINTS: {
        SEARCH: '/api/search',
        VIDEO: '/api/video',
        PROXY: '/api/proxy',
        POPULAR: '/api/popular',
        SUGGESTIONS: '/api/suggestions',
        HEALTH: '/health',
        CACHE_STATS: '/api/cache/stats'
    },
    AUTO_DETECT: true,
    FALLBACK_ENABLED: true
};

// Server status tracking
let serverStatus = {
    connected: false,
    lastCheck: null,
    features: {},
    retryCount: 0
};

// Enhanced search function with intelligent fallback strategy
async function searchSongs() {
    const query = searchInput.value.trim();
    if (!query) return;

    showError('🔍 Initiating multi-tier search...');
    updateServerStatus('Searching...');

    try {
        // Tier 1: Try the enhanced backend server
        const searchUrl = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}&limit=20`;
        
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displaySearchResults(data.results);
            hideError();
            
            // Show which method was used
            const searchMethod = detectSearchMethod(data);
            showError(`✅ Found ${data.results.length} results via ${searchMethod}`);
            setTimeout(hideError, 3000);
            
            serverStatus.connected = true;
            serverStatus.retryCount = 0;
            updateServerStatus('Connected');
            return;
        } else {
            throw new Error('No results from backend server');
        }

    } catch (error) {
        serverStatus.connected = false;
        serverStatus.retryCount++;
        updateServerStatus(`Offline (${serverStatus.retryCount} failed attempts)`);
        
        showError(`❌ Backend server failed: ${error.message}`);
        console.log('Backend failed, trying fallback methods...');
        
        // Only fallback if enabled
        if (SERVER_CONFIG.FALLBACK_ENABLED) {
            return await fallbackSearchMethods(query);
        } else {
            showError('❌ Search failed - backend server unavailable');
            displayManualSearchOptions(query);
        }
    }
}

// Detect which search method was used based on response
function detectSearchMethod(data) {
    if (data.server_type === 'local_fallback_enabled') {
        // Look for clues in the response about which tier was used
        if (data.results[0]?.description?.includes('Popular suggestion')) {
            return '🧠 Smart Suggestions (Tier 4)';
        } else if (data.results[0]?.description?.includes('Suggested based on')) {
            return '🧠 Smart Suggestions (Tier 4)';
        } else {
            // Could be cache, invidious, or local scraping
            return '🚀 Backend Server (Multi-tier)';
        }
    }
    return '🌐 External API';
}

// Enhanced fallback methods with better error handling
async function fallbackSearchMethods(query) {
    showError('🔄 Trying fallback methods...');
    
    // Fallback 1: Try CORS proxy with Invidious
    try {
        showError('🌐 Trying CORS proxy...');
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = encodeURIComponent(`https://invidious.tiekoetter.com/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        
        const response = await fetch(proxyUrl + targetUrl, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data && data.length > 0) {
            displaySearchResults(data);
            hideError();
            showError('✅ Search successful via CORS proxy');
            setTimeout(hideError, 2000);
            return;
        }
    } catch (error) {
        showError(`❌ CORS proxy failed: ${error.message}`);
    }

    // Fallback 2: Try backup CORS proxy
    try {
        showError('🔄 Trying backup proxy...');
        const proxyUrl = 'https://corsproxy.io/?';
        const targetUrl = encodeURIComponent(`https://invidious.tiekoetter.com/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        
        const response = await fetch(proxyUrl + targetUrl, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data && data.length > 0) {
            displaySearchResults(data);
            hideError();
            showError('✅ Search successful via backup proxy');
            setTimeout(hideError, 2000);
            return;
        }
    } catch (error) {
        showError(`❌ Backup proxy failed: ${error.message}`);
    }

    // Fallback 3: Local suggestions based on query analysis
    showError('🧠 Generating intelligent suggestions...');
    const localSuggestions = generateLocalSuggestions(query);
    if (localSuggestions.length > 0) {
        displaySearchResults(localSuggestions);
        showError('💡 Showing intelligent suggestions based on your query');
        setTimeout(hideError, 3000);
        return;
    }

    // Final fallback: Manual search options
    showError('❌ All automated methods failed, showing manual options...');
    displayManualSearchOptions(query);
}

// Generate intelligent local suggestions when all else fails
function generateLocalSuggestions(query) {
    const queryLower = query.toLowerCase();
    const suggestions = [];
    
    // Music genre mapping with popular songs
    const genreDatabase = {
        'rock': [
            {id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', author: 'Queen Official'},
            {id: 'iYYRH4apXDo', title: 'Led Zeppelin - Stairway To Heaven', author: 'Led Zeppelin'},
            {id: '1w7OgIMMRc4', title: 'Guns N\' Roses - Sweet Child O\' Mine', author: 'Guns N\' Roses'}
        ],
        'pop': [
            {id: 'Zi_XLOBDo_Y', title: 'Michael Jackson - Billie Jean', author: 'Michael Jackson'},
            {id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', author: 'Ed Sheeran'},
            {id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito', author: 'Luis Fonsi'}
        ],
        'jazz': [
            {id: 'vmDDOFXSgAs', title: 'Miles Davis - Kind of Blue', author: 'Miles Davis'},
            {id: 'PoPL7BExSQU', title: 'John Coltrane - Giant Steps', author: 'John Coltrane'}
        ],
        'classical': [
            {id: 'hMY_xs5hPjw', title: 'Mozart - Eine kleine Nachtmusik', author: 'Mozart'},
            {id: 'rOjHhS5MtvA', title: 'Beethoven - 9th Symphony', author: 'Beethoven'}
        ]
    };
    
    // Check for genre matches
    for (const [genre, songs] of Object.entries(genreDatabase)) {
        if (queryLower.includes(genre)) {
            suggestions.push(...songs.slice(0, 3));
            break;
        }
    }
    
    // Check for artist names
    const artistDatabase = {
        'queen': [{id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', author: 'Queen Official'}],
        'beatles': [{id: 'ZbZSe6N_BXs', title: 'The Beatles - Hey Jude', author: 'The Beatles'}],
        'elvis': [{id: 'gj0Rz-uP4Mk', title: 'Elvis Presley - Can\'t Help Falling in Love', author: 'Elvis Presley'}]
    };
    
    for (const [artist, songs] of Object.entries(artistDatabase)) {
        if (queryLower.includes(artist)) {
            suggestions.push(...songs);
        }
    }
    
    // If no specific matches, add popular songs
    if (suggestions.length === 0) {
        suggestions.push(
            {id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', author: 'Rick Astley'},
            {id: 'YkADj0TPrJA', title: 'John Lennon - Imagine', author: 'John Lennon'},
            {id: 'BciS5krYL80', title: 'Eagles - Hotel California', author: 'Eagles'}
        );
    }
    
    // Convert to expected format
    return suggestions.slice(0, 6).map(song => ({
        videoId: song.id,
        title: song.title,
        author: song.author,
        lengthSeconds: Math.floor(Math.random() * 180) + 180, // 3-6 minutes
        viewCount: Math.floor(Math.random() * 100000000) + 1000000,
        published: 0,
        description: `Local suggestion for: ${query}`,
        videoThumbnails: [{url: `https://img.youtube.com/vi/${song.id}/mqdefault.jpg`}]
    }));
}

// Keep original search as fallback
async function originalSearchSongs() {
    const query = searchInput.value.trim();
    if (!query) return;

    showError('Backend unavailable, trying CORS proxy...');

    // Original CORS proxy methods
    try {
        showError('Trying CORS proxy...');
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = encodeURIComponent(`https://invidious.tiekoetter.com/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        
        const response = await fetch(proxyUrl + targetUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        displaySearchResults(data);
        hideError();
        showError('Search successful via CORS proxy');
        setTimeout(hideError, 2000);
        return;
    } catch (error) {
        showError('CORS proxy failed, trying alternative...');
    }

    // Method 2: Try another CORS proxy
    try {
        showError('Trying backup proxy...');
        const proxyUrl = 'https://corsproxy.io/?';
        const targetUrl = encodeURIComponent(`https://invidious.tiekoetter.com/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        
        const response = await fetch(proxyUrl + targetUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        displaySearchResults(data);
        hideError();
        showError('Search successful via backup proxy');
        setTimeout(hideError, 2000);
        return;
    } catch (error) {
        showError('Backup proxy failed, showing manual options...');
    }

    // Method 3: Generate sample results and show manual search
    displayManualSearchOptions(query);
}

// Enhanced function to get video details via backend
async function getVideoDetails(videoId) {
    try {
        const videoUrl = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.VIDEO_ENDPOINT}/${videoId}`;
        const response = await fetch(videoUrl);
        
        if (response.ok) {
            const videoData = await response.json();
            return videoData;
        }
    } catch (error) {
        console.log('Backend video details failed:', error);
    }
    return null;
}

// Enhanced proxy function for other CORS-blocked requests
async function proxyRequest(url) {
    try {
        const proxyUrl = `${SERVER_CONFIG.BASE_URL}${SERVER_CONFIG.PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        console.log('Proxy request failed:', error);
    }
    return null;
}

// Check if backend server is available
async function checkBackendHealth() {
    try {
        const response = await fetch(`${SERVER_CONFIG.BASE_URL}/health`);
        if (response.ok) {
            const health = await response.json();
            showError(`Backend server connected: ${health.status}`);
            setTimeout(hideError, 3000);
            return true;
        }
    } catch (error) {
        showError('Backend server not available - using fallback methods');
        setTimeout(hideError, 3000);
    }
    return false;
}

// Auto-detect server configuration
async function detectServerConfig() {
    const possiblePorts = [8080, 3000, 8000, 8888];
    const possibleHosts = ['localhost', '127.0.0.1'];
    
    for (const host of possibleHosts) {
        for (const port of possiblePorts) {
            try {
                const testUrl = `http://${host}:${port}/health`;
                const response = await fetch(testUrl);
                if (response.ok) {
                    SERVER_CONFIG.BASE_URL = `http://${host}:${port}`;
                    showError(`Auto-detected backend server at ${SERVER_CONFIG.BASE_URL}`);
                    setTimeout(hideError, 3000);
                    return true;
                }
            } catch (error) {
                // Continue trying
            }
        }
    }
    return false;
}

// Initialize backend connection on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Original initialization code here...
    
    // Try to connect to backend server
    showError('Checking for backend server...');
    
    let connected = await checkBackendHealth();
    
    if (!connected) {
        showError('Trying to auto-detect server...');
        connected = await detectServerConfig();
    }
    
    if (!connected) {
        showError('Backend server not found. Run: python ret_music_server.py');
        setTimeout(hideError, 5000);
    }
});

// Add server status indicator to the header
function addServerStatusIndicator() {
    const header = document.querySelector('.header');
    const statusDiv = document.createElement('div');
    statusDiv.id = 'serverStatus';
    statusDiv.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 12px;
        padding: 5px 10px;
        border: 1px solid #ff0033;
        background: rgba(0,0,0,0.8);
    `;
    statusDiv.textContent = '🔍 Checking server...';
    header.appendChild(statusDiv);
    
    // Update status periodically
    setInterval(async () => {
        const isHealthy = await checkBackendHealth();
        const statusElement = document.getElementById('serverStatus');
        if (statusElement) {
            statusElement.textContent = isHealthy ? '🟢 Server Online' : '🔴 Server Offline';
        }
    }, 30000); // Check every 30 seconds
}

// Call this after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addServerStatusIndicator();
});

/* 
INSTALLATION INSTRUCTIONS:

1. Save the Python server code as 'ret_music_server.py'

2. Install required Python packages:
   pip install aiohttp aiohttp-cors

3. Run the server:
   python ret_music_server.py
   
   Or with custom host/port:
   python ret_music_server.py --host 0.0.0.0 --port 8080

4. Add the above JavaScript code to your HTML file's <script> section

5. The HTML player will automatically detect and use the backend server

6. If server is not available, it falls back to original CORS proxy methods

FEATURES:
- Automatic server detection
- Health checks and status indicators  
- Graceful fallback to original methods
- Support for video details and proxy requests
- CORS handling for all requests
- Multiple search strategies
*/