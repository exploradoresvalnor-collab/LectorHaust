<?php
/**
 * GameBrain API Consumer Web App
 * Theme: Cyberpunk / Neon Glassmorphism
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Gaming | API Explorer</title>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #05050A;
            --bg-surface: rgba(15, 20, 35, 0.6);
            --brand-cyan: #00f2fe;
            --brand-purple: #4facfe;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border-glow: rgba(0, 242, 254, 0.3);
            --glass-border: rgba(255, 255, 255, 0.08);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-deep);
            color: var(--text-main);
            min-height: 100vh;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(79, 172, 254, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 85% 30%, rgba(0, 242, 254, 0.1) 0%, transparent 40%);
        }

        /* Ambient animated grid background */
        .cyber-grid {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -1;
            background: 
                linear-gradient(transparent 0%, rgba(0, 242, 254, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, transparent 0%, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            transform: perspective(500px) rotateX(60deg) translateY(100px) translateZ(-200px);
            animation: gridMove 20s linear infinite;
            opacity: 0.5;
        }

        @keyframes gridMove {
            0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
            100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); }
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
            position: relative;
            z-index: 10;
        }

        /* Header & Hero */
        header {
            text-align: center;
            margin-bottom: 3rem;
            padding-top: 2rem;
        }

        h1 {
            font-family: 'Rajdhani', sans-serif;
            font-size: clamp(3rem, 6vw, 5rem);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 1rem;
            background: linear-gradient(to right, var(--brand-cyan), var(--brand-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 30px var(--border-glow);
        }
        
        .subtitle {
            font-size: 1.2rem;
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto;
        }

        /* Search & Filter Bar (Glassmorphism) */
        .controls-wrapper {
            background: var(--bg-surface);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 1.5rem;
            margin-bottom: 3rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0, 242, 254, 0.05);
        }

        .search-box {
            display: flex;
            gap: 1rem;
        }

        input[type="text"] {
            flex: 1;
            background: rgba(0,0,0,0.5);
            border: 1px solid var(--glass-border);
            color: white;
            padding: 1rem 1.5rem;
            font-size: 1.1rem;
            border-radius: 12px;
            outline: none;
            transition: all 0.3s;
            font-family: 'Inter', sans-serif;
        }

        input[type="text"]:focus {
            border-color: var(--brand-cyan);
            box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
        }

        button.primary-btn {
            background: linear-gradient(135deg, var(--brand-cyan) 0%, var(--brand-purple) 100%);
            color: #000;
            border: none;
            padding: 0 2.5rem;
            font-size: 1.1rem;
            font-weight: 700;
            font-family: 'Rajdhani', sans-serif;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 0 20px rgba(0, 242, 254, 0.4);
        }

        button.primary-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(0, 242, 254, 0.6);
            color: #fff;
        }

        .filters-group {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        select {
            background: rgba(0,0,0,0.5);
            border: 1px solid var(--glass-border);
            color: var(--text-main);
            padding: 0.8rem 1.2rem;
            border-radius: 8px;
            font-size: 0.95rem;
            outline: none;
            cursor: pointer;
            flex: 1;
            min-width: 150px;
            font-family: 'Inter', sans-serif;
            appearance: none;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300f2fe%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem top 50%;
            background-size: 0.65rem auto;
            transition: all 0.3s;
        }

        select:hover, select:focus {
            border-color: var(--brand-purple);
        }

        select option {
            background: var(--bg-deep);
            color: white;
        }

        /* Grid Results */
        #results {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 2.5rem;
        }

        .game-card {
            background: rgba(15, 20, 35, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .game-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 100%;
            background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0, 242, 254, 0.05) 100%);
            opacity: 0;
            transition: opacity 0.4s;
            pointer-events: none;
            z-index: 1;
        }

        .game-card:hover {
            transform: translateY(-12px) scale(1.02);
            border-color: var(--brand-cyan);
            box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(0, 242, 254, 0.3);
        }

        .game-card:hover::before { opacity: 1; }

        .game-img-container {
            width: 100%;
            height: 220px;
            overflow: hidden;
            position: relative;
            border-bottom: 2px solid rgba(255,255,255,0.05);
        }

        .game-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .game-card:hover .game-img {
            transform: scale(1.08);
        }

        .score-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 0, 0.85);
            border: 1px solid var(--brand-cyan);
            color: var(--brand-cyan);
            padding: 0.5rem 1rem;
            border-radius: 12px;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 700;
            font-size: 1.2rem;
            backdrop-filter: blur(8px);
            z-index: 2;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }

        .game-info {
            padding: 1.8rem;
            position: relative;
            z-index: 2;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .game-title {
            font-family: 'Rajdhani', sans-serif;
            font-size: 1.6rem;
            font-weight: 700;
            margin-bottom: 0.8rem;
            color: #fff;
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .game-meta {
            display: flex;
            justify-content: space-between;
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 1rem;
            font-weight: 500;
        }

        .genre-tag {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(90deg, rgba(79, 172, 254, 0.2), rgba(0, 242, 254, 0.1));
            color: var(--brand-cyan);
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: auto;
            border: 1px solid rgba(0, 242, 254, 0.2);
            align-self: flex-start;
        }

        /* Status / Loader messages */
        .status-msg {
            grid-column: 1 / -1;
            text-align: center;
            padding: 4rem;
            font-size: 1.2rem;
            color: var(--text-muted);
            background: var(--bg-surface);
            border: 1px dashed var(--glass-border);
            border-radius: 16px;
        }

        .loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 242, 254, 0.1);
            border-left-color: var(--brand-cyan);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Modal / Game Details */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }

        .modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .modal-content {
            background: #0B0E14;
            border: 1px solid rgba(0, 242, 254, 0.3);
            width: 95%;
            max-width: 1100px;
            max-height: 90vh;
            border-radius: 24px;
            overflow-y: auto;
            position: relative;
            transform: translateY(50px) scale(0.95);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 30px 60px rgba(0,0,0,0.9), 0 0 50px rgba(0, 242, 254, 0.15);
        }

        .modal-overlay.active .modal-content {
            transform: translateY(0) scale(1);
        }

        .close-btn {
            position: absolute;
            top: 25px;
            right: 25px;
            width: 45px;
            height: 45px;
            background: rgba(0,0,0,0.6);
            border: 1px solid var(--glass-border);
            color: white;
            font-size: 1.8rem;
            border-radius: 50%;
            cursor: pointer;
            z-index: 20;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
        }

        .close-btn:hover {
            background: var(--brand-cyan);
            color: #000;
            transform: rotate(90deg) scale(1.1);
            border-color: var(--brand-cyan);
            box-shadow: 0 0 20px rgba(0, 242, 254, 0.5);
        }

        /* Modal interior */
        .modal-hero {
            width: 100%;
            height: 400px;
            position: relative;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .modal-hero img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .modal-hero::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; width: 100%; height: 50%;
            background: linear-gradient(0deg, #0B0E14 0%, transparent 100%);
        }

        .modal-body {
            padding: 3rem 4rem 4rem 4rem;
        }

        .modal-title-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: -80px;
            position: relative;
            z-index: 2;
            margin-bottom: 2.5rem;
        }

        .modal-title {
            font-family: 'Rajdhani', sans-serif;
            font-size: 3.5rem;
            font-weight: 700;
            color: white;
            text-shadow: 0 4px 20px rgba(0,0,0,0.9);
            line-height: 1.1;
            max-width: 75%;
        }

        .modal-score {
            font-size: 2.5rem;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 700;
            color: var(--brand-cyan);
            background: rgba(11, 14, 20, 0.8);
            padding: 0.8rem 1.5rem;
            border-radius: 16px;
            border: 2px solid var(--brand-cyan);
            backdrop-filter: blur(15px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 25px rgba(0, 242, 254, 0.2);
            text-align: center;
        }

        .modal-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 4rem;
        }

        .modal-desc {
            color: var(--text-muted);
            line-height: 1.8;
            font-size: 1.1rem;
            background: rgba(255,255,255,0.02);
            padding: 1.5rem;
            border-radius: 12px;
            border-left: 4px solid var(--brand-purple);
        }

        .modal-details-list {
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
        }

        .detail-item {
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .detail-item:last-child {
            margin-bottom: 0; padding-bottom: 0; border-bottom: none;
        }

        .detail-label {
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.3rem;
        }

        .detail-value {
            font-size: 1rem;
            color: white;
            font-weight: 500;
        }

        .media-gallery {
            margin-top: 2rem;
            display: flex;
            gap: 1.5rem;
            overflow-x: auto;
            padding-bottom: 1.5rem;
            scrollbar-width: thin;
            scrollbar-color: var(--brand-cyan) var(--bg-deep);
        }

        .media-gallery::-webkit-scrollbar {
            height: 8px;
        }
        .media-gallery::-webkit-scrollbar-track {
            background: var(--bg-deep);
            border-radius: 4px;
        }
        .media-gallery::-webkit-scrollbar-thumb {
            background: var(--brand-cyan);
            border-radius: 4px;
        }

        .media-gallery img {
            height: 160px;
            border-radius: 12px;
            border: 2px solid transparent;
            transition: all 0.3s;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }

        .media-gallery img:hover {
            transform: scale(1.05) translateY(-5px);
            border-color: var(--brand-cyan);
            box-shadow: 0 10px 25px rgba(0, 242, 254, 0.3);
        }

        .back-hub {
            position: absolute;
            top: 2rem;
            left: 2rem;
            color: var(--text-muted);
            text-decoration: none;
            font-weight: 500;
            z-index: 50;
            padding: 0.5rem 1rem;
            background: var(--bg-surface);
            backdrop-filter: blur(10px);
            border-radius: 8px;
            border: 1px solid var(--glass-border);
            transition: all 0.3s;
        }

        .back-hub:hover {
            color: white;
            border-color: var(--brand-cyan);
            box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
        }

        @media (max-width: 768px) {
            .search-box { flex-direction: column; }
            button.primary-btn { padding: 1rem; }
            .modal-grid { grid-template-columns: 1fr; }
            .modal-title-row { flex-direction: column; align-items: flex-start; gap: 1rem; margin-top: -40px; }
        }
    </style>
</head>
<body>

    <div class="cyber-grid"></div>

    <a href="../index.php" class="back-hub">← Volver al Hub Principal</a>

    <div class="container">
        <header>
            <h1>Nexus Data <span>Core</span></h1>
            <p class="subtitle">Accede a una base de datos cuántica con más de 775,000 archivos de simulación (videojuegos). Impulsado por la API de GameBrain.</p>
        </header>

        <main>
            <div class="controls-wrapper">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Ingresa el nombre del juego (Ej. Portal 2, Skyrim, Halo)...">
                    <button class="primary-btn" id="searchButton">Iniciar Búsqueda</button>
                </div>
                
                <div class="filters-group">
                    <select id="sortBy">
                        <option value="">Ordenar por (Defecto)</option>
                        <option value="rating">Mejor Calificados</option>
                        <option value="release_date">Más Recientes</option>
                        <option value="popularity">Más Populares</option>
                    </select>
                    
                    <select id="platform">
                        <option value="">Todas las Plataformas</option>
                        <option value="pc">PC (Windows)</option>
                        <option value="playstation">PlayStation</option>
                        <option value="xbox">Xbox</option>
                        <option value="nintendo">Nintendo</option>
                        <option value="mobile">Móvil</option>
                    </select>
                    
                    <select id="genre">
                        <option value="">Todos los Géneros</option>
                        <option value="action">Acción</option>
                        <option value="adventure">Aventura</option>
                        <option value="rpg">Rol / RPG</option>
                        <option value="strategy">Estrategia</option>
                        <option value="fps">First Person Shooter</option>
                        <option value="sports">Deportes</option>
                    </select>
                </div>
            </div>

            <div id="results">
                <div class="status-msg">
                    Inicia una búsqueda utilizando los controles superiores para acceder a los archivos de Nexus.
                </div>
            </div>
        </main>
    </div>

    <!-- Modal para Detalles del Juego -->
    <div class="modal-overlay" id="gameModal">
        <div class="modal-content">
            <button class="close-btn" id="closeModal">&times;</button>
            <div id="modalContent">
                <!-- Data will be injected here via JS -->
            </div>
        </div>
    </div>

    <script>
        // CRITICAL: The API Key provided by the user via the tutorial specs
        const API_KEY = '324fac31d9dc465097b3bd28840541a4';
        const API_BASE_URL = 'https://api.gamebrain.co/v1';
        
        // DOM Elements
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const resultsDiv = document.getElementById('results');
        
        const modal = document.getElementById('gameModal');
        const modalContent = document.getElementById('modalContent');
        const closeBtn = document.getElementById('closeModal');
        
        const sortByEl = document.getElementById('sortBy');
        const platformEl = document.getElementById('platform');
        const genreEl = document.getElementById('genre');

        // Events
        searchButton.addEventListener('click', searchGames);
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchGames();
        });

        // Trigger search instantly if filters change
        sortByEl.addEventListener('change', () => { if(searchInput.value.trim() !== '') searchGames() });
        platformEl.addEventListener('change', () => { if(searchInput.value.trim() !== '') searchGames() });
        genreEl.addEventListener('change', () => { if(searchInput.value.trim() !== '') searchGames() });
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        function buildSearchURL(query) {
            const params = new URLSearchParams();
            params.append('query', query);
            
            if (sortByEl.value) params.append('sort', sortByEl.value);
            if (platformEl.value) params.append('platform', platformEl.value);
            if (genreEl.value) params.append('genre', genreEl.value);
            
            params.append('limit', '20');
            return `${API_BASE_URL}/games?${params.toString()}`;
        }

        async function searchGames() {
            const query = searchInput.value.trim();
            
            if (!query) {
                resultsDiv.innerHTML = '<div class="status-msg" style="color:#ff3366;">Error: Debes ingresar un término de búsqueda para consultar el sistema.</div>';
                return;
            }
            
            resultsDiv.innerHTML = `
                <div class="status-msg">
                    <div class="loading-spinner"></div>
                    <br/>
                    Accediendo a la red cuántica... Buscando coincidencias para "${query}".
                </div>`;
            
            const url = buildSearchURL(query);
            
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                
                const data = await response.json();
                displayGames(data);
                
            } catch (error) {
                console.error(error);
                resultsDiv.innerHTML = `
                    <div class="status-msg" style="color:#ff3366;">
                        <strong>Fallo Crítico del Sistema:</strong> No se pudo conectar a GameBrain API.<br/>
                        <em>Motivo: ${error.message}</em><br/>
                        Verifica tu conexión o la validez de la clave API.
                    </div>`;
            }
        }

        function displayGames(data) {
            resultsDiv.innerHTML = '';
            
            if (!data.results || data.results.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="status-msg" style="color: var(--warning);">
                        No se encontraron registros en el archivo Nexus para tu búsqueda. Intenta con otros parámetros.
                    </div>`;
                return;
            }
            
            data.results.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';
                gameCard.onclick = () => showGameDetails(game.id);
                
                const imageUrl = game.image || 'https://via.placeholder.com/600x400/0f1423/00f2fe?text=IMAGEN+NO+DISPONIBLE';
                const score = game.rating && game.rating.mean ? (game.rating.mean * 10).toFixed(1) : '—';
                
                gameCard.innerHTML = `
                    <div class="game-img-container">
                        <img src="${imageUrl}" alt="${game.name}" class="game-img" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/0f1423/00f2fe?text=IMAGEN+NO+DISPONIBLE'">
                        <div class="score-badge">${score}</div>
                    </div>
                    <div class="game-info">
                        <div class="game-title" title="${game.name}">${game.name}</div>
                        <div class="game-meta">
                            <span><span style="color:var(--brand-cyan);">📅</span> ${game.year || 'TBA'}</span>
                            <span><span style="color:var(--brand-purple);">💬</span> ${game.rating && game.rating.count ? game.rating.count.toLocaleString() : '0'}</span>
                        </div>
                        <span class="genre-tag">${game.genre || 'Clasificado'}</span>
                    </div>
                `;
                
                resultsDiv.appendChild(gameCard);
            });
        }

        async function showGameDetails(gameId) {
            if (!gameId) return;
            
            modalContent.innerHTML = `
                <div style="padding: 100px; text-align: center;">
                    <div class="loading-spinner"></div>
                    <p style="color: var(--brand-cyan); font-family: 'Rajdhani', sans-serif; font-size: 1.2rem;">Desencriptando de archivo profundo...</p>
                </div>
            `;
            modal.classList.add('active');
            
            try {
                const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const game = await response.json();
                renderGameModal(game);
                
            } catch (error) {
                console.error(error);
                modalContent.innerHTML = `
                    <div style="padding: 100px; text-align: center; color: #ff3366;">
                        <h3>Error de Extracción de Datos</h3>
                        <p>No se pudo cargar la información detallada.</p>
                    </div>`;
            }
        }

        function renderGameModal(game) {
            const imageUrl = game.image || 'https://via.placeholder.com/1600x600/0f1423/00f2fe?text=ARCHIVO+CORRUPTO';
            const score = game.rating && game.rating.mean ? (game.rating.mean * 10).toFixed(1) : '0';
            const reviewCount = game.rating && game.rating.count ? game.rating.count.toLocaleString() : 'N/A';
            const description = game.short_description || game.description || 'Sin archivo de texto inteligible recuperado de los bancos de datos.';
            
            const platforms = game.platforms && game.platforms.length > 0 
                ? game.platforms.map(p => p.name).join(', ') 
                : 'Múltiple/Desconocido';
                
            let screenshotsHtml = '';
            if (game.screenshots && game.screenshots.length > 0) {
                screenshotsHtml = `
                    <h4 style="margin-top: 3rem; margin-bottom: 1rem; color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; letter-spacing: 1px;">Archivos Visuales Detectados</h4>
                    <div class="media-gallery">
                        ${game.screenshots.slice(0, 8).map(src => `<img src="${src}" alt="Screenshot" loading="lazy">`).join('')}
                    </div>
                `;
            }
            
            let videoHtml = '';
            if (game.gameplay || game.micro_trailer) {
                const videoSrc = game.gameplay || game.micro_trailer;
                videoHtml = `
                    <h4 style="margin-top: 3rem; margin-bottom: 1rem; color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; letter-spacing: 1px;">Transmisión Encriptada (Video)</h4>
                    <iframe src="${videoSrc}" width="100%" height="400" frameborder="0" allowfullscreen style="border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></iframe>
                `;
            }

            modalContent.innerHTML = `
                <div class="modal-hero">
                    <img src="${imageUrl}" alt="${game.name}" onerror="this.src='https://via.placeholder.com/1600x600/0f1423/00f2fe?text=ARCHIVO+CORRUPTO'">
                </div>
                
                <div class="modal-body">
                    <div class="modal-title-row">
                        <div class="modal-title">${game.name}</div>
                        <div class="modal-score">${score} <span style="font-size:0.4em; color: var(--text-muted); font-weight: 500; display:block; margin-top: -5px;">Puntaje Global</span></div>
                    </div>
                    
                    <div class="modal-grid">
                        <div class="modal-main-info">
                            <h4 style="margin-bottom: 1rem; color: var(--brand-cyan); font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; letter-spacing: 1px;">Sinopsis Misión</h4>
                            <div class="modal-desc">${description.replace(/"/g, '')}</div>
                            
                            ${screenshotsHtml}
                            ${videoHtml}
                        </div>
                        
                        <div class="modal-side-info">
                            <h4 style="margin-bottom: 1rem; color: var(--brand-cyan); font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; letter-spacing: 1px;">Datos Técnicos</h4>
                            <div class="modal-details-list">
                                <div class="detail-item">
                                    <div class="detail-label">Desarrollador / Fabricante</div>
                                    <div class="detail-value">${game.developer || 'Registros Dañados'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Salida Inicial</div>
                                    <div class="detail-value">${game.release_date || game.year || 'Clasificado'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Entornos Compatibles</div>
                                    <div class="detail-value">${platforms}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Clasificación Sub-Rutina</div>
                                    <div class="detail-value">${game.genre || 'Desconocida'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Frecuencia de Operadores</div>
                                    <div class="detail-value">${reviewCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function closeModal() {
            modal.classList.remove('active');
            // Stop any playing iframe video
            const iframe = modal.querySelector('iframe');
            if(iframe) iframe.src = '';
        }
    </script>
</body>
</html>
