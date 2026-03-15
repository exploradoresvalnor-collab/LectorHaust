<?php
/**
 * Interactive Storytelling Landing Page
 * Theme: Space Exploration / Immersive Narrative
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Artemis | Humanity's Next Step</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #030712;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #d4af37; /* Pale Gold */
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            scrollbar-width: none; /* Firefox */
        }

        *::-webkit-scrollbar { display: none; } /* Chrome */

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            font-family: 'Montserrat', sans-serif;
            overflow-x: hidden;
            perspective: 1px;
            transform-style: preserve-3d;
            height: 100vh;
            overflow-y: auto;
            scroll-behavior: smooth;
        }

        h1, h2, h3 {
            font-family: 'Cinzel', serif;
        }

        /* Fixed Background Stars */
        .stars {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            z-index: -2;
            background: 
                radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
                radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), rgba(0,0,0,0)),
                radial-gradient(1.5px 1.5px at 50px 160px, rgba(255,255,255,0.7), rgba(0,0,0,0)),
                radial-gradient(2px 2px at 90px 40px, rgba(255,255,255,0.9), rgba(0,0,0,0)),
                radial-gradient(1px 1px at 130px 80px, #ffffff, rgba(0,0,0,0));
            background-repeat: repeat;
            background-size: 200px 200px;
            animation: moveStars 150s linear infinite;
        }

        @keyframes moveStars {
            from { transform: translateY(0); }
            to { transform: translateY(-2000px); }
        }

        /* Narrative Sections */
        .section {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 4rem;
            position: relative;
            transform-style: preserve-3d;
        }

        .content-box {
            max-width: 800px;
            text-align: center;
        }

        /* Parallax Elements */
        .parallax-bg {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: -1;
            transform: translateZ(-1px) scale(2);
            background-size: cover;
            background-position: center;
            opacity: 0.3;
        }

        .moon-bg {
            background-image: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 60%);
        }

        /* Typography */
        .chapter {
            font-size: 0.9rem;
            letter-spacing: 6px;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 2rem;
            display: inline-block;
            border-bottom: 1px solid var(--accent);
            padding-bottom: 0.5rem;
        }

        .title {
            font-size: clamp(3rem, 8vw, 6rem);
            font-weight: 700;
            line-height: 1.1;
            margin-bottom: 2rem;
            text-shadow: 0 0 40px rgba(255,255,255,0.3);
            background: linear-gradient(to bottom, #fff, #888);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .text {
            font-size: 1.2rem;
            line-height: 2;
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto;
        }

        /* Interactive Elements */
        .scroll-indicator {
            position: absolute;
            bottom: 3rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            opacity: 0.7;
            animation: pulse 2s infinite;
        }

        .mouse {
            width: 26px;
            height: 40px;
            border: 2px solid var(--text-main);
            border-radius: 20px;
            position: relative;
        }

        .wheel {
            width: 4px;
            height: 6px;
            background: var(--text-main);
            border-radius: 2px;
            position: absolute;
            top: 6px;
            left: 50%;
            transform: translateX(-50%);
            animation: scroll 1.5s infinite;
        }

        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes scroll { 0% { top: 6px; opacity: 1; } 100% { top: 20px; opacity: 0; } }

        /* Story specific elements */
        .quote {
            font-style: italic;
            font-size: 1.8rem;
            color: #fff;
            border-left: 3px solid var(--accent);
            padding-left: 2rem;
            margin: 3rem auto;
            max-width: 700px;
            text-align: left;
        }

        .timeline {
            margin-top: 4rem;
            display: flex;
            justify-content: center;
            gap: 4rem;
            flex-wrap: wrap;
        }

        .time-point {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }

        .year {
            font-family: 'Cinzel', serif;
            font-size: 2rem;
            color: var(--accent);
        }

        .event { font-size: 0.9rem; color: var(--text-muted); }

        .btn-orbit {
            display: inline-block;
            margin-top: 3rem;
            padding: 1rem 3rem;
            border: 1px solid var(--accent);
            color: var(--accent);
            text-decoration: none;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-size: 0.9rem;
            transition: all 0.4s;
            position: relative;
            overflow: hidden;
            background: transparent;
        }

        .btn-orbit::before {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: rgba(212, 175, 55, 0.1);
            transition: all 0.4s;
            z-index: -1;
        }

        .btn-orbit:hover::before { left: 0; }
        .btn-orbit:hover { box-shadow: 0 0 20px rgba(212, 175, 55, 0.4); }

        /* Observer Animation Classes */
        .reveal {
            opacity: 0;
            transform: translateY(50px);
            transition: all 1.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }

        @media (max-width: 768px) {
            .section { padding: 5rem 2rem; }
            .quote { font-size: 1.4rem; padding-left: 1.5rem; }
            .timeline { gap: 2rem; flex-direction: column; }
        }

        .back-nav {
            position: fixed;
            top: 2rem;
            left: 2rem;
            z-index: 100;
            mix-blend-mode: difference;
        }

        .back-nav a {
            color: #fff;
            text-decoration: none;
            font-family: 'Cinzel', serif;
            letter-spacing: 2px;
            font-size: 0.9rem;
            opacity: 0.7;
            transition: opacity 0.3s;
        }

        .back-nav a:hover { opacity: 1; border-bottom: 1px solid #fff; }
    </style>
</head>
<body>

    <div class="stars"></div>

    <div class="back-nav">
        <a href="../index.php">← Mission Control</a>
    </div>

    <section class="section" id="intro">
        <div class="parallax-bg moon-bg"></div>
        <div class="content-box reveal">
            <div class="chapter">Prologue</div>
            <h1 class="title">The Final Frontier</h1>
            <p class="text">For thousands of years, humanity has looked up at the stars and wondered. The time for wondering is over. The time for ascending has arrived.</p>
            
            <div class="scroll-indicator">
                <div class="mouse"><div class="wheel"></div></div>
                <span style="font-size: 0.7rem; letter-spacing: 3px; color: var(--text-muted); text-transform:uppercase;">Begin Descent</span>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="content-box">
            <div class="chapter reveal">Chapter I</div>
            <h2 class="title reveal">The Great Silence</h2>
            <p class="text reveal">We listened to the cosmos and heard nothing but the static of creation. Rather than despair, we found purpose. If the universe is empty, it is ours to fill.</p>
            
            <div class="quote reveal">
                "We are not passengers on spaceship Earth. We are the crew. And it is time we built a second vessel."
            </div>
        </div>
    </section>

    <section class="section">
        <div class="content-box">
            <div class="chapter reveal">Chapter II</div>
            <h2 class="title reveal">Project Artemis</h2>
            <p class="text reveal">The construction of the largest orbital structure in human history. A self-sustaining biosphere suspended in the void, designed to carry fifty thousand souls beyond the Kuiper belt.</p>
            
            <div class="timeline reveal">
                <div class="time-point">
                    <span class="year">2030</span>
                    <span class="event">Keel Laid in Orbit</span>
                </div>
                <div class="time-point">
                    <span class="year">2042</span>
                    <span class="event">Hull Pressurization</span>
                </div>
                <div class="time-point">
                    <span class="year">2050</span>
                    <span class="event">Launch Window</span>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="content-box reveal">
            <h2 class="title" style="font-size: clamp(2rem, 5vw, 4rem);">Secure Your Legacy.</h2>
            <p class="text">The manifest is filling rapidly. Join the few who will seed the stars.</p>
            <a href="#" class="btn-orbit">Apply for Boarding</a>
        </div>
    </section>

    <script>
        // Simple Intersection Observer for scroll animations
        document.addEventListener('DOMContentLoaded', () => {
            const reveals = document.querySelectorAll('.reveal');
            
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.15
            };
            
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, observerOptions);
            
            reveals.forEach(reveal => {
                observer.observe(reveal);
            });
            
            // Trigger immediately for initial viewport (Prologue)
            setTimeout(() => {
                document.querySelectorAll('#intro .reveal').forEach(el => el.classList.add('active'));
            }, 300);
        });
    </script>
</body>
</html>
