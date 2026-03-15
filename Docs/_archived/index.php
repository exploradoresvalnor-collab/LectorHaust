<?php
/**
 * Master Hub for Landing Page Practice - Premium Edition
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Practice Hub | Premium UI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #050505;
            --text-main: #ffffff;
            --text-muted: #a1a1aa;
            --card-bg: rgba(255, 255, 255, 0.03);
            --card-border: rgba(255, 255, 255, 0.08);
            --glow-1: #6366f1;
            --glow-2: #db2777;
            --glow-3: #8b5cf6;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow-x: hidden;
            position: relative;
        }

        /* Ambient Background Glows */
        .ambient {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }

        .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.4;
            animation: float 20s infinite alternate ease-in-out;
        }

        .orb-1 {
            width: 400px;
            height: 400px;
            background: var(--glow-1);
            top: -100px;
            left: -100px;
        }

        .orb-2 {
            width: 500px;
            height: 500px;
            background: var(--glow-2);
            bottom: -200px;
            right: -100px;
            animation-delay: -5s;
        }

        .orb-3 {
            width: 300px;
            height: 300px;
            background: var(--glow-3);
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation-duration: 25s;
        }

        @keyframes float {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(50px, 30px) scale(1.1); }
            100% { transform: translate(-30px, 50px) scale(0.9); }
        }

        /* Layout */
        .container {
            position: relative;
            z-index: 10;
            max-width: 1300px;
            width: 100%;
            padding: 4rem 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        header {
            text-align: center;
            margin-bottom: 5rem;
            animation: fadeInDown 1s ease-out;
        }

        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .badge-main {
            display: inline-block;
            padding: 0.5rem 1.2rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 1.5rem;
            backdrop-filter: blur(10px);
            color: #e2e8f0;
        }

        h1 {
            font-size: clamp(3rem, 6vw, 5rem);
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -2px;
        }

        .subtitle {
            font-size: 1.25rem;
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.6;
            font-weight: 300;
        }

        /* Grid */
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 2.5rem;
            width: 100%;
            animation: fadeInUp 1s ease-out 0.3s backwards;
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Cards */
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            padding: 2.5rem;
            text-decoration: none;
            color: inherit;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            group: card-hover;
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 24px;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            transition: all 0.4s ease;
        }

        .card:hover {
            transform: translateY(-15px) scale(1.02);
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.05);
        }

        .card:hover::before {
            background: linear-gradient(135deg, var(--glow-1) 0%, var(--glow-3) 100%);
        }

        .card-icon {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            background: rgba(255,255,255,0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2rem;
            font-size: 1.8rem;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.3s ease;
        }

        .card:hover .card-icon {
            transform: scale(1.1) rotate(5deg);
            background: rgba(255,255,255,0.1);
        }

        .badge {
            position: absolute;
            top: 2.5rem;
            right: 2.5rem;
            padding: 0.4rem 1rem;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: #d4d4d8;
            border: 1px solid rgba(255,255,255,0.05);
        }

        .card h2 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #fff;
            position: relative;
        }

        .card p {
            color: var(--text-muted);
            line-height: 1.7;
            font-size: 1rem;
            font-weight: 400;
        }

        /* Specific card variants */
        .glass { --accent: #38bdf8; }
        .bento { --accent: #fbbf24; }
        .min   { --accent: #f4f4f5; }
        .saas  { --accent: #a78bfa; }
        .story { --accent: #f43f5e; }

        .card:hover h2 {
            background: linear-gradient(to right, #fff, var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
    </style>
</head>
<body>

    <div class="ambient">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    </div>

    <main class="container">
        <header>
            <div class="badge-main">Colección Premium</div>
            <h1>Landing Pages <br/>Masterclass</h1>
            <p class="subtitle">Explora cinco paradigmas de diseño web ultra-modernos, construidos con HTML, Vanilla CSS y backend en PHP. Diseños inmersivos y de alto impacto.</p>
        </header>

        <div class="grid">
            <a href="glassmorphism/index.php" class="card glass">
                <span class="badge">01</span>
                <div class="card-icon">🪞</div>
                <h2>Premium Dark</h2>
                <p>Estética tipo Apple con efectos de cristal esmerilado, desenfoque profundo, gradientes vibrantes y reflejos dinámicos.</p>
            </a>

            <a href="minimalist/index.php" class="card min">
                <span class="badge">02</span>
                <div class="card-icon">⚪</div>
                <h2>Clean & Pure</h2>
                <p>Minimalismo brutalista. Enfoque absoluto en la experiencia tipográfica, espacios en blanco masivos y elegancia atemporal.</p>
            </a>

            <a href="bento-grid/index.php" class="card bento">
                <span class="badge">03</span>
                <div class="card-icon">🍱</div>
                <h2>Modular Layout</h2>
                <p>La famosa estructura asimétrica "Bento Box". Cajas independientes, sombras suaves y bordes redondeados perfectos.</p>
            </a>

            <a href="dashboard/index.php" class="card saas">
                <span class="badge">04</span>
                <div class="card-icon">⚡</div>
                <h2>SaaS Dashboard</h2>
                <p>Interfaz de software oscura con acentos de neón. Visualización de datos, métricas clave y diseño orientado a producto.</p>
            </a>

            <a href="storytelling/index.php" class="card story">
                <span class="badge">05</span>
                <div class="card-icon">🌌</div>
                <h2>Storytelling</h2>
                <p>Narrativa visual a través del scroll. Elementos interactivos que reaccionan al usuario, fondos fijos e inmersión total.</p>
            </a>
            
            <!-- Tarjeta 7: Global Dispatch -->
            <a href="worldnews/index.php" class="feature-card" style="animation-delay: 0.6s">
                <div class="card-icon">📰</div>
                <div class="card-content">
                    <h2 class="card-title">Global Dispatch</h2>
                    <p class="card-description">Portal editorial internacional. Lector Inmersivo de Noticias.</p>
                </div>
                <div class="card-arrow">→</div>
            </a>

            <!-- Tarjeta 8: Manga Reader -->
            <a href="manga/index.php" class="feature-card" style="animation-delay: 0.7s">
                <div class="card-icon">⛩️</div>
                <div class="card-content">
                    <h2 class="card-title">KamiReader</h2>
                    <p class="card-description">Manga Web App. Arquitectura AniList GraphQL + MangaDex.</p>
                </div>
                <div class="card-arrow">→</div>
            </a>

            <a href="gamebrain/index.php" class="card cyber">
                <span class="badge">06</span>
                <div class="card-icon" style="color: #00f2fe;">🎮</div>
                <h2 style="color: #00f2fe;">Nexus (GameBrain API)</h2>
                <p>Aplicación de búsqueda cuántica web. Interfaz oscura Cyberpunk tipo Steam consumiendo datos reales de videojuegos mediante Fetch API.</p>
            </a>

            <a href="worldnews/index.php" class="card editorial">
                <span class="badge">07 [NUEVO]</span>
                <div class="card-icon" style="color: #8B2626; font-family: serif;">📰</div>
                <h2 style="color: #8B2626; font-family: serif;">Global Dispatch</h2>
                <p>Lector premium inmersivo. Introduce cualquier portal web para parsear artículos limpios libres de publicidad cortesía de World News API.</p>
            </a>
        </div>
    </main>

    <style>
        .cyber { --accent: #00f2fe; }
        .editorial { --accent: #8B2626; }
    </style>

</body>
</html>
