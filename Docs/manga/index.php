<?php
/**
 * KamiReader (Manga Web App)
 * Architecture: AniList (GraphQL) + MangaDex (REST) + MangaDex AtHome (Images)
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KamiReader | Otaku Midnight</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #09090b;
            --bg-surface: #18181b;
            --bg-elevated: #27272a;
            
            --text-primary: #f4f4f5;
            --text-secondary: #a1a1aa;
            
            --accent-purple: #8b5cf6;
            --accent-purple-hover: #7c3aed;
            --accent-orange: #f97316;
            
            --font-main: 'Inter', sans-serif;
            
            --radius-md: 8px;
            --radius-lg: 12px;
            
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-main);
            background-color: var(--bg-base);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        /* Util Classes */
        .hidden { display: none !important; }
        .text-accent { color: var(--accent-purple); }

        /* APP LAYOUT */
        .app-container {
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        /* SIDEBAR (Persistent) */
        .sidebar {
            width: 250px;
            background: rgba(24, 24, 27, 0.8);
            border-right: 1px solid var(--bg-elevated);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            padding: 2rem 1.5rem;
            flex-shrink: 0;
            z-index: 50;
        }

        .brand-logo {
            font-size: 1.5rem;
            font-weight: 900;
            color: var(--text-primary);
            text-decoration: none;
            letter-spacing: -1px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 3rem;
        }
        
        .nav-menu {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex-grow: 1;
        }

        .nav-link {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.8rem 1rem;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: var(--radius-md);
            font-weight: 500;
            transition: var(--transition);
        }

        .nav-link:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.05);
        }

        .nav-link.active {
            color: var(--accent-purple);
            background: rgba(139, 92, 246, 0.1);
            font-weight: 700;
        }

        .user-widget {
            margin-top: auto;
            border-top: 1px solid var(--bg-elevated);
            padding-top: 1rem;
        }

        .login-btn {
            width: 100%;
            background: var(--text-primary);
            color: var(--bg-base);
            border: none;
            padding: 0.8rem;
            border-radius: var(--radius-md);
            font-weight: 700;
            cursor: pointer;
            transition: var(--transition);
        }

        .login-btn:hover {
            background: var(--accent-purple);
            color: white;
        }

        /* MOBILE BOTTOM NAV */
        .bottom-nav {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 70px;
            background: rgba(24, 24, 27, 0.9);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--bg-elevated);
            z-index: 1000;
            justify-content: space-around;
            align-items: center;
            padding: 0 1rem;
        }

        .bottom-nav-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.75rem;
            font-weight: 600;
            transition: var(--transition);
        }

        .bottom-nav-link .icon { font-size: 1.4rem; }
        .bottom-nav-link.active { color: var(--accent-purple); }

        /* MAIN CONTENT AREA */
        .main-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow-y: auto;
            position: relative;
        }

        /* HEADER */
        header {
            background-color: rgba(9, 9, 11, 0.8);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--bg-elevated);
            padding: 1rem 3rem;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 40;
        }

        .hub-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: var(--transition);
        }

        .hub-link:hover {
            color: var(--accent-orange);
        }

        /* MAIN CONTAINER (SPA Views) */
        main {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            min-height: calc(100vh - 80px);
        }

        /* --- SEARCH VIEW --- */
        #searchView {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            animation: fadeIn 0.4s ease;
        }

        .search-hero {
            text-align: center;
            margin-bottom: 3rem;
        }

        .search-hero h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 900;
            letter-spacing: -2px;
            margin-bottom: 1rem;
            line-height: 1.1;
        }

        .search-hero p {
            color: var(--text-secondary);
            font-size: 1.2rem;
            max-width: 600px;
        }

        .search-bar-container {
            width: 100%;
            max-width: 650px;
            display: flex;
            background: var(--bg-surface);
            border-radius: var(--radius-lg);
            border: 1px solid var(--bg-elevated);
            padding: 0.5rem;
            transition: var(--transition);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .search-bar-container:focus-within {
            border-color: var(--accent-purple);
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3), 0 10px 30px rgba(0,0,0,0.5);
        }

        .search-input {
            flex: 1;
            background: transparent;
            border: none;
            padding: 1rem 1.5rem;
            color: var(--text-primary);
            font-size: 1.1rem;
            outline: none;
            font-family: var(--font-main);
        }

        .search-input::placeholder { color: var(--text-secondary); }

        .search-btn {
            background: var(--accent-purple);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            padding: 0 2rem;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            transition: var(--transition);
        }

        .search-btn:hover { background: var(--accent-purple-hover); }

        /* Loader */
        .loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            margin-top: 3rem;
        }

        .loader {
            width: 40px;
            height: 40px;
            border: 4px solid var(--bg-elevated);
            border-top-color: var(--accent-purple);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        .loader-text {
            color: var(--text-secondary);
            font-size: 0.9rem;
            font-weight: 500;
        }

        /* Search Results Grid */
        .results-grid {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .manga-card {
            background: var(--bg-surface);
            border-radius: var(--radius-lg);
            overflow: hidden;
            cursor: pointer;
            border: 1px solid var(--bg-elevated);
            transition: var(--transition);
        }

        .manga-card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-purple);
            box-shadow: 0 10px 20px rgba(0,0,0,0.4);
        }

        .manga-cover-wrap {
            width: 100%;
            aspect-ratio: 2/3;
            overflow: hidden;
            position: relative;
        }

        .manga-cover {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }

        .manga-card:hover .manga-cover {
            transform: scale(1.05);
        }

        .manga-info { padding: 1rem; }

        .manga-title {
            font-weight: 700;
            font-size: 1.1rem;
            line-height: 1.3;
            margin-bottom: 0.5rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .manga-fmt {
            font-size: 0.75rem;
            color: var(--accent-orange);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Skeleton Loading */
        .skeleton {
            background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: var(--radius-md);
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .skeleton-card {
            background: var(--bg-surface);
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid var(--bg-elevated);
        }
        .skeleton-card .sk-cover { width: 100%; aspect-ratio: 2/3; }
        .skeleton-card .sk-info { padding: 1rem; }
        .skeleton-card .sk-tag { height: 14px; width: 60px; margin-bottom: 0.5rem; }
        .skeleton-card .sk-title { height: 20px; width: 80%; }

        /* Section headers */
        .section-header {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            margin-top: 3rem;
            margin-bottom: 1.5rem;
        }
        .section-header h2 {
            font-size: 1.5rem;
            font-weight: 900;
            color: var(--text-primary);
        }
        .section-header .accent-bar {
            width: 4px;
            height: 28px;
            border-radius: 2px;
            background: var(--accent-purple);
        }
        .section-header .badge {
            background: rgba(139, 92, 246, 0.15);
            color: var(--accent-purple);
            padding: 0.2rem 0.6rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        /* Latest Chapter Feed */
        .latest-feed {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }
        .latest-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: var(--bg-surface);
            border: 1px solid var(--bg-elevated);
            border-radius: var(--radius-md);
            padding: 0.8rem 1rem;
            cursor: pointer;
            transition: var(--transition);
        }
        .latest-item:hover {
            border-color: var(--accent-purple);
            background: rgba(139, 92, 246, 0.05);
            transform: translateX(4px);
        }
        .latest-item-cover {
            width: 50px;
            height: 70px;
            border-radius: 6px;
            object-fit: cover;
            flex-shrink: 0;
        }
        .latest-item-info { flex: 1; min-width: 0; }
        .latest-item-title {
            font-weight: 700;
            font-size: 0.95rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .latest-item-chapter {
            color: var(--accent-purple);
            font-size: 0.85rem;
            font-weight: 600;
        }
        .latest-item-time {
            color: var(--text-secondary);
            font-size: 0.75rem;
        }
        .latest-item-origin {
            font-size: 0.7rem;
            color: var(--accent-orange);
            font-weight: 700;
        }

        /* Rating badge */
        .rating-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            background: rgba(249, 115, 22, 0.15);
            color: var(--accent-orange);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        /* Filter selects */
        .filter-select {
            padding: 0.8rem 1rem;
            border-radius: 8px;
            border: 1px solid var(--bg-elevated);
            background: var(--bg-surface);
            color: var(--text-primary);
            font-family: var(--font-main);
            font-size: 0.9rem;
            cursor: pointer;
            outline: none;
            transition: var(--transition);
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23a1a1aa' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.8rem center;
            padding-right: 2.2rem;
        }
        .filter-select:focus { border-color: var(--accent-purple); }
        .filter-select:hover { border-color: rgba(139, 92, 246, 0.4); }

        /* --- DETAILS VIEW --- */
        #detailView { animation: fadeIn 0.4s ease; }

        .back-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-family: var(--font-main);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 2rem;
            transition: var(--transition);
        }

        .back-btn:hover { color: var(--text-primary); }

        .detail-hero {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 3rem;
            background: var(--bg-surface);
            border: 1px solid var(--bg-elevated);
            border-radius: var(--radius-lg);
            padding: 2rem;
            margin-bottom: 3rem;
        }

        .detail-cover {
            width: 100%;
            border-radius: var(--radius-md);
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }

        .detail-info h1 {
            font-size: 2.5rem;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 0.5rem;
        }

        .detail-sub {
            color: var(--text-secondary);
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
        }

        .detail-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }

        .tag {
            background: var(--bg-elevated);
            color: var(--text-primary);
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .detail-desc {
            color: var(--text-secondary);
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
        }

        /* Chapters Section */
        .chapters-section h2 {
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .chapter-controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .lang-select {
            background: var(--bg-surface);
            border: 1px solid var(--bg-elevated);
            color: var(--text-primary);
            padding: 0.8rem 1rem;
            border-radius: var(--radius-md);
            font-family: var(--font-main);
            outline: none;
            cursor: pointer;
        }

        .chapters-list {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }

        .chapter-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-surface);
            border: 1px solid var(--bg-elevated);
            padding: 1.2rem 1.5rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: var(--transition);
        }

        .chapter-item:hover {
            border-color: var(--accent-purple);
            background: rgba(139, 92, 246, 0.05);
        }

        .chapter-name {
            font-weight: 700;
            font-size: 1.1rem;
        }

        .chapter-meta {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .error-box {
            background: rgba(249, 115, 22, 0.1);
            border: 1px solid var(--accent-orange);
            color: var(--accent-orange);
            padding: 1rem;
            border-radius: var(--radius-md);
            text-align: center;
            margin-bottom: 1rem;
        }

        /* --- READER VIEW (Overlay) --- */
        #readerView {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: #000;
            z-index: 999;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            scroll-behavior: smooth;
        }

        .reader-header {
            width: 100%;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .reader-title {
            font-weight: 700;
            font-size: 1.2rem;
        }

        .close-reader-btn {
            background: #27272a;
            color: white;
            border: none;
            padding: 0.5rem 1.5rem;
            border-radius: var(--radius-md);
            font-weight: 700;
            cursor: pointer;
            transition: var(--transition);
            font-family: var(--font-main);
        }
        
        .close-reader-btn:hover { background: var(--accent-orange); }

        .pages-container {
            width: 100%;
            max-width: 800px; /* Standard manga scan width */
            display: flex;
            flex-direction: column;
            align-items: center;
            background: #000;
        }

        .manga-page {
            width: 100%;
            height: auto;
            display: block;
            margin: 0; /* Seamless vertical reading (Webtoon style) */
            min-height: 800px; /* prevent layout shifts */
            background: #111; /* skeleton loading color */
        }

        /* --- MODALS (Auth/Loading) --- */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }

        .auth-modal {
            background: var(--bg-surface);
            border: 1px solid var(--bg-elevated);
            padding: 3rem;
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }

        .auth-modal h2 { margin-bottom: 0.5rem; }
        .auth-modal p { color: var(--text-secondary); margin-bottom: 2rem; font-size: 0.9rem; }
        
        .auth-input {
            width: 100%;
            background: var(--bg-base);
            border: 1px solid var(--bg-elevated);
            color: white;
            padding: 0.8rem 1rem;
            border-radius: var(--radius-md);
            margin-bottom: 1rem;
            outline: none;
        }
        .auth-input:focus { border-color: var(--accent-purple); }
        
        .auth-submit {
            width: 100%;
            background: var(--accent-purple);
            color: white;
            border: none;
            padding: 1rem;
            border-radius: var(--radius-md);
            font-weight: 700;
            cursor: pointer;
            margin-top: 1rem;
            transition: var(--transition);
        }
        .auth-submit:hover { background: var(--accent-purple-hover); }

        .close-modal {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            margin-top: 1rem;
            cursor: pointer;
        }

        /* LIVE NOTIFICATIONS TOAST */
        .live-toast {
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid var(--accent-purple);
            color: white;
            padding: 0.8rem 1.5rem;
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.2);
            animation: slideInDown 0.5s ease forwards;
            backdrop-filter: blur(10px);
            cursor: pointer;
            transition: var(--transition);
        }
        .live-toast:hover { background: rgba(139, 92, 246, 0.4); transform: translateY(2px); }

        @keyframes slideInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 900px) {
            .app-container { flex-direction: column; overflow-y: auto; height: auto; }
            .sidebar { display: none; }
            .bottom-nav { display: flex; }
            .main-content { height: auto; padding-bottom: 80px; overflow-y: hidden; }
            header { padding: 1rem 1.5rem; justify-content: center; }
            .hub-link { display: none; }
            
            main { padding: 1rem; }
            .search-hero h1 { font-size: 2.2rem; }
            
            .detail-hero {
                grid-template-columns: 1fr;
                gap: 1.5rem;
                padding: 1.5rem;
                text-align: center;
            }
            .detail-cover { max-width: 200px; margin: 0 auto; }
            .detail-tags { justify-content: center; }
            .chapter-item { padding: 1rem; }
            .chapter-meta { font-size: 0.8rem; }
            
            .reader-header { padding: 0.8rem 1rem; }
            .reader-title { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

            /* Latest feed mobile */
            .latest-item { padding: 0.6rem 0.8rem; gap: 0.8rem; }
            .latest-item-cover { width: 40px; height: 56px; }
            .latest-item-title { font-size: 0.85rem; }
            .latest-item-chapter { font-size: 0.8rem; }
            .latest-item-time { font-size: 0.7rem; }

            /* Section headers mobile */
            .section-header { margin-top: 2rem; margin-bottom: 1rem; }
            .section-header h2 { font-size: 1.2rem; }

            /* Grid mobile */
            .results-grid { grid-template-columns: repeat(3, 1fr); gap: 0.6rem; margin-top: 1rem; }
            .manga-title { font-size: 0.75rem; line-height: 1.2; }
            .manga-info { padding: 0.4rem; }
            .manga-fmt { font-size: 0.65rem; margin-bottom: 0.1rem; }
            .skeleton-card .sk-title { height: 14px; }
            .skeleton-card .sk-tag { height: 10px; width: 40px; }

            /* Search bar mobile */
            .search-bar-container { flex-direction: column; gap: 0.5rem; }
            .search-btn { width: 100%; padding: 0.8rem; }
            .search-hero h1 { font-size: 1.8rem; }
            .search-hero p { font-size: 0.9rem; margin-top: 0.5rem; }

            /* Adv search filters mobile */
            .filter-select { font-size: 0.8rem; padding: 0.6rem 0.8rem; }
        }
    </style>
</head>
<body>

    <div class="app-container">
        <!-- SIDEBAR NAVIGATION -->
        <aside class="sidebar">
            <a href="#" class="brand-logo" onclick="openHome()">
                <span class="text-accent">⛩️</span> KamiReader
            </a>
            
            <nav class="nav-menu">
                <a href="#" class="nav-link active" id="nav-home" onclick="openHome()">
                    🏠 Inicio
                </a>
                <a href="#" class="nav-link" id="nav-library" onclick="openLibrary()">
                    📚 Mi Biblioteca
                </a>
                <a href="#" class="nav-link" id="nav-search" onclick="openAdvancedSearch()">
                    🔍 Búsqueda Pro
                </a>
            </nav>

            <div class="user-widget" id="userWidget">
                <button class="login-btn" onclick="openAuthModal()">Iniciar Sesión</button>
            </div>
        </aside>

        <!-- BOTTOM NAV (Mobile Only) -->
        <nav class="bottom-nav">
            <a href="#" class="bottom-nav-link active" id="mobile-nav-home" onclick="openHome()">
                <span class="icon">🏠</span>
                <span>Inicio</span>
            </a>
            <a href="#" class="bottom-nav-link" id="mobile-nav-library" onclick="openLibrary()">
                <span class="icon">📚</span>
                <span>Biblioteca</span>
            </a>
            <a href="#" class="bottom-nav-link" id="mobile-nav-search" onclick="openAdvancedSearch()">
                <span class="icon">🔍</span>
                <span>Explorar</span>
            </a>
            <a href="#" class="bottom-nav-link" onclick="openAuthModal()" id="mobile-nav-user">
                <span class="icon">👤</span>
                <span id="mobileUserBtn">Cuenta</span>
            </a>
        </nav>

        <!-- MAIN SCROLLABLE CONTENT -->
        <div class="main-content" id="mainScroll">
            <header>
                <div id="liveNotifications" style="flex-grow: 1; display: flex; justify-content: center;"></div>
                <a href="../index.php" class="hub-link">← Volver al Hub</a>
            </header>

            <main>
                <!-- 1. SEARCH / HOME VIEW -->
        <div id="searchView">
            <div class="search-hero">
                <h1>Descubre el Mejor <span class="text-accent">Manga</span></h1>
                <p>Explora los títulos más populares o busca directamente en la base de datos.</p>
            </div>
            
            <form id="searchForm" class="search-bar-container">
                <input type="text" id="searchInput" class="search-input" placeholder="Ej. Solo Leveling, Berserk, One Piece..." required>
                <button type="submit" class="search-btn">Buscar</button>
            </form>

            <div id="mainLoader" class="loader-container hidden">
                <div class="loader"></div>
                <div class="loader-text" id="loaderText">Consultando servidores...</div>
            </div>

            <!-- LATEST CHAPTER RELEASES -->
            <div class="section-header">
                <div class="accent-bar"></div>
                <h2>🔥 Últimos Capítulos</h2>
                <span class="badge">EN VIVO</span>
            </div>
            <div id="latestFeed" class="latest-feed">
                <!-- Skeleton placeholders -->
                <div class="latest-item skeleton" style="height:86px;"></div>
                <div class="latest-item skeleton" style="height:86px;"></div>
                <div class="latest-item skeleton" style="height:86px;"></div>
                <div class="latest-item skeleton" style="height:86px;"></div>
                <div class="latest-item skeleton" style="height:86px;"></div>
                <div class="latest-item skeleton" style="height:86px;"></div>
            </div>

            <!-- TRENDING GRID -->
            <div class="section-header">
                <div class="accent-bar" style="background: var(--accent-orange);"></div>
                <h2 id="gridTitle">📈 Tendencias Actuales</h2>
                <span class="badge" style="background: rgba(249,115,22,0.15); color: var(--accent-orange);">AniList</span>
            </div>
            <div id="resultsGrid" class="results-grid">
                <!-- Skeleton cards -->
                <div class="skeleton-card"><div class="sk-cover skeleton"></div><div class="sk-info"><div class="sk-tag skeleton"></div><div class="sk-title skeleton"></div></div></div>
                <div class="skeleton-card"><div class="sk-cover skeleton"></div><div class="sk-info"><div class="sk-tag skeleton"></div><div class="sk-title skeleton"></div></div></div>
                <div class="skeleton-card"><div class="sk-cover skeleton"></div><div class="sk-info"><div class="sk-tag skeleton"></div><div class="sk-title skeleton"></div></div></div>
                <div class="skeleton-card"><div class="sk-cover skeleton"></div><div class="sk-info"><div class="sk-tag skeleton"></div><div class="sk-title skeleton"></div></div></div>
                <div class="skeleton-card"><div class="sk-cover skeleton"></div><div class="sk-info"><div class="sk-tag skeleton"></div><div class="sk-title skeleton"></div></div></div>
                <div class="skeleton-card"><div class="sk-cover skeleton"></div><div class="sk-info"><div class="sk-tag skeleton"></div><div class="sk-title skeleton"></div></div></div>
            </div>
        </div>

        <!-- 2. DETAILS VIEW -->
        <div id="detailView" class="hidden">
            <button class="back-btn" onclick="openHome()">← Volver a Búsqueda</button>
            
            <div class="detail-hero" id="detailHero">
                <!-- populated via JS -->
            </div>

            <div class="chapters-section">
                <h2>Capítulos Disponibles</h2>
                
                <div class="chapter-controls">
                    <select id="langSelect" class="lang-select">
                        <option value="es-la">Español (Latam)</option>
                        <option value="es">Español</option>
                        <option value="en" selected>Inglés (EN)</option>
                    </select>
                </div>

                <div id="chaptersStatus" style="margin-bottom: 1rem;"></div>
                <div id="chaptersList" class="chapters-list">
                    <!-- populated via JS -->
                </div>
            </div>
        </div>

        <!-- ADVANCED SEARCH VIEW (The Boutique) -->
        <div id="advSearchView" class="hidden">
            <div class="search-hero" style="text-align: left; padding: 2rem;">
                <h1 style="font-size: 2.5rem;">Búsqueda <span class="text-accent" style="background: linear-gradient(90deg, #f97316, #8b5cf6); -webkit-background-clip: text; color: transparent;">Pro</span></h1>
                <p>Usa el motor de búsqueda avanzado de MangaDex con todos los filtros disponibles.</p>
                
                <!-- Search Input -->
                <div style="margin-top: 2rem;">
                    <input type="text" id="advSearchInput" class="search-input" placeholder="🔍 Buscar por título..." style="width: 100%; max-width: 500px; padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--bg-elevated); background: var(--bg-surface); color: white; margin-bottom: 1rem;">
                </div>

                <!-- Filters Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.8rem; margin-bottom: 1.5rem;">
                    
                    <!-- Origin Type -->
                    <select id="advOrigin" class="filter-select">
                        <option value="">🌍 Todos los orígenes</option>
                        <option value="ja">🇯🇵 Manga (Japón)</option>
                        <option value="ko">🇰🇷 Manhwa (Corea)</option>
                        <option value="zh,zh-hk">🇨🇳 Manhua (China)</option>
                    </select>

                    <!-- Demographic -->
                    <select id="advDemographic" class="filter-select">
                        <option value="">👥 Todas las demografías</option>
                        <option value="shounen">Shounen</option>
                        <option value="seinen">Seinen</option>
                        <option value="shoujo">Shoujo</option>
                        <option value="josei">Josei</option>
                    </select>

                    <!-- Status -->
                    <select id="advStatus" class="filter-select">
                        <option value="">📋 Todos los estados</option>
                        <option value="ongoing">🟢 En publicación</option>
                        <option value="completed">✅ Completado</option>
                        <option value="hiatus">⏸️ En pausa</option>
                        <option value="cancelled">❌ Cancelado</option>
                    </select>

                    <!-- Content Rating -->
                    <select id="advContentRating" class="filter-select">
                        <option value="">🛡️ Todo el contenido</option>
                        <option value="safe">Safe</option>
                        <option value="suggestive">Suggestive</option>
                        <option value="erotica">Erotica</option>
                    </select>

                    <!-- Sort Order -->
                    <select id="advSortOrder" class="filter-select">
                        <option value="relevance">📊 Relevancia</option>
                        <option value="latestUploadedChapter">🕐 Último capítulo subido</option>
                        <option value="followedCount">❤️ Más seguidos</option>
                        <option value="rating">⭐ Mejor calificación</option>
                        <option value="createdAt">🆕 Más recientes</option>
                        <option value="title">🔤 Título A-Z</option>
                    </select>
                </div>

                <button class="search-btn" onclick="executeAdvancedSearch()" style="border-radius: 8px; padding: 0.8rem 2rem; font-size: 1rem;">🔎 Buscar</button>
            </div>

            <div id="advSearchLoader" class="loader-container hidden">
                <div class="loader"></div>
                <div class="loader-text">Buscando en la bóveda de MangaDex...</div>
            </div>

            <div id="advResultsGrid" class="results-grid" style="margin-top: 1rem;">
                <!-- Populated via JS -->
            </div>
        </div>

        <!-- 4. LIBRARY VIEW -->
        <div id="libraryView" class="hidden">
            <h2 style="font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem;">📚 Mi Biblioteca</h2>
            <p id="libraryStatus" style="color: var(--text-secondary); margin-bottom: 2rem;">Inicia sesión para sincronizar tu biblioteca con MangaDex.</p>
            <div id="libraryGrid" class="results-grid"></div>
        </div>

        <!-- 5. READER VIEW (FULLSCREEN OVERLAY) -->
        <div id="readerView" class="hidden">
            <div class="reader-header">
                <div class="reader-title" id="readerTitle">Cargando Capítulo...</div>
                <button class="close-reader-btn" onclick="closeReader()">Cerrar Lector</button>
            </div>
            
            <div id="readerLoader" class="loader-container" style="margin-top: 30vh;">
                <div class="loader"></div>
                <div class="loader-text">Conectando a MangaDex At-Home Network...</div>
            </div>

            <div id="pagesContainer" class="pages-container">
                <!-- Images populated here -->
            </div>
        </div>

    </main>
</div> <!-- End main-content -->
</div> <!-- End app-container -->

    <!-- AUTH MODAL -->
    <div id="authModal" class="modal-overlay hidden">
        <div class="auth-modal">
            <h2>Acceso a MangaDex</h2>
            <p>Conecta tu cuenta oficial de MangaDex para poder gestionar tu Biblioteca y Guardar Historial de Lectura.</p>
            
            <form id="loginForm">
                <input type="text" id="loginUser" class="auth-input" placeholder="Nombre de Usuario o Email" required>
                <input type="password" id="loginPass" class="auth-input" placeholder="Contraseña" required>
                <button type="submit" class="auth-submit" id="loginBtnLoader">Conectar Cuenta</button>
            </form>
            
            <button class="close-modal" onclick="closeAuthModal()">Cancelar</button>
        </div>
    </div>

    <script>
        // --- GLOBAL STATE ---
        const state = {
            currentMangaAniList: null,
            currentMangaDexId: null,
            currentChapterId: null,
            currentChapterOffset: 0,
            currentChapterTotal: 0,
            readChapters: [],
            chapters: [],
            lastLiveCheck: new Date().toISOString().split('.')[0], // Current time without MS for the API
            liveInterval: null,
            auth: {
                sessionToken: localStorage.getItem('md_session') || null,
                refreshToken: localStorage.getItem('md_refresh') || null,
                user: null
            }
        };

        // --- DOM ELEMENTS ---
        const views = {
            search: document.getElementById('searchView'),
            detail: document.getElementById('detailView'),
            library: document.getElementById('libraryView'),
            advSearch: document.getElementById('advSearchView'),
            reader: document.getElementById('readerView')
        };
        const navLinks = {
            search: [document.getElementById('nav-home'), document.getElementById('mobile-nav-home')],
            library: [document.getElementById('nav-library'), document.getElementById('mobile-nav-library')],
            advSearch: [document.getElementById('nav-search'), document.getElementById('mobile-nav-search')]
        };
        
        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');
        const resultsGrid = document.getElementById('resultsGrid');
        const mainLoader = document.getElementById('mainLoader');
        const loaderText = document.getElementById('loaderText');

        const detailHero = document.getElementById('detailHero');
        const chaptersList = document.getElementById('chaptersList');
        const chaptersStatus = document.getElementById('chaptersStatus');
        const langSelect = document.getElementById('langSelect');

        const pagesContainer = document.getElementById('pagesContainer');
        const readerLoader = document.getElementById('readerLoader');
        const readerTitle = document.getElementById('readerTitle');

        // --- NAVIGATION CONTROLLERS ---
        function switchView(viewName) {
            if (viewName !== 'reader') {
                // Find the currently active view to save as previous, but never save 'reader' as previous
                const currentActive = Object.keys(views).find(k => views[k] && !views[k].classList.contains('hidden'));
                if (currentActive && currentActive !== 'reader') state.previousView = currentActive;
            }

            Object.values(views).forEach(v => { if(v) v.classList.add('hidden'); });
            if(views[viewName]) views[viewName].classList.remove('hidden');
            
            // Manage UI states
            Object.values(navLinks).forEach(links => links.forEach(l => l?.classList.remove('active')));
            if(navLinks[viewName]) navLinks[viewName].forEach(l => l?.classList.add('active'));

            if (viewName === 'reader') {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
            
            // Scroll to top of main container when switching views
            document.getElementById('mainScroll').scrollTop = 0;
            
            if(viewName === 'library') {
                fetchLibrary();
            }
        }

        function openHome() { switchView('search'); }
        function openLibrary() { switchView('library'); }
        function openAdvancedSearch() { switchView('advSearch'); }
        
        // Mark chapter as read when closing the reader
        function closeReader() {
            if(state.currentChapterId) {
                markChapterAsRead(state.currentChapterId);
            }
            pagesContainer.innerHTML = ''; 
            switchView(state.previousView || 'search'); 
        }

        // --- AUTH CONTROLLERS ---
        function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

        const loginForm = document.getElementById('loginForm');
        const loginBtnLoader = document.getElementById('loginBtnLoader');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUser').value;
            const pass = document.getElementById('loginPass').value;
            
            loginBtnLoader.innerText = "Conectando...";
            loginBtnLoader.style.pointerEvents = 'none';

            try {
                const res = await fetch('https://api.mangadex.org/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass })
                });
                
                const data = await res.json();
                
                if(data.result === 'ok') {
                    // Save Tokens
                    state.auth.sessionToken = data.token.session;
                    state.auth.refreshToken = data.token.refresh;
                    localStorage.setItem('md_session', data.token.session);
                    localStorage.setItem('md_refresh', data.token.refresh);
                    
                    closeAuthModal();
                    checkSession(); // Update UI
                } else {
                    alert("Error de Inicio de Sesión: " + (data.errors ? data.errors[0].detail : "Credenciales inválidas"));
                }
            } catch (err) {
                alert("Error de red conectando con MangaDex.");
            } finally {
                loginBtnLoader.innerText = "Conectar Cuenta";
                loginBtnLoader.style.pointerEvents = 'auto';
            }
        });

        // Check if user is logged in on load
        async function checkSession() {
            if(!state.auth.sessionToken) return;

            try {
                const res = await fetch('https://api.mangadex.org/user/me', {
                    headers: { 'Authorization': `Bearer ${state.auth.sessionToken}` }
                });
                
                if(res.status === 401) {
                    // Token expired, attempt refresh
                    await refreshSession();
                    return;
                }

                const data = await res.json();
                if(data.result === 'ok') {
                    state.auth.user = data.data;
                    document.getElementById('userWidget').innerHTML = `
                        <div style="color: var(--text-primary); font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 30px; height: 30px; background: var(--accent-purple); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                                ${data.data.attributes.username.substring(0,2).toUpperCase()}
                            </div>
                            ${data.data.attributes.username}
                        </div>
                        <button class="login-btn" style="background: transparent; border: 1px solid var(--bg-elevated); color: var(--text-secondary);" onclick="logout()">Cerrar Sesión</button>
                    `;
                    document.getElementById('mobileUserBtn').innerText = data.data.attributes.username;
                    document.getElementById('libraryStatus').classList.add('hidden');
                    if (views.library && !views.library.classList.contains('hidden')) fetchLibrary();
                }
            } catch(err) {
                console.error("Session check failed", err);
            }
        }

        async function refreshSession() {
            if(!state.auth.refreshToken) { logout(); return; }
            try {
                const res = await fetch('https://api.mangadex.org/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: state.auth.refreshToken })
                });
                const data = await res.json();
                if(data.result === 'ok') {
                    state.auth.sessionToken = data.token.session;
                    state.auth.refreshToken = data.token.refresh;
                    localStorage.setItem('md_session', data.token.session);
                    localStorage.setItem('md_refresh', data.token.refresh);
                    checkSession();
                } else {
                    logout();
                }
            } catch(e) { logout(); }
        }

        function logout() {
            state.auth.sessionToken = null;
            state.auth.refreshToken = null;
            state.auth.user = null;
            localStorage.removeItem('md_session');
            localStorage.removeItem('md_refresh');
            document.getElementById('userWidget').innerHTML = `<button class="login-btn" onclick="openAuthModal()">Iniciar Sesión</button>`;
            document.getElementById('mobileUserBtn').innerText = "Cuenta";
            document.getElementById('libraryStatus').classList.remove('hidden');
            document.getElementById('libraryGrid').innerHTML = '';
        }

        // --- LIBRARY LOGIC ---
        async function fetchLibrary() {
            const libStatus = document.getElementById('libraryStatus');
            const libGrid = document.getElementById('libraryGrid') || createLibraryGrid();
            
            if(!state.auth.sessionToken) {
                libStatus.classList.remove('hidden');
                libStatus.innerText = "Inicia sesión para ver tu biblioteca.";
                libGrid.innerHTML = '';
                return;
            }

            libStatus.classList.remove('hidden');
            libStatus.innerHTML = `<div class="loader" style="width:20px;height:20px;display:inline-block;vertical-align:middle;"></div> Sincronizando con MangaDex...`;
            
            try {
                // Fetch Follows with expanded Cover Art and Author relations
                const res = await fetch('https://api.mangadex.org/user/follows/manga?includes[]=cover_art&includes[]=author&limit=50', {
                    headers: { 'Authorization': `Bearer ${state.auth.sessionToken}` }
                });
                const data = await res.json();
                
                if(data.result === 'ok') {
                    libStatus.classList.add('hidden');
                    renderMangaDexGrid(data.data, libGrid);
                }
            } catch(e) {
                libStatus.innerHTML = "Error cargando biblioteca.";
            }
        }

        function createLibraryGrid() {
            const grid = document.createElement('div');
            grid.id = 'libraryGrid';
            grid.className = 'results-grid';
            views.library.appendChild(grid);
            return grid;
        }

        function renderMangaDexGrid(mdMangas, container) {
            container.innerHTML = '';
            if (mdMangas.length === 0) {
                container.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-secondary); text-align: center;">Tu biblioteca está vacía.</div>`;
                return;
            }

            mdMangas.forEach(manga => {
                const attrs = manga.attributes;
                // md returns titles usually as an object with 'en', 'ja-ro', etc. Try to get EN or fallback.
                const title = attrs.title.en || attrs.title['ja-ro'] || Object.values(attrs.title)[0] || 'Desconocido';
                
                // Find cover
                const coverRel = manga.relationships.find(r => r.type === 'cover_art');
                const coverFileName = coverRel ? coverRel.attributes.fileName : null;
                const coverUrl = coverFileName 
                    ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg` 
                    : 'https://via.placeholder.com/256x384.png?text=No+Cover';
                
                // Find origin category (country of origin code in MangaDex relations/tags)
                const originLang = manga.attributes.originalLanguage;
                let originTag = '🇯🇵 Manga';
                if(originLang === 'ko') originTag = '🇰🇷 Manhwa';
                if(originLang === 'zh' || originLang === 'zh-hk') originTag = '🇨🇳 Manhua';

                const card = document.createElement('div');
                card.className = 'manga-card';
                // Directly load chapters from MangaDex since we already have the MD id
                card.onclick = () => loadDirectMangaDexDetails(manga, title, coverUrl, originTag);

                card.innerHTML = `
                    <div class="manga-cover-wrap">
                        <img src="${coverUrl}" class="manga-cover" alt="Cover" loading="lazy">
                    </div>
                    <div class="manga-info">
                        <div class="manga-fmt">${originTag}</div>
                        <div class="manga-title">${title}</div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
        
        // --- ADVANCED SEARCH (MANGADEX NATIVE) ---
        async function executeAdvancedSearch() {
            const query = document.getElementById('advSearchInput').value.trim();
            const origin = document.getElementById('advOrigin').value;
            const demographic = document.getElementById('advDemographic').value;
            const status = document.getElementById('advStatus').value;
            const contentRating = document.getElementById('advContentRating').value;
            const sortOrder = document.getElementById('advSortOrder').value;
            const loader = document.getElementById('advSearchLoader');
            const grid = document.getElementById('advResultsGrid');
            
            grid.innerHTML = '';
            loader.classList.remove('hidden');

            try {
                let url = `https://api.mangadex.org/manga?includes[]=cover_art&includes[]=author&limit=20`;
                
                // Title search
                if(query) url += `&title=${encodeURIComponent(query)}`;
                
                // Origin language (Manga/Manhwa/Manhua)
                if(origin) {
                    const langs = origin.split(',');
                    langs.forEach(l => url += `&originalLanguage[]=${l}`);
                }
                
                // Demographic
                if(demographic) url += `&publicationDemographic[]=${demographic}`;
                
                // Status
                if(status) url += `&status[]=${status}`;
                
                // Content Rating
                if(contentRating) {
                    url += `&contentRating[]=${contentRating}`;
                } else {
                    url += `&contentRating[]=safe&contentRating[]=suggestive`;
                }
                
                // Sort Order
                if(sortOrder) {
                    url += `&order[${sortOrder}]=desc`;
                }

                const res = await fetch(url);
                const data = await res.json();
                
                loader.classList.add('hidden');
                
                if(data.result === 'ok' && data.data.length > 0) {
                    renderMangaDexGrid(data.data, grid);
                } else {
                    grid.innerHTML = '<div class="error-box" style="grid-column:1/-1;">No se encontraron resultados. Intenta con otros filtros.</div>';
                }
            } catch(e) {
                loader.classList.add('hidden');
                grid.innerHTML = '<div class="error-box" style="grid-column:1/-1;">Error de conexión con MangaDex.</div>';
                console.error("Advanced search error:", e);
            }
        }

        // --- IN-APP READER & SYNC ---
        async function fetchReadMarkers(mangaId) {
            state.readChapters = [];
            if(!state.auth.sessionToken) return;
            
            try {
                const res = await fetch(`https://api.mangadex.org/manga/${mangaId}/read`, {
                    headers: { 'Authorization': `Bearer ${state.auth.sessionToken}` }
                });
                const data = await res.json();
                if(data.result === 'ok') {
                    state.readChapters = data.data; // Array of chapter UUIDs
                    highlightReadChapters();
                }
            } catch(e) { console.error("Error fetching read markers", e); }
        }

        function highlightReadChapters() {
            if(state.readChapters.length === 0) return;
            const items = document.querySelectorAll('.chapter-item');
            items.forEach(el => {
                const cid = el.getAttribute('data-id');
                if(state.readChapters.includes(cid)) {
                    el.style.opacity = '0.5';
                    const nameDiv = el.querySelector('.chapter-name');
                    if(nameDiv && !nameDiv.innerHTML.includes('✔️')) {
                        nameDiv.innerHTML += ` <span style="font-size: 0.8rem; color: #10b981;">✔️ Leído</span>`;
                    }
                }
            });
        }

        async function markChapterAsRead(chapterId) {
            if(!state.auth.sessionToken) return;
            if(state.readChapters.includes(chapterId)) return; // Already read
            
            try {
                await fetch(`https://api.mangadex.org/chapter/${chapterId}/read`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.auth.sessionToken}` 
                    }
                });
                state.readChapters.push(chapterId);
                highlightReadChapters();
            } catch(e) { console.error("Could not sync read marker", e); }
        }

        async function loadDirectMangaDexDetails(mangaObj, title, coverUrl, countryTag) {
            state.currentMangaDexId = mangaObj.id;
            state.currentMangaAniList = { title: { english: title, romaji: title }}; // Mock AniList state
            
            switchView('detail');
            
            const desc = mangaObj.attributes.description.en || mangaObj.attributes.description['es-la'] || 'Sin descripción en inglés/español.';
            const tagsHtml = mangaObj.attributes.tags.map(t => `<span class="tag">${t.attributes.name.en}</span>`).join('');
            
            // Re-detect origin if coming from library without tag
            if(!countryTag) {
                const ol = mangaObj.attributes.originalLanguage;
                countryTag = (ol === 'ko' ? '🇰🇷 Manhwa' : (ol === 'zh' ? '🇨🇳 Manhua' : '🇯🇵 Manga'));
            }

            detailHero.innerHTML = `
                <img src="${coverUrl}" class="detail-cover" alt="Cover">
                <div class="detail-info">
                    <div class="manga-fmt" style="margin-bottom:0.5rem;">${countryTag}</div>
                    <h1>${title}</h1>
                    <div class="detail-tags">${tagsHtml}</div>
                    <div style="font-size: 0.8rem; margin-bottom: 1rem; color: var(--text-secondary); opacity: 0.8;">
                        Status: <span style="color: var(--accent-purple); text-transform: uppercase; font-weight:700;">${mangaObj.attributes.status}</span>
                    </div>
                    <div class="detail-desc">${desc.substring(0, 1000)}</div>
                </div>
            `;
            
            fetchChapters(state.currentMangaDexId, langSelect.value);
            fetchReadMarkers(state.currentMangaDexId);
        }

        // --- 1. SET UP ANILIST (METADATA) API ---
        const initQuery = `
        query {
            Page (page: 1, perPage: 12) {
                media (type: MANGA, sort: TRENDING_DESC) {
                    id
                    title { romaji english }
                    format
                    coverImage { large extraLarge }
                    description
                    genres
                    countryOfOrigin
                }
            }
        }`;

        document.addEventListener('DOMContentLoaded', async () => {
            checkSession();
            startLiveUpdates();

            // Load BOTH latest chapters and trending simultaneously
            fetchLatestChapters();
            fetchTrending();
        });

        // --- FETCH LATEST CHAPTERS FROM MANGADEX ---
        async function fetchLatestChapters() {
            const feed = document.getElementById('latestFeed');
            try {
                const url = `https://api.mangadex.org/chapter?limit=12&translatedLanguage[]=en&translatedLanguage[]=es-la&translatedLanguage[]=es&order[readableAt]=desc&includes[]=manga&includes[]=scanlation_group`;
                const res = await fetch(url);
                const data = await res.json();
                
                if(data.result === 'ok' && data.data.length > 0) {
                    feed.innerHTML = '';
                    
                    // Get manga IDs for covers
                    const mangaIds = [...new Set(data.data.map(ch => {
                        const rel = ch.relationships.find(r => r.type === 'manga');
                        return rel ? rel.id : null;
                    }).filter(Boolean))];

                    // Fetch covers for all manga in one batch
                    const coverMap = {};
                    if(mangaIds.length > 0) {
                        const coverUrl = `https://api.mangadex.org/manga?ids[]=${mangaIds.join('&ids[]=')}&includes[]=cover_art&limit=20`;
                        const coverRes = await fetch(coverUrl);
                        const coverData = await coverRes.json();
                        if(coverData.result === 'ok') {
                            coverData.data.forEach(m => {
                                const coverRel = m.relationships.find(r => r.type === 'cover_art');
                                const fn = coverRel?.attributes?.fileName;
                                if(fn) coverMap[m.id] = `https://uploads.mangadex.org/covers/${m.id}/${fn}.256.jpg`;
                                // Store origin language too
                                coverMap[m.id + '_lang'] = m.attributes.originalLanguage;
                                coverMap[m.id + '_title'] = m.attributes.title.en || m.attributes.title['ja-ro'] || Object.values(m.attributes.title)[0] || 'Desconocido';
                            });
                        }
                    }

                    data.data.forEach(ch => {
                        const mangaRel = ch.relationships.find(r => r.type === 'manga');
                        if(!mangaRel) return;
                        
                        const mangaId = mangaRel.id;
                        const title = coverMap[mangaId + '_title'] || 'Título Desconocido';
                        const coverUrl = coverMap[mangaId] || 'https://via.placeholder.com/50x70.png?text=?';
                        const chapNum = ch.attributes.chapter ? `Cap. ${ch.attributes.chapter}` : 'One-shot';
                        const chapTitle = ch.attributes.title ? ` — ${ch.attributes.title}` : '';
                        const lang = coverMap[mangaId + '_lang'] || 'ja';
                        let originTag = '🇯🇵';
                        if(lang === 'ko') originTag = '🇰🇷';
                        if(lang === 'zh' || lang === 'zh-hk') originTag = '🇨🇳';
                        
                        // Time ago
                        const uploaded = new Date(ch.attributes.readableAt || ch.attributes.createdAt);
                        const diff = Math.floor((Date.now() - uploaded) / 60000);
                        let timeAgo = diff < 60 ? `hace ${diff}m` : diff < 1440 ? `hace ${Math.floor(diff/60)}h` : `hace ${Math.floor(diff/1440)}d`;

                        const el = document.createElement('div');
                        el.className = 'latest-item';
                        el.onclick = () => openReader(ch.id, chapNum);
                        el.innerHTML = `
                            <img src="${coverUrl}" class="latest-item-cover" alt="Cover" loading="lazy">
                            <div class="latest-item-info">
                                <div class="latest-item-title">${originTag} ${title}</div>
                                <div class="latest-item-chapter">${chapNum}${chapTitle}</div>
                                <div class="latest-item-time">📅 ${timeAgo} · 🌐 ${ch.attributes.translatedLanguage.toUpperCase()}</div>
                            </div>
                        `;
                        feed.appendChild(el);
                    });
                } else {
                    feed.innerHTML = '<div class="error-box">No se pudieron cargar los últimos capítulos.</div>';
                }
            } catch(e) {
                console.error("Latest chapters fetch failed", e);
                feed.innerHTML = '<div class="error-box">Error de conexión con MangaDex.</div>';
            }
        }

        // --- FETCH ANILIST TRENDING ---
        async function fetchTrending() {
            try {
                const response = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query: initQuery })
                });
                const data = await response.json();
                resultsGrid.innerHTML = ''; // Clear skeletons
                renderAniListResults(data.data.Page.media);
            } catch (error) {
                resultsGrid.innerHTML = '<div class="error-box" style="grid-column:1/-1;">Error cargando tendencias de AniList.</div>';
                console.error(error);
            }
        }

        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if(!query) return;

            document.getElementById('gridTitle').innerText = `Resultados para "${query}"`;
            resultsGrid.innerHTML = '';
            mainLoader.classList.remove('hidden');
            loaderText.innerText = "Buscando en AniList GraphQL...";

            const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 12) {
                    media (search: $search, type: MANGA, sort: POPULARITY_DESC) {
                        id
                        title { romaji english }
                        description(asHtml: false)
                        format
                        genres
                        coverImage { large extraLarge }
                        countryOfOrigin
                    }
                }
            }`;

            try {
                const response = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query: graphqlQuery, variables: { search: query } })
                });

                const data = await response.json();
                mainLoader.classList.add('hidden');
                
                if(data.data.Page.media.length === 0) {
                    resultsGrid.innerHTML = `<div class="error-box" style="grid-column: 1/-1;">No se encontraron resultados para "${query}".</div>`;
                    return;
                }

                renderAniListResults(data.data.Page.media);

            } catch (error) {
                console.error(error);
                mainLoader.classList.add('hidden');
                resultsGrid.innerHTML = `<div class="error-box" style="grid-column: 1/-1;">Error de red al conectar con AniList.</div>`;
            }
        });

        function renderAniListResults(mangas) {
            mangas.forEach(manga => {
                const title = manga.title.english || manga.title.romaji;
                const cover = manga.coverImage.large;
                const origin = manga.countryOfOrigin;
                let originTag = '🇯🇵 Manga';
                if(origin === 'KR') originTag = '🇰🇷 Manhwa';
                if(origin === 'CN') originTag = '🇨🇳 Manhua';

                const card = document.createElement('div');
                card.className = 'manga-card';
                card.onclick = () => loadMangaDetails(manga, originTag);

                card.innerHTML = `
                    <div class="manga-cover-wrap">
                        <img src="${cover}" class="manga-cover" alt="Cover" loading="lazy">
                    </div>
                    <div class="manga-info">
                        <div class="manga-fmt">${originTag}</div>
                        <div class="manga-title">${title}</div>
                    </div>
                `;
                resultsGrid.appendChild(card);
            });
        }

        // --- LIVE CHAPTER UPDATES (SMART POLLING) ---
        function startLiveUpdates() {
            if(state.liveInterval) clearInterval(state.liveInterval);
            // Poll every 3 minutes (180,000 ms) to avoid rate limits
            state.liveInterval = setInterval(pollNewChapters, 180000); 
        }

        async function pollNewChapters() {
            if(!state.auth.sessionToken) return; // Only notify if they have a library
            
            try {
                // Fetch the latest chapters uploaded since our last check in selected languages
                const url = `https://api.mangadex.org/chapter?limit=10&translatedLanguage[]=es-la&translatedLanguage[]=es&translatedLanguage[]=en&createdAtSince=${state.lastLiveCheck}&order[createdAt]=desc&includes[]=manga`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                state.lastLiveCheck = new Date().toISOString().split('.')[0]; // Update timestamp

                if(data.result === 'ok' && data.data.length > 0) {
                    // Check if any of these new chapters belong to the user's Followed Manga
                    const newChapters = data.data;
                    
                    // Fetch user follows just IDs to compare efficiently
                    const followRes = await fetch('https://api.mangadex.org/user/follows/manga?limit=100', {
                        headers: { 'Authorization': `Bearer ${state.auth.sessionToken}` }
                    });
                    const followData = await followRes.json();
                    
                    if(followData.result !== 'ok') return;
                    
                    const followIds = followData.data.map(m => m.id);
                    
                    // Find a match
                    for(const ch of newChapters) {
                        const relManga = ch.relationships.find(r => r.type === 'manga');
                        if(relManga && followIds.includes(relManga.id)) {
                            // Match! Show notification!
                            const toastContainer = document.getElementById('liveNotifications');
                            toastContainer.innerHTML = `
                                <div class="live-toast" onclick="document.getElementById('nav-library').click()">
                                    <span>🔔</span>
                                    <div>
                                        <strong>¡Nuevo Capítulo!</strong>
                                        <div style="font-size:0.8rem; opacity:0.8;">Un manga de tu biblioteca se actualizó. (Cap. ${ch.attributes.chapter || '?'})</div>
                                    </div>
                                </div>
                            `;
                            // Auto dismiss after 10 seconds
                            setTimeout(() => { toastContainer.innerHTML = ''; }, 10000);
                            break; // Show only one toast to avoid spam
                        }
                    }
                }
            } catch(e) {
                console.error("Background sync failed", e);
            }
        }

        // Helper to find MangaDex ID from AniList title
        async function fetchMangaDexId(romajiTitle, englishTitle) {
            const searchTitles = [romajiTitle];
            if (englishTitle && englishTitle !== romajiTitle) {
                searchTitles.push(englishTitle);
            }

            for (const title of searchTitles) {
                try {
                    const mdSearchUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1&order[relevance]=desc`;
                    const mdRes = await fetch(mdSearchUrl);
                    const mdData = await mdRes.json();
                    if (mdData.data && mdData.data.length > 0) {
                        return mdData.data[0].id;
                    }
                } catch (err) {
                    console.error(`Error searching MangaDex for title "${title}":`, err);
                }
            }
            return null;
        }

        // --- 2. SET UP MANGADEX BRIDGE (CHAPTERS) ---
        async function loadMangaDetails(mangaObj, countryTag) {
            state.currentMangaAniList = mangaObj;
            switchView('detail');
            
            const title = mangaObj.title.english || mangaObj.title.romaji;
            const cover = mangaObj.coverImage.extraLarge || mangaObj.coverImage.large;
            const desc = mangaObj.description ? mangaObj.description.replace(/<br>/g, '\n').substring(0, 1000) : 'No hay descripción disponible.';
            
            const tagsHtml = mangaObj.genres.map(g => `<span class="tag">${g}</span>`).join('');

            detailHero.innerHTML = `
                <img src="${cover}" class="detail-cover" alt="Cover">
                <div class="detail-info">
                    <div class="manga-fmt" style="margin-bottom:0.5rem;">${countryTag}</div>
                    <h1>${title}</h1>
                    <div class="detail-sub">${mangaObj.title.romaji !== title ? mangaObj.title.romaji : ''}</div>
                    <div class="detail-tags">${tagsHtml}</div>
                    <div class="detail-desc">${desc}</div>
                </div>
            `;
            
            // Now bridge to MangaDex
            chaptersStatus.innerHTML = `<div class="loader" style="width:20px;height:20px;display:inline-block;margin-right:10px;vertical-align:middle;"></div> Buscando enlace con MangaDex...`;
            chaptersList.innerHTML = '';
            
            try {
                // Search MangaDex using the exact romaji/english title
                const mdId = await fetchMangaDexId(mangaObj.title.romaji, mangaObj.title.english);
                if(mdId) {
                    state.currentMangaDexId = mdId;
                    fetchChapters(mdId, langSelect.value);
                    fetchReadMarkers(mdId);
                } else {
                    chaptersStatus.innerHTML = `<div class="error-box">No se pudo encontrar una correspondencia exacta en MangaDex para extraer capítulos.</div>`;
                }
            } catch (err) {
                chaptersStatus.innerHTML = `<div class="error-box">Error conectando con la API de MangaDex.</div>`;
            }
        }

        langSelect.addEventListener('change', () => {
            if (state.currentMangaDexId) fetchChapters(state.currentMangaDexId, langSelect.value, 0);
        });

        async function fetchChapters(mangaId, lang, offset = 0) {
            if (offset === 0) {
                chaptersStatus.innerHTML = `Cargando capítulos en [${lang}]...`;
                chaptersList.innerHTML = '';
                state.currentChapterOffset = 0;
            } else {
                const loadBtn = document.getElementById('loadMoreBtn');
                if (loadBtn) loadBtn.innerText = 'Cargando más...';
            }

            try {
                // Get chapters ordered by chapter number descending with pagination
                const chapUrl = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=${lang}&order[chapter]=desc&limit=100&offset=${offset}`;
                const res = await fetch(chapUrl);
                const data = await res.json();

                if (data.data && data.data.length > 0) {
                    chaptersStatus.innerHTML = '';
                    state.currentChapterTotal = data.total;
                    renderChapters(data.data, offset > 0);
                } else if (offset === 0) {
                    chaptersStatus.innerHTML = `<div class="error-box">No hay capítulos traducidos disponibles en este idioma. Prueba seleccionando Inglés.</div>`;
                }
            } catch (err) {
                chaptersStatus.innerHTML = `<div class="error-box">Error obteniendo lista de capítulos.</div>`;
            }
        }

        function renderChapters(chaptersData, append = false) {
            // Remove load more button if it exists before appending
            const oldBtn = document.getElementById('loadMoreBtn');
            if (oldBtn) oldBtn.remove();

            chaptersData.forEach(ch => {
                const attrs = ch.attributes;
                const chapNum = attrs.chapter ? `Capítulo ${attrs.chapter}` : 'One-shot / Info';
                const chapTitle = attrs.title ? ` - ${attrs.title}` : '';
                const date = new Date(attrs.publishAt).toLocaleDateString();
                const isExternal = attrs.externalUrl ? true : false;
                const externalLabel = isExternal ? `<span style="color:var(--accent-orange); font-size: 0.8rem; margin-left: 0.5rem; border: 1px solid var(--accent-orange); padding: 0.1rem 0.4rem; border-radius: 4px;">🔗 Oficial</span>` : '';

                const el = document.createElement('div');
                el.className = 'chapter-item';
                el.setAttribute('data-id', ch.id);
                
                if (isExternal) {
                    el.onclick = () => { window.open(attrs.externalUrl, '_blank'); markChapterAsRead(ch.id); };
                } else {
                    el.onclick = () => openReader(ch.id, chapNum);
                }

                el.innerHTML = `
                    <div class="chapter-name">${chapNum}${chapTitle} ${externalLabel}</div>
                    <div class="chapter-meta">${isExternal ? 'Lectura Externa' : 'Pág: ' + attrs.pages} &middot; Subido: ${date}</div>
                `;
                chaptersList.appendChild(el);
            });

            state.currentChapterOffset += chaptersData.length;

            // Draw "Load More" button if there are more chapters
            if (state.currentChapterOffset < state.currentChapterTotal) {
                const loadBtn = document.createElement('button');
                loadBtn.id = 'loadMoreBtn';
                loadBtn.className = 'search-btn';
                loadBtn.style.width = '100%';
                loadBtn.style.marginTop = '1rem';
                loadBtn.innerText = `Cargar más capítulos (${state.currentChapterTotal - state.currentChapterOffset} restantes)`;
                loadBtn.onclick = () => fetchChapters(state.currentMangaDexId, langSelect.value, state.currentChapterOffset);
                chaptersList.appendChild(loadBtn);
            }

            highlightReadChapters();
        }

        // --- 3. THE READER (MANGADEX AT-HOME NETWORK) ---
        async function openReader(chapterId, chapterTitle) {
            state.currentChapterId = chapterId;
            switchView('reader');
            readerTitle.innerText = state.currentMangaAniList ? `${state.currentMangaAniList.title.romaji} - ${chapterTitle}` : chapterTitle;
            pagesContainer.innerHTML = '<div class="loader-container"><div class="loader"></div><div class="loader-text">Obteniendo imágenes...</div></div>';

            try {
                // 1. Get the At-Home Network server URL and image hashes
                const atHomeUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
                const res = await fetch(atHomeUrl);
                const data = await res.json();

                readerLoader.classList.add('hidden');

                if (data.result === 'ok') {
                    const baseUrl = data.baseUrl;
                    const hash = data.chapter.hash;
                    // using high quality "data" array. "dataSaver" can be used for compressed images
                    const imageFiles = data.chapter.data; 

                    // 2. Construct direct image URLs and render
                    imageFiles.forEach(file => {
                        const imgUrl = `${baseUrl}/data/${hash}/${file}`;
                        const imgEl = document.createElement('img');
                        imgEl.className = 'manga-page';
                        imgEl.src = imgUrl;
                        imgEl.loading = 'lazy'; // crucial for performance
                        imgEl.alt = 'Manga Page';
                        
                        // Handle mangadex network failures gracefully
                        imgEl.onerror = () => { imgEl.style.display = 'none'; };

                        pagesContainer.appendChild(imgEl);
                    });
                } else {
                    pagesContainer.innerHTML = `<div class="error-box" style="margin-top: 2rem;">El servidor de imágenes (At-Home) rechazó la solicitud.</div>`;
                }

            } catch (err) {
                readerLoader.classList.add('hidden');
                pagesContainer.innerHTML = `<div class="error-box" style="margin-top: 2rem;">Error catastrófico en el motor de lectura.</div>`;
            }
        }

    </script>
</body>
</html>
