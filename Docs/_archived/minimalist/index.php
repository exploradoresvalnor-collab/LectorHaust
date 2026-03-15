<?php
/**
 * Minimalist Landing Page
 * Theme: Brutalist/Clean Architecture & Design Agency
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>STUDIO ZERO | Minimalist Agency</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #fcfcfc;
            --text-main: #0a0a0a;
            --accent: #ff3300;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
        }

        /* Essentialist Navbar */
        nav {
            padding: 2rem 4rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--text-main);
        }

        .logo {
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: -2px;
            text-transform: uppercase;
        }

        .menu-btn {
            font-size: 1rem;
            font-weight: 600;
            text-transform: uppercase;
            cursor: pointer;
            position: relative;
        }

        .menu-btn::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 2px;
            bottom: -4px;
            left: 0;
            background-color: var(--text-main);
            transform: scaleX(0);
            transform-origin: bottom right;
            transition: transform 0.3s ease-out;
        }

        .menu-btn:hover::after {
            transform: scaleX(1);
            transform-origin: bottom left;
        }

        /* Massive Hero Section */
        .hero {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 4rem;
            position: relative;
        }

        .hero h1 {
            font-size: clamp(4rem, 12vw, 15rem);
            font-weight: 900;
            line-height: 0.85;
            letter-spacing: -0.05em;
            text-transform: uppercase;
            margin-bottom: 2rem;
            max-width: 1400px;
        }

        .text-accent {
            color: var(--accent);
        }

        .hero-meta {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 4rem;
            border-top: 2px solid var(--text-main);
            padding-top: 2rem;
        }

        .hero-desc {
            font-size: 1.5rem;
            font-weight: 400;
            max-width: 500px;
            line-height: 1.4;
            color: #404040;
        }

        .scroll-down {
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .scroll-line {
            width: 50px;
            height: 2px;
            background-color: var(--text-main);
        }

        /* Projects Section (Minimalist List) */
        .projects {
            padding: 8rem 4rem;
        }

        .projects-title {
            font-size: 1rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .projects-title::before {
            content: '';
            width: 20px;
            height: 20px;
            background-color: var(--accent);
            display: inline-block;
        }

        .project-list {
            list-style: none;
            border-top: 2px solid var(--text-main);
        }

        .project-item {
            border-bottom: 2px solid var(--text-main);
        }

        .project-link {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3rem 0;
            text-decoration: none;
            color: var(--text-main);
            font-size: 4rem;
            font-weight: 900;
            letter-spacing: -2px;
            text-transform: uppercase;
            transition: padding-left 0.3s ease;
        }

        .project-link:hover {
            padding-left: 2rem;
            color: var(--accent);
        }

        .project-year {
            font-size: 1.5rem;
            font-weight: 400;
            color: #737373;
        }

        /* Footer */
        footer {
            padding: 4rem;
            background-color: var(--text-main);
            color: var(--bg-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .footer-logo {
            font-size: 1.5rem;
            font-weight: 900;
            letter-spacing: -1px;
        }

        .back-link {
            color: var(--bg-color);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid var(--bg-color);
            padding-bottom: 0.2rem;
        }

        .back-link:hover {
            color: var(--accent);
            border-bottom-color: var(--accent);
        }

        @media (max-width: 768px) {
            nav { padding: 1.5rem 2rem; }
            .hero { padding: 2rem; }
            .hero-meta { flex-direction: column; align-items: flex-start; gap: 2rem; }
            .projects { padding: 4rem 2rem; }
            .project-link { font-size: 2.5rem; flex-direction: column; align-items: flex-start; gap: 1rem; }
            footer { padding: 4rem 2rem; flex-direction: column; gap: 2rem; align-items: flex-start; }
            .project-link:hover { padding-left: 0; }
        }
    </style>
</head>
<body>

    <nav>
        <div class="logo">ZERO</div>
        <div class="menu-btn">Menu</div>
    </nav>

    <main>
        <section class="hero">
            <h1>Less <br/> is <span class="text-accent">More.</span></h1>
            
            <div class="hero-meta">
                <p class="hero-desc">We strip away the non-essential to reveal the true essence of brands, architecture, and digital experiences.</p>
                <div class="scroll-down">
                    Scroll <div class="scroll-line"></div>
                </div>
            </div>
        </section>

        <section class="projects">
            <h2 class="projects-title">Selected Works</h2>
            <ul class="project-list">
                <li class="project-item">
                    <a href="#" class="project-link">
                        <span>The Void Gallery</span>
                        <span class="project-year">2026</span>
                    </a>
                </li>
                <li class="project-item">
                    <a href="#" class="project-link">
                        <span>Monolith Terminal</span>
                        <span class="project-year">2025</span>
                    </a>
                </li>
                <li class="project-item">
                    <a href="#" class="project-link">
                        <span>Silent House</span>
                        <span class="project-year">2024</span>
                    </a>
                </li>
            </ul>
        </section>
    </main>

    <footer>
        <div class="footer-logo">STUDIO ZERO © 2026</div>
        <a href="../index.php" class="back-link">Return to Hub</a>
    </footer>

</body>
</html>
