<?php
/**
 * Global Dispatch (World News API Consumer)
 * Theme: Premium Editorial / Minimalist
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Global Dispatch | Premium News Reader</title>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-page: #ffffff;
            --bg-card: #ffffff;
            --text-primary: #000000;
            --text-secondary: #333333;
            --accent-color: #E22028; /* NY Post Red */
            --border-color: #000000;
            --shadow-subtle: none;
            --shadow-hover: 0 4px 15px rgba(0,0,0,0.15);
            
            --font-headline: 'Oswald', sans-serif;
            --font-serif: 'Playfair Display', serif;
            --font-body: 'Inter', sans-serif;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-body);
            background-color: var(--bg-page);
            color: var(--text-primary);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }

        /* Top Navigation / Brand */
        header {
            border-bottom: 4px solid var(--border-color);
            padding: 1.5rem 0;
            text-align: center;
            background: #fff;
            position: relative;
        }

        .brand-name {
            font-family: var(--font-serif);
            font-size: clamp(3rem, 6vw, 5rem);
            font-weight: 900;
            letter-spacing: -2px;
            color: var(--text-primary);
            text-transform: uppercase;
            line-height: 1;
        }

        .brand-tagline {
            font-family: var(--font-headline);
            text-transform: uppercase;
            font-size: 1rem;
            letter-spacing: 1px;
            color: #fff;
            background-color: var(--accent-color);
            display: inline-block;
            padding: 0.3rem 1rem;
            margin-top: 0.5rem;
            font-weight: 700;
        }

        .back-hub {
            position: absolute;
            top: 50%;
            left: 2rem;
            transform: translateY(-50%);
            font-family: var(--font-headline);
            font-size: 1rem;
            text-transform: uppercase;
            color: var(--text-primary);
            text-decoration: none;
            transition: color 0.3s;
            font-weight: 700;
        }

        .back-hub:hover {
            color: var(--accent-color);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        /* Search Interface */
        .extractor-interface {
            max-width: 800px;
            margin: 0 auto 3rem auto;
            text-align: center;
            background: #f4f4f4;
            padding: 1.5rem;
            border: 2px solid var(--border-color);
        }

        .extractor-title {
            font-family: var(--font-headline);
            font-size: 1.8rem;
            text-transform: uppercase;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }

        .search-wrapper {
            display: flex;
            border: 2px solid var(--border-color);
            background: #fff;
        }

        .url-input {
            flex: 1;
            border: none;
            padding: 1rem 1.2rem;
            font-size: 1.1rem;
            font-family: var(--font-body);
            color: var(--text-primary);
            outline: none;
            font-weight: 600;
        }

        .extract-btn {
            background: var(--accent-color);
            color: #fff;
            border: none;
            border-left: 2px solid var(--border-color);
            padding: 0 2rem;
            font-family: var(--font-headline);
            font-weight: 700;
            font-size: 1.2rem;
            cursor: pointer;
            text-transform: uppercase;
            transition: background 0.2s;
        }

        .extract-btn:hover {
            background: #000;
            color: #fff;
        }

        /* Editorial Layout (Portal) */
        .portal-layout {
            display: grid;
            grid-template-columns: 2.5fr 1fr;
            gap: 2rem;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 4px solid var(--border-color);
        }

        .hero-article {
            cursor: pointer;
        }

        .hero-img-container {
            width: 100%;
            height: 500px;
            overflow: hidden;
            margin-bottom: 1rem;
            border: 2px solid var(--border-color);
        }

        .hero-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .hero-article:hover .hero-img {
            transform: scale(1.02);
        }

        .hero-title {
            font-family: var(--font-headline);
            font-size: 4.5rem;
            line-height: 1;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
            text-transform: uppercase;
            transition: color 0.2s;
            letter-spacing: -1px;
        }

        .hero-article:hover .hero-title {
            color: var(--accent-color);
        }

        .article-meta-small {
            font-family: var(--font-body);
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 0.2rem 0.6rem;
        }

        /* Sidebar: Latest News */
        .sidebar {
            border-left: 2px solid var(--border-color);
            padding-left: 2rem;
        }

        .sidebar-title {
            font-family: var(--font-headline);
            font-size: 2.5rem;
            text-transform: uppercase;
            color: var(--accent-color);
            margin-bottom: 1.5rem;
            line-height: 1;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 0.5rem;
        }

        .sidebar-list {
            display: flex;
            flex-direction: column;
        }

        .sidebar-item {
            display: flex;
            flex-direction: column;
            cursor: pointer;
            border-bottom: 1px solid #ccc;
            padding: 1.5rem 0;
        }

        .sidebar-item:first-child {
            padding-top: 0;
        }

        .sidebar-item:last-child {
            border-bottom: none;
        }

        .sidebar-item-title {
            font-family: var(--font-headline);
            font-size: 1.8rem;
            line-height: 1.1;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
        }

        .sidebar-item:hover .sidebar-item-title {
            color: var(--accent-color);
        }

        /* Main Masonry Grid for News Links */
        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 2rem;
        }

        .news-card {
            display: flex;
            flex-direction: column;
            cursor: pointer;
        }

        .news-card .card-img {
            width: 100%;
            height: 220px;
            object-fit: cover;
            margin-bottom: 0.8rem;
            border: 2px solid var(--border-color);
        }

        .news-card:hover .card-img {
            border-color: var(--accent-color);
        }

        .card-domain {
            font-size: 0.8rem;
            text-transform: uppercase;
            color: #fff;
            background: var(--text-primary);
            padding: 0.2rem 0.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            display: inline-block;
            align-self: flex-start;
        }

        .card-title {
            font-family: var(--font-headline);
            font-size: 1.8rem;
            line-height: 1.1;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
        }

        .news-card:hover .card-title {
            color: var(--accent-color);
        }

        .card-date {
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-weight: 700;
            margin-top: auto;
        }

        /* Status & Loaders */
        .status-message {
            text-align: center;
            padding: 3rem;
            font-family: var(--font-serif);
            font-size: 1.5rem;
            color: var(--text-secondary);
            font-style: italic;
            grid-column: 1 / -1;
        }

        .loader {
            width: 48px;
            height: 48px;
            border: 3px solid var(--border-color);
            border-bottom-color: var(--accent-color);
            border-radius: 50%;
            display: inline-block;
            box-sizing: border-box;
            animation: rotation 1s linear infinite;
            margin-bottom: 1.5rem;
        }

        @keyframes rotation {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Premium Reader Modal */
        .reader-modal {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: var(--bg-page);
            z-index: 1000;
            overflow-y: auto;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease;
        }

        .reader-modal.active {
            opacity: 1;
            pointer-events: auto;
        }

        .reader-header {
            position: sticky;
            top: 0;
            background: #fff;
            border-bottom: 4px solid var(--border-color);
            padding: 1rem 2rem;
            display: flex;
            justify-content: flex-end;
            z-index: 10;
        }

        .close-reader {
            background: var(--text-primary);
            border: none;
            padding: 0.5rem 1rem;
            font-family: var(--font-headline);
            font-size: 1.2rem;
            color: #fff;
            text-transform: uppercase;
            cursor: pointer;
            transition: background 0.2s;
        }

        .close-reader:hover {
            background: var(--accent-color);
        }

        .reader-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 4rem 2rem 8rem 2rem;
        }

        .article-title {
            font-family: var(--font-headline);
            font-size: clamp(3rem, 5vw, 4.5rem);
            line-height: 1.1;
            color: var(--text-primary);
            margin-bottom: 1rem;
            text-transform: uppercase;
        }

        .article-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
            font-family: var(--font-body);
            font-size: 0.95rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
            border-top: 2px solid var(--border-color);
            border-bottom: 2px solid var(--border-color);
            padding: 0.8rem 0;
            font-weight: 700;
        }

        .meta-item {
            text-transform: uppercase;
        }

        .meta-item span {
            color: var(--accent-color);
            margin-left: 0.3rem;
        }

        .article-hero-img {
            width: 100%;
            height: auto;
            max-height: 500px;
            object-fit: cover;
            margin-bottom: 3rem;
            border-radius: 4px;
        }

        .article-body {
            font-family: var(--font-serif);
            font-size: 1.25rem;
            line-height: 1.8;
            color: #2A2A2A;
            white-space: pre-line; /* Respects line breaks from API text */
        }
        
        /* Dropcap effect for first letter of article */
        .article-body::first-letter {
            font-size: 4.5rem;
            float: left;
            line-height: 1;
            margin-right: 0.8rem;
            margin-top: 0.4rem;
            color: var(--accent-color);
            font-weight: 700;
        }

        /* Top News Section */
        .section-title {
            font-family: var(--font-headline);
            font-size: 2.5rem;
            margin-bottom: 2rem;
            color: var(--text-primary);
            border-bottom: 4px solid var(--border-color);
            padding-bottom: 0.5rem;
            display: inline-block;
            text-transform: uppercase;
        }

        .controls-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .country-select {
            padding: 0.6rem 1rem;
            font-family: var(--font-headline);
            font-size: 1.2rem;
            border: 2px solid var(--border-color);
            background: #fff;
            color: var(--text-primary);
            outline: none;
            cursor: pointer;
            text-transform: uppercase;
            font-weight: 700;
        }
    </style>
