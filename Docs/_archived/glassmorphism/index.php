<?php
/**
 * Glassmorphism Landing Page
 * Theme: Premium Fintech/Crypto App
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aura | Premium Wallet</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.05);
            --accent-1: #6366f1; /* Indigo */
            --accent-2: #ec4899; /* Pink */
            --accent-3: #8b5cf6; /* Violet */
            --text-primary: #ffffff;
            --text-secondary: #94a3b8;
            --bg-color: #020617; /* Very deep slate */
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* Abstract Gaseous Background */
        .bg-mesh {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -1;
            background-color: var(--bg-color);
            overflow: hidden;
        }

        .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(140px);
            opacity: 0.6;
            animation: flow 20s infinite alternate;
        }

        .blob-1 {
            background: var(--accent-1);
            width: 600px; height: 600px;
            top: -200px; left: -200px;
        }

        .blob-2 {
            background: var(--accent-2);
            width: 500px; height: 500px;
            bottom: -150px; right: -150px;
            animation-duration: 25s;
            animation-delay: -5s;
        }

        .blob-3 {
            background: var(--accent-3);
            width: 400px; height: 400px;
            top: 40%; left: 60%;
            animation-duration: 30s;
        }

        @keyframes flow {
            0% { transform: scale(1) translate(0, 0); }
            50% { transform: scale(1.2) translate(100px, 50px); }
            100% { transform: scale(0.9) translate(-50px, -50px); }
        }

        /* Navbar */
        nav {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 1200px;
            padding: 1rem 2rem;
            background: var(--glass-bg);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: 100px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 100;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: 2px;
            background: linear-gradient(to right, #fff, var(--text-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
        }

        .nav-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: color 0.3s;
        }

        .nav-links a:hover {
            color: #fff;
        }

        .cta-btn {
            background: linear-gradient(135deg, var(--accent-1), var(--accent-3));
            color: white;
            border: none;
            padding: 0.8rem 1.8rem;
            border-radius: 50px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .cta-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6);
        }

        /* Hero Section */
        .hero {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 0 2rem;
            margin-top: 60px;
        }

        .hero h1 {
            font-size: clamp(3.5rem, 8vw, 6.5rem);
            font-weight: 700;
            line-height: 1.05;
            margin-bottom: 1.5rem;
            max-width: 1000px;
            letter-spacing: -2px;
        }

        .text-gradient {
            background: linear-gradient(135deg, #fff 20%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .text-accent {
            background: linear-gradient(to right, var(--accent-2), var(--accent-3));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-style: italic;
            padding-right: 10px;
        }

        .hero p {
            font-size: 1.25rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin-bottom: 3rem;
            line-height: 1.6;
        }

        /* Glass Widget (Showcase) */
        .glass-widget {
            width: 100%;
            max-width: 800px;
            height: 400px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 32px;
            padding: 3rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2);
            position: relative;
            transform: perspective(1000px) rotateX(10deg);
            transition: transform 0.5s ease;
        }

        .glass-widget:hover {
            transform: perspective(1000px) rotateX(0deg) translateY(-10px);
        }

        .widget-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .balance {
            font-size: 3rem;
            font-weight: 700;
            color: #fff;
            margin-top: 0.5rem;
        }

        .balance span {
            font-size: 1.5rem;
            color: var(--text-secondary);
        }

        .chip {
            width: 50px;
            height: 35px;
            background: linear-gradient(135deg, #fbbf24, #d97706);
            border-radius: 6px;
            opacity: 0.8;
        }

        .widget-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .card-number {
            font-size: 1.2rem;
            letter-spacing: 4px;
            color: rgba(255,255,255,0.6);
        }

        .card-name {
            font-size: 1.1rem;
            font-weight: 500;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        
        /* Features Section */
        .features {
            padding: 8rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
            position: relative;
            z-index: 10;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .feature-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 24px;
            padding: 3rem 2rem;
            transition: transform 0.3s;
        }

        .feature-card:hover {
            transform: translateY(-8px);
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
        }

        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 1.5rem;
            display: inline-block;
            background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .feature-card h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #fff;
        }

        .feature-card p {
            color: var(--text-secondary);
            line-height: 1.6;
        }

        .back-link {
            position: fixed;
            bottom: 2rem;
            left: 2rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            z-index: 100;
            padding: 0.5rem 1rem;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border-radius: 100px;
            border: 1px solid var(--glass-border);
            transition: all 0.3s;
        }

        .back-link:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
            .nav-links { display: none; }
            .hero h1 { font-size: 3rem; }
            .glass-widget { height: 250px; padding: 1.5rem; }
            .balance { font-size: 2rem; }
        }
    </style>
</head>
<body>

    <div class="bg-mesh">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <nav>
        <div class="logo">AURA.</div>
        <ul class="nav-links">
            <li><a href="#">Features</a></li>
            <li><a href="#">Security</a></li>
            <li><a href="#">Cards</a></li>
            <li><a href="#">Company</a></li>
        </ul>
        <button class="cta-btn">Get Started</button>
    </nav>

    <main>
        <section class="hero">
            <h1 class="text-gradient">Finance that feels <br/><span class="text-accent">weightless.</span></h1>
            <p>Experience the future of banking. A wallet so beautifully crafted, it feels like it's made of pure light. Zero hidden fees. Infinite possibilities.</p>
            
            <div class="glass-widget">
                <div class="widget-header">
                    <div>
                        <div style="color: var(--text-secondary); font-size: 1rem; margin-bottom: 5px;">Total Balance</div>
                        <div class="balance">$124,592.<span>50</span></div>
                    </div>
                    <div class="chip"></div>
                </div>
                <div class="widget-footer">
                    <div class="card-name">Aura Obsidian</div>
                    <div class="card-number">•••• 4092</div>
                </div>
            </div>
        </section>

        <section class="features">
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">✨</div>
                    <h3>Liquid Assets</h3>
                    <p>Instantly convert between fiat and 50+ cryptocurrencies with zero spread. Your money, fluid and free.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🛡️</div>
                    <h3>Quantum Security</h3>
                    <p>Protected by military-grade encryption and biometric verification. Your assets are untouchable.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🌐</div>
                    <h3>Global Reach</h3>
                    <p>Spend in over 150 currencies with real-time exchange rates. No borders, no limits.</p>
                </div>
            </div>
        </section>
    </main>

    <a href="../index.php" class="back-link">← Volver al Hub</a>

</body>
</html>
