<?php
/**
 * Dark Dashboard SaaS Landing Page
 * Theme: Cyber/Neon analytics dashboard
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus | Analytics Pro</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0B0E14;
            --surface-1: #151A22;
            --surface-2: #1E2532;
            --primary: #00E5FF; /* Cyan */
            --secondary: #B100E8; /* Purple */
            --success: #00E676; /* Green */
            --warning: #FFAB00; /* Orange */
            --text-main: #FFFFFF;
            --text-muted: #8A92A6;
            --border: rgba(255, 255, 255, 0.05);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Space Grotesk', sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(177, 0, 232, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, rgba(0, 229, 255, 0.08) 0%, transparent 50%);
        }

        /* Sidebar Navigation */
        aside {
            width: 260px;
            background-color: var(--surface-1);
            border-right: 1px solid var(--border);
            padding: 2rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
            position: fixed;
            height: 100vh;
            z-index: 50;
        }

        .logo {
            font-size: 1.8rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: 1px;
        }

        .logo span {
            color: var(--primary);
        }

        .nav-menu {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .nav-menu li a {
            color: var(--text-muted);
            text-decoration: none;
            padding: 0.8rem 1rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s ease;
            font-weight: 500;
            font-size: 0.95rem;
        }

        .nav-menu li a:hover, .nav-menu li a.active {
            background-color: rgba(0, 229, 255, 0.1);
            color: var(--primary);
        }

        .nav-menu li a.active {
            border-left: 3px solid var(--primary);
        }

        /* Main Content wrapper */
        .main-wrapper {
            margin-left: 260px;
            flex: 1;
            padding: 2rem 3rem;
            max-width: 1400px;
        }

        /* Header */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
        }

        .page-title h1 {
            font-size: 1.8rem;
            font-weight: 600;
        }

        .page-title p {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-top: 0.2rem;
        }

        .header-actions {
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        .btn {
            background-color: var(--surface-2);
            color: var(--text-main);
            border: 1px solid var(--border);
            padding: 0.6rem 1.2rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
        }

        .btn-primary {
            background-color: var(--primary);
            color: var(--bg-color);
            border: none;
            font-weight: 700;
            box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
        }

        .btn-primary:hover {
            box-shadow: 0 0 25px rgba(0, 229, 255, 0.6);
            transform: translateY(-2px);
        }

        /* Dashboard Grid */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 1.5rem;
        }

        .card {
            background-color: var(--surface-1);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
            transition: border-color 0.3s;
        }

        .card:hover {
            border-color: rgba(255, 255, 255, 0.15);
        }

        /* Top Metrics Row */
        .metric-card {
            grid-column: span 3;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }

        .metric-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 100%; height: 2px;
        }

        .metric-1::before { background-color: var(--primary); }
        .metric-2::before { background-color: var(--secondary); }
        .metric-3::before { background-color: var(--success); }
        .metric-4::before { background-color: var(--warning); }

        .metric-title {
            color: var(--text-muted);
            font-size: 0.9rem;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -1px;
        }

        .trend {
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .trend.up { color: var(--success); }
        .trend.down { color: #FF1744; }

        /* Main Chart Area */
        .chart-main {
            grid-column: span 8;
            height: 400px;
            display: flex;
            flex-direction: column;
        }

        .chart-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
        }

        .chart-visual {
            flex: 1;
            position: relative;
            background: 
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 100% 25px, 25px 100%;
            border-bottom: 1px solid var(--border);
            border-left: 1px solid var(--border);
            display: flex;
            align-items: flex-end;
            gap: 15px;
            padding: 0 15px;
        }

        /* Fake Bar Chart */
        .bar {
            flex: 1;
            background: linear-gradient(180deg, var(--primary) 0%, rgba(0, 229, 255, 0.1) 100%);
            border-radius: 4px 4px 0 0;
            opacity: 0.8;
            transition: opacity 0.3s, height 1s ease-out;
            position: relative;
        }

        .bar:hover {
            opacity: 1;
            box-shadow: 0 0 15px rgba(0, 229, 255, 0.4);
        }

        .bar::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background-color: #fff;
            box-shadow: 0 0 10px #fff;
        }

        /* Activity Feed Area */
        .activity-feed {
            grid-column: span 4;
            height: 400px;
            overflow: hidden;
        }

        .feed-list {
            margin-top: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.2rem;
        }

        .feed-item {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
        }

        .feed-icon {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background-color: var(--surface-2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            flex-shrink: 0;
        }

        .feed-item:nth-child(2) .feed-icon { color: var(--secondary); }
        .feed-item:nth-child(3) .feed-icon { color: var(--success); }

        .feed-info p {
            font-size: 0.9rem;
            margin-bottom: 0.2rem;
        }

        .feed-time {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        /* Bottom Table */
        .data-table-container {
            grid-column: span 12;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        th, td {
            text-align: left;
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
        }

        th {
            color: var(--text-muted);
            font-weight: 500;
        }

        .status {
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .status.active { background: rgba(0, 230, 118, 0.1); color: var(--success); }
        .status.pending { background: rgba(255, 171, 0, 0.1); color: var(--warning); }

        @media (max-width: 1024px) {
            aside { display: none; }
            .main-wrapper { margin-left: 0; padding: 1.5rem; }
            .metric-card { grid-column: span 6; }
            .chart-main { grid-column: span 12; }
            .activity-feed { grid-column: span 12; height: auto; }
        }

        .back-link {
            position: absolute;
            bottom: 2rem;
            left: 1.5rem;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: color 0.3s;
        }

        .back-link:hover { color: var(--text-main); }
    </style>
</head>
<body>

    <aside>
        <div class="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
            NEXUS<span>.</span>
        </div>
        
        <ul class="nav-menu">
            <li><a href="#" class="active">Overview</a></li>
            <li><a href="#">Analytics</a></li>
            <li><a href="#">Campaigns</a></li>
            <li><a href="#">Customers</a></li>
            <li><a href="#">Reports</a></li>
            <li><a href="#">Settings</a></li>
        </ul>

        <a href="../index.php" class="back-link">← Return to Hub</a>
    </aside>

    <main class="main-wrapper">
        <header>
            <div class="page-title">
                <h1>Dashboard Overview</h1>
                <p>Welcome back! Here's what's happening today.</p>
            </div>
            <div class="header-actions">
                <button class="btn">Export CSV</button>
                <button class="btn btn-primary">Generate Report</button>
            </div>
        </header>

        <div class="dashboard-grid">
            <!-- Metrics -->
            <div class="card metric-card metric-1">
                <div class="metric-title">
                    Total Revenue
                    <span class="trend up">↑ 12.5%</span>
                </div>
                <div class="metric-value">$84,592.00</div>
            </div>
            <div class="card metric-card metric-2">
                <div class="metric-title">
                    Active Users
                    <span class="trend up">↑ 5.2%</span>
                </div>
                <div class="metric-value">12,405</div>
            </div>
            <div class="card metric-card metric-3">
                <div class="metric-title">
                    Conversion Rate
                    <span class="trend down">↓ 1.1%</span>
                </div>
                <div class="metric-value">4.62%</div>
            </div>
            <div class="card metric-card metric-4">
                <div class="metric-title">
                    Server Load
                    <span class="trend up">Normal</span>
                </div>
                <div class="metric-value">24%</div>
            </div>

            <!-- Main Chart -->
            <div class="card chart-main">
                <div class="chart-header">
                    <h3>Revenue Analytics</h3>
                    <select class="btn" style="padding: 0.3rem; border: none; background: transparent;">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                    </select>
                </div>
                <div class="chart-visual">
                    <div class="bar" style="height: 40%;"></div>
                    <div class="bar" style="height: 60%;"></div>
                    <div class="bar" style="height: 35%;"></div>
                    <div class="bar" style="height: 80%;"></div>
                    <div class="bar" style="height: 50%;"></div>
                    <div class="bar" style="height: 95%;"></div>
                    <div class="bar" style="height: 70%;"></div>
                </div>
            </div>

            <!-- Feed -->
            <div class="card activity-feed">
                <h3>Live Feed</h3>
                <div class="feed-list">
                    <div class="feed-item">
                        <div class="feed-icon">⚡</div>
                        <div class="feed-info">
                            <p>New enterprise subscription <b>Stark Ind.</b></p>
                            <span class="feed-time">2 mins ago</span>
                        </div>
                    </div>
                    <div class="feed-item">
                        <div class="feed-icon">◆</div>
                        <div class="feed-info">
                            <p>Database backup completed successfully</p>
                            <span class="feed-time">45 mins ago</span>
                        </div>
                    </div>
                    <div class="feed-item">
                        <div class="feed-icon">●</div>
                        <div class="feed-info">
                            <p>Payment gateway API key rotated</p>
                            <span class="feed-time">3 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table -->
            <div class="card data-table-container">
                <h3>Recent Transactions</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#TRX-8942</td>
                            <td>Elena Rodriguez</td>
                            <td>Oct 24, 2026</td>
                            <td>$1,200.00</td>
                            <td><span class="status active">Completed</span></td>
                        </tr>
                        <tr>
                            <td>#TRX-8941</td>
                            <td>Marcus Chen</td>
                            <td>Oct 24, 2026</td>
                            <td>$450.00</td>
                            <td><span class="status active">Completed</span></td>
                        </tr>
                        <tr>
                            <td>#TRX-8940</td>
                            <td>Sarah Jenkins</td>
                            <td>Oct 23, 2026</td>
                            <td>$3,400.00</td>
                            <td><span class="status pending">Processing</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    </main>

</body>
</html>