</head>
<body>

    <header>
        <a href="../index.php" class="back-hub">← Edición Central</a>
        <div class="brand-name">Global Dispatch.</div>
        <div class="brand-tagline">Inteligencia y Noticias Mundiales en Tiempo Real</div>
    </header>

    <div class="container">
        
        <div class="extractor-interface">
            <h2 class="extractor-title" style="font-size: 1.5rem; margin-bottom: 1rem;">O extrae artículos de un enlace específico:</h2>
            <div class="search-wrapper">
                <input type="url" id="sourceUrl" class="url-input" placeholder="Ej: https://www.elmundo.es, https://www.bbc.com/mundo">
                <button id="extractLinksBtn" class="extract-btn">Extraer</button>
            </div>
        </div>

        <div class="controls-bar">
            <h2 class="section-title" id="mainTitle">PORTADA MUNDIAL</h2>
            <select id="countrySelect" class="country-select">
                <option value="us">Global / EE.UU. (EN)</option>
                <option value="es">España (ES)</option>
                <option value="mx">México (MX)</option>
                <option value="ar">Argentina (AR)</option>
                <option value="co">Colombia (CO)</option>
                <option value="cl">Chile (CL)</option>
            </select>
        </div>

        <div id="dynamicContainer">
            <!-- Portal layout goes here -->
        </div>

    </div>

    <!-- Reader Modal -->
    <div id="readerModal" class="reader-modal">
        <div class="reader-header">
            <button id="closeReaderBtn" class="close-reader">Cerrar Artículo ✕</button>
        </div>
        <div id="readerContent" class="reader-content">
            <!-- Article content will be injected here -->
        </div>
    </div>

    <script>
        // API Configuration
        const API_KEY = '2d7ad9e84a75405cbbc9a74c4a1f3884';
        const API_BASE = 'https://api.worldnewsapi.com';

        // DOM Elements
        const inputUrl = document.getElementById('sourceUrl');
        const extractLinksBtn = document.getElementById('extractLinksBtn');
        const dynamicContainer = document.getElementById('dynamicContainer');
        const countrySelect = document.getElementById('countrySelect');
        const mainTitle = document.getElementById('mainTitle');
        
        const readerModal = document.getElementById('readerModal');
        const readerContent = document.getElementById('readerContent');
        const closeReaderBtn = document.getElementById('closeReaderBtn');

        // Initial Load
        document.addEventListener('DOMContentLoaded', () => {
            fetchTopNews('us', 'en'); // Default to US / English for international relevance
        });

        countrySelect.addEventListener('change', (e) => {
            const country = e.target.value;
            const lang = country === 'us' ? 'en' : 'es';
            fetchTopNews(country, lang);
        });

        // URL Extractor Events
        extractLinksBtn.addEventListener('click', () => {
            const url = inputUrl.value.trim();
            if (url) fetchNewsLinks(url);
        });

        inputUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = inputUrl.value.trim();
                if (url) fetchNewsLinks(url);
            }
        });

        closeReaderBtn.addEventListener('click', () => {
            readerModal.classList.remove('active');
            document.body.style.overflow = 'auto'; // Restore scroll
        });

        // Utilities
        function extractDomain(url) {
            try {
                const { hostname } = new URL(url);
                return hostname.replace('www.', '');
            } catch (e) {
                return 'Fuente Desconocida';
            }
        }

        // --- TOP NEWS FEATURE ---
        async function fetchTopNews(countryCode, languageCode) {
            mainTitle.innerText = `La Portada (${countryCode.toUpperCase()})`;
            dynamicContainer.innerHTML = `<div class="status-message"><div class="loader"></div><br>Compilando la portada del día...</div>`;

            try {
                const apiUrl = `${API_BASE}/top-news?source-country=${countryCode}&language=${languageCode}`;
                const response = await fetch(apiUrl, { headers: { 'x-api-key': API_KEY } });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                
                if (!data.top_news || data.top_news.length === 0) {
                    throw new Error("No hay noticias destacadas disponibles en este momento para esta región.");
                }

                renderTopNewsPortal(data.top_news);

            } catch (error) {
                console.error(error);
                dynamicContainer.innerHTML = `
                    <div class="error-state">
                        <h3>Error de Conexión</h3>
                        <p>${error.message}</p>
                    </div>`;
            }
        }

        function formatTimeAgo(dateString) {
            const date = new Date(dateString || Date.now());
            const now = new Date();
            const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
            
            if (diffInHours < 1) return "Último Minuto";
            if (diffInHours === 1) return `Hace 1 hora`;
            if (diffInHours < 24) return `Hace ${diffInHours} horas`;
            return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        }

        function renderTopNewsPortal(clusters) {
            dynamicContainer.innerHTML = '';
            
            // 1. Flatten articles and sort by newest
            let allArticles = [];
            clusters.forEach(cluster => {
                if (cluster.news && cluster.news.length > 0) {
                    allArticles.push(cluster.news[0]);
                }
            });

            allArticles.sort((a, b) => new Date(b.publish_date || 0) - new Date(a.publish_date || 0));

            if (allArticles.length === 0) return;

            // 2. Slice for layout
            const hero = allArticles[0];
            const latest = allArticles.slice(1, 6); // Next 5 for sidebar
            const grid = allArticles.slice(6, 18);  // Rest for the bottom grid

            let htmlArr = [];

            // 3. Build Portal Header (Hero + Sidebar)
            htmlArr.push(`<div class="portal-layout">`);
            
            // HERO
            const heroDomain = extractDomain(hero.url);
            const heroImg = hero.image ? `<img src="${hero.image}" class="hero-img" onerror="this.style.display='none'">` : '';
            htmlArr.push(`
                <div class="hero-article" onclick='triggerRenderArticle(${JSON.stringify(hero).replace(/'/g, "&#39;")})'>
                    <div class="hero-img-container">${heroImg}</div>
                    <div class="article-meta-small">${heroDomain} &middot; ${formatTimeAgo(hero.publish_date)}</div>
                    <h2 class="hero-title">${hero.title}</h2>
                    <p class="hero-excerpt">${hero.summary || hero.text ? (hero.summary || hero.text).substring(0, 180) + '...' : ''}</p>
                </div>
            `);

            // SIDEBAR
            htmlArr.push(`
                <div class="sidebar">
                    <h3 class="sidebar-title">De Último Minuto</h3>
                    <div class="sidebar-list">
            `);

            latest.forEach(item => {
                const domain = extractDomain(item.url);
                htmlArr.push(`
                    <div class="sidebar-item" onclick='triggerRenderArticle(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
                        <div class="article-meta-small" style="margin-bottom: 0.3rem; color: var(--accent-color);">${formatTimeAgo(item.publish_date)} &middot; ${domain}</div>
                        <div class="sidebar-item-title">${item.title}</div>
                    </div>
                `);
            });

            htmlArr.push(`</div></div></div>`);

            // 4. Build standard Grid
            if (grid.length > 0) {
                htmlArr.push(`<div class="news-grid">`);
                grid.forEach(item => {
                    const domain = extractDomain(item.url);
                    const img = item.image ? `<img src="${item.image}" class="card-img" onerror="this.style.display='none'">` : '';
                    htmlArr.push(`
                        <div class="news-card" onclick='triggerRenderArticle(${JSON.stringify(item).replace(/'/g, "&#39;")})'>
                            ${img}
                            <div class="card-domain">${domain}</div>
                            <div class="card-title">${item.title}</div>
                            <div class="card-date">${formatTimeAgo(item.publish_date)}</div>
                        </div>
                    `);
                });
                htmlArr.push(`</div>`);
            }

            dynamicContainer.innerHTML = htmlArr.join('');
        }

        // Helper to trigger article render from inline onclicks
        function triggerRenderArticle(articleStr) {
            renderArticle(articleStr);
        }

        // --- URL EXTRACTOR FEATURE (Fallback) ---
        async function fetchNewsLinks(targetUrl) {
            mainTitle.innerText = `Resultados de Extracción: ${extractDomain(targetUrl)}`;
            dynamicContainer.innerHTML = `<div class="status-message"><div class="loader"></div><br>Analizando dominio web...</div>`;

            try {
                const apiUrl = `${API_BASE}/extract-news-links?url=${encodeURIComponent(targetUrl)}`;
                const response = await fetch(apiUrl, { headers: { 'x-api-key': API_KEY } });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                if (!data.news_links || data.news_links.length === 0) throw new Error("No se detectaron enlaces periodísticos en esta web.");

                renderLinksGrid(data.news_links, targetUrl);
            } catch (error) {
                dynamicContainer.innerHTML = `<div class="error-state"><h3>Error</h3><p>${error.message}</p></div>`;
            }
        }

        function renderLinksGrid(linksArray, sourceUrl) {
            dynamicContainer.innerHTML = '<div class="news-grid" id="secondaryGrid"></div>';
            const grid = document.getElementById('secondaryGrid');
            const domain = extractDomain(sourceUrl);

            linksArray.slice(0, 15).forEach(linkUrl => {
                let readableTitle = "Leer Noticia Extraída";
                try {
                    const urlObj = new URL(linkUrl);
                    const segments = urlObj.pathname.split('/').filter(p => p.length > 0);
                    if (segments.length > 0) readableTitle = segments[segments.length - 1].replace(/-/g, ' ').replace(/\.html|\.php/g, '');
                } catch(e) {}

                if(readableTitle.length > 80 || readableTitle.length < 5) readableTitle = "Reporte Especial: " + domain;

                const card = document.createElement('div');
                card.className = 'news-card';
                card.onclick = () => extractFullArticle(linkUrl);

                card.innerHTML = `
                    <div class="card-domain" style="margin-top: 1.5rem;">${domain}</div>
                    <div class="card-title">${readableTitle}</div>
                    <div class="card-date" style="word-break: break-all; margin-top: 1rem;">${linkUrl}</div>
                `;
                grid.appendChild(card);
            });
        }

        // --- DEEP ARTICLE FETCH (From Links) ---
        async function extractFullArticle(articleUrl) {
            document.body.style.overflow = 'hidden'; 
            readerModal.classList.add('active');
            
            readerContent.innerHTML = `
                <div style="text-align: center; margin-top: 20vh;">
                    <div class="loader"></div>
                    <p style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--text-secondary); font-style: italic;">
                        Extrayendo texto de la fuente en tiempo real...
                    </p>
                </div>`;

            try {
                const apiUrl = `${API_BASE}/extract-news?url=${encodeURIComponent(articleUrl)}&analyze=false`;
                const response = await fetch(apiUrl, { headers: { 'x-api-key': API_KEY } });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const article = await response.json();
                renderArticle(article);
            } catch (error) {
                readerContent.innerHTML = `<div class="error-state" style="margin-top: 10vh;"><h3>Error en Lectura</h3><p>${error.message}</p></div>`;
            }
        }

        // --- RENDER MODAL ---
        function renderArticle(article) {
            document.body.style.overflow = 'hidden'; 
            readerModal.classList.add('active');

            const title = article.title || 'Reporte de Noticias Sin Título';
            const text = article.text || article.summary || 'El contenido completo no pudo ser parseado o la nota es muy corta.';
            
            let pubDate = 'FECHA DESCONOCIDA';
            if (article.publish_date) {
                pubDate = new Date(article.publish_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            }

            let authors = 'Redacción';
            if (article.author) authors = article.author;
            else if (article.authors && article.authors.length > 0) authors = article.authors.join(', ');

            let imageHtml = '';
            if (article.image) {
                imageHtml = `<img src="${article.image}" alt="Imagen de portada" class="article-hero-img" onerror="this.style.display='none'">`;
            }

            let videoHtml = '';
            if(article.video) {
                videoHtml = `<div style="margin-bottom: 2rem;"><video controls style="width:100%; max-height: 500px; background: #000; border-radius: 4px;"><source src="${article.video}" type="video/mp4">Tu navegador no soporta videos.</video></div>`;
            }

            readerContent.innerHTML = `
                <h1 class="article-title">${title}</h1>
                
                <div class="article-meta">
                    <div class="meta-item">Por <span>${authors}</span></div>
                    <div class="meta-item">Publicado <span>${pubDate}</span></div>
                    ${article.language ? `<div class="meta-item">Idioma <span>${article.language.toUpperCase()}</span></div>` : ''}
                </div>

                ${videoHtml || imageHtml}

                <div class="article-body">
                    ${text}
                </div>
                
                ${article.url ? `<p style="margin-top: 4rem; text-align: center; font-family: var(--font-sans); font-size: 0.9rem;"><a href="${article.url}" target="_blank" style="color: var(--accent-color);">Ver enlace original en sitio externo</a></p>` : ''}
            `;
            readerModal.scrollTop = 0;
        }

    </script>
</body>
</html>
