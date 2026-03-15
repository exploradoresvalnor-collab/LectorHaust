<?php
/**
 * Bento Grid Landing Page
 * Theme: Apple-style Productivity App Showcase
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Focus. | The Productivity OS</title>
    <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f5f5f7;
            --text-main: #1d1d1f;
            --text-muted: #86868b;
            --card-bg: #ffffff;
            --accent: #0071e3;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            /* Fallback to Inter if SF Pro Display (Mac native) isn't available */
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
            -webkit-font-smoothing: antialiased;
        }

        /* Nav */
        nav {
            width: 100%;
            max-width: 1100px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            margin-bottom: 3rem;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.5px;
        }

        .btn-primary {
            background-color: var(--text-main);
            color: white;
            padding: 0.6rem 1.2rem;
            border-radius: 20px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: transform 0.2s, background 0.2s;
        }

        .btn-primary:hover {
            transform: scale(1.05);
            background-color: #000;
        }

        /* Hero */
        header {
            text-align: center;
            max-width: 800px;
            margin-bottom: 4rem;
        }

        h1 {
            font-size: clamp(3rem, 6vw, 5rem);
            font-weight: 700;
            letter-spacing: -0.04em;
            line-height: 1.1;
            margin-bottom: 1rem;
        }

        .subtitle {
            font-size: 1.4rem;
            color: var(--text-muted);
            font-weight: 400;
            letter-spacing: -0.01em;
        }

        /* Bento Grid */
        .bento-container {
            width: 100%;
            max-width: 1100px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-auto-rows: 250px;
            gap: 1.5rem;
            margin-bottom: 5rem;
        }

        .bento-card {
            background: var(--card-bg);
            border-radius: 32px;
            padding: 2rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.02);
        }

        .bento-card:hover {
            transform: translateY(-5px) scale(1.01);
            box-shadow: 0 10px 40px rgba(0,0,0,0.06), 0 2px 10px rgba(0,0,0,0.04);
        }

        .card-large { grid-column: span 2; grid-row: span 2; }
        .card-wide { grid-column: span 2; grid-row: span 1; }
        .card-tall { grid-column: span 1; grid-row: span 2; }
        .card-small { grid-column: span 1; grid-row: span 1; }

        /* Card Content */
        h3 {
            font-size: 1.5rem;
            font-weight: 600;
            letter-spacing: -0.02em;
            margin-bottom: 0.5rem;
            z-index: 2;
        }

        p {
            color: var(--text-muted);
            font-size: 1.1rem;
            line-height: 1.5;
            z-index: 2;
        }

        .card-large h3 { font-size: 2.2rem; }
        
        /* Graphics */
        .graph-mockup {
            margin-top: auto;
            align-self: center;
            width: 100%;
            height: 60%;
            background: linear-gradient(180deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 113, 227, 0) 100%);
            border-radius: 16px 16px 0 0;
            position: relative;
            z-index: 1;
        }

        .graph-mockup::after {
            content: '';
            position: absolute;
            bottom: 0; left: 10%; width: 80%; height: 60%;
            background: var(--accent);
            border-radius: 8px 8px 0 0;
            box-shadow: -40px 20px 0 0 rgba(0,113,227,0.4), 40px 40px 0 0 rgba(0,113,227,0.7);
        }

        .icon-large {
            font-size: 4rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #FF9500, #FF2D55);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .task-list {
            margin-top: 1.5rem;
            list-style: none;
        }

        .task-list li {
            padding: 1rem;
            background: var(--bg-color);
            border-radius: 12px;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.95rem;
            font-weight: 500;
        }

        .task-list li::before {
            content: '';
            width: 18px;
            height: 18px;
            border-radius: 5px;
            border: 2px solid var(--text-muted);
        }

        .task-list li.done::before {
            background-color: var(--accent);
            border-color: var(--accent);
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>');
            background-size: 12px;
            background-position: center;
            background-repeat: no-repeat;
        }

        .text-center { text-align: center; align-items: center; justify-content: center; }

        /* Responsive Grid */
        @media (max-width: 900px) {
            .bento-container {
                grid-template-columns: repeat(2, 1fr);
            }
            .card-large, .card-wide { grid-column: span 2; }
            .card-tall, .card-small { grid-column: span 1; }
        }

        @media (max-width: 600px) {
            .bento-container {
                display: flex;
                flex-direction: column;
            }
            .bento-card { min-height: 250px; }
            h1 { font-size: 2.5rem; }
        }

        .back-link {
            position: fixed;
            bottom: 2rem;
            left: 2rem;
            color: var(--text-muted);
            text-decoration: none;
            font-weight: 500;
            background: white;
            padding: 0.8rem 1.5rem;
            border-radius: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            transition: all 0.3s;
            z-index: 100;
        }

        .back-link:hover {
            color: var(--text-main);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>

    <nav>
        <div class="logo">Focus.</div>
        <a href="#" class="btn-primary">Download App</a>
    </nav>

    <header>
        <h1>Your work, perfectly organized.</h1>
        <p class="subtitle">Experience a new level of productivity with intuitive tools, elegant design, and seamless synchronization.</p>
    </header>

    <main class="bento-container">
        
        <div class="bento-card card-large">
            <h3>Analytics & Insights</h3>
            <p>Understand how you spend your time with beautiful, interactive charts.</p>
            <div class="graph-mockup"></div>
        </div>

        <div class="bento-card card-tall text-center">
            <div class="icon-large">⚡</div>
            <h3>Deep Work Mode</h3>
            <p style="margin-top:1rem;">Block distractions instantly with a single tap.</p>
        </div>

        <div class="bento-card card-small text-center" style="background: var(--text-main); color: white;">
            <h3 style="color:white; font-size:3rem;">2.5h</h3>
            <p style="color:#a1a1aa;">Avg. daily time saved</p>
        </div>

        <div class="bento-card card-wide">
            <h3>Smart Tasks</h3>
            <p>AI-powered prioritization.</p>
            <ul class="task-list">
                <li class="done" style="opacity: 0.6; text-decoration: line-through;">Review Q3 Marketing Strategy</li>
                <li>Design new landing page</li>
                <li>Weekly sync with engineering</li>
            </ul>
        </div>

        <div class="bento-card card-small text-center">
            <div style="font-size: 2.5rem; color: var(--accent); margin-bottom: 0.5rem;">Sync</div>
            <p>iCloud, Google, Notion instantly.</p>
        </div>

    </main>

    <a href="../index.php" class="back-link">← Hub</a>

</body>
</html>
