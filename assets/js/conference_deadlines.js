document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const infoBox = document.getElementById('info-box');
    const loadingMsg = document.getElementById('loading-msg');

    // Disable smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;

    // --- 1. FETCH DATA ---
    fetch('assets/data/conference_deadlines.json')
        .then(response => {
            if (!response.ok) throw new Error("Could not load JSON");
            return response.json();
        })
        .then(rawData => {
            // Hide loading message
            loadingMsg.style.display = 'none';
            
            // Process and Render
            initTimeline(rawData);
        })
        .catch(err => {
            console.error(err);
            loadingMsg.innerText = "Error loading data. Check console.";
            loadingMsg.style.color = "#d95763";
        });

    // --- 2. INITIALIZATION & DRAWING ---
    function initTimeline(rawData) {
        // Process Data: Parse dates and sort
        const conferences = rawData.map(c => ({
            ...c,
            timestamp: new Date(c.deadline).getTime()
        })).sort((a, b) => a.timestamp - b.timestamp);

        // Config
        const C_SKY = "#8b9bb4";
        const C_GROUND = "#6abe30";
        const C_PATH = "#9badb7";
        const C_FLAG_POLE = "#5e4435";
        const C_FLAG_PAST = "#d95763";
        const C_FLAG_URGENT = "#fbf236";
        const C_FLAG_UPCOMING = "#AAFF00";
        
        const PADDING_X = 60;
        const GROUND_Y = 300;
        const FLAG_HEIGHT = 60;
        const usableWidth = canvas.width - (PADDING_X * 2);

        // Calculate Time Range
        const minTime = conferences[0].timestamp;
        const maxTime = conferences[conferences.length - 1].timestamp;
        const totalDuration = maxTime - minTime + (1000 * 60 * 60 * 24 * 60); // Buffer
        const startTime = minTime - (1000 * 60 * 60 * 24 * 15);

        function getX(timestamp) {
            const progress = (timestamp - startTime) / totalDuration;
            return PADDING_X + (progress * usableWidth);
        }

        function drawPixelRect(x, y, w, h, color) {
            ctx.fillStyle = color;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Sky & Ground
            drawPixelRect(0, 0, canvas.width, canvas.height, C_SKY);
            drawPixelRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y, C_GROUND);
            
            // Path
            ctx.strokeStyle = C_PATH;
            ctx.lineWidth = 8;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(PADDING_X, GROUND_Y - 10);
            ctx.lineTo(canvas.width - PADDING_X, GROUND_Y - 10);
            ctx.stroke();
            ctx.setLineDash([]);

            // Clouds (Decorative)
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.fillRect(100, 50, 60, 20);
            ctx.fillRect(600, 80, 80, 25);

            // Draw Flags
            conferences.forEach(conf => {
                const x = getX(conf.timestamp);
                const y = GROUND_Y - 10;
                const now = new Date().getTime();
                const diffDays = (conf.timestamp - now) / (1000 * 60 * 60 * 24);
                
                let flagColor = C_FLAG_UPCOMING;
                if (diffDays < 0) flagColor = C_FLAG_PAST;
                else if (diffDays < 30) flagColor = C_FLAG_URGENT;

                // Pole
                drawPixelRect(x, y - FLAG_HEIGHT, 4, FLAG_HEIGHT, C_FLAG_POLE);
                
                // Flag Triangle
                ctx.fillStyle = flagColor;
                ctx.beginPath();
                ctx.moveTo(x + 4, y - FLAG_HEIGHT);
                ctx.lineTo(x + 4, y - FLAG_HEIGHT + 20);
                ctx.lineTo(x + 30, y - FLAG_HEIGHT + 10);
                ctx.fill();
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.font = "10px 'Press Start 2P'";
                ctx.fillStyle = "#000";
                ctx.textAlign = "center";
                ctx.fillText(conf.name, x + 15, y - FLAG_HEIGHT - 10);
                
                // Store hit area for interaction
                conf.hitArea = { x: x - 15, y: y - FLAG_HEIGHT - 20, w: 60, h: 100 };
            });
        }

        // --- 3. INTERACTION ---
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            let hovered = null;
            conferences.forEach(conf => {
                if (conf.hitArea && 
                    mouseX >= conf.hitArea.x && mouseX <= conf.hitArea.x + conf.hitArea.w &&
                    mouseY >= conf.hitArea.y && mouseY <= conf.hitArea.y + conf.hitArea.h) {
                    hovered = conf;
                }
            });

            if (hovered) {
                canvas.style.cursor = "pointer";
                showInfo(hovered, e.clientX, e.clientY);
            } else {
                canvas.style.cursor = "default";
                infoBox.style.display = "none";
            }
        });

        function showInfo(conf, mouseX, mouseY) {
            const now = new Date().getTime();
            const diffDays = Math.ceil((conf.timestamp - now) / (1000 * 60 * 60 * 24));
            
            let statusText = diffDays < 0 ? "DEADLINE PASSED" : `DUE IN ${diffDays} DAYS`;
            let statusColor = diffDays < 0 ? "#666" : (diffDays < 30 ? "#d95763" : "#639bff");

            infoBox.innerHTML = `
                <h2>${conf.name}</h2>
                <div class="${statusColor === '#666' ? 'status-past' : (statusColor === '#d95763' ? 'status-soon' : 'status-upcoming')}" style="margin-bottom:8px;">${statusText}</div>
                <div style="color:#555; margin-bottom:5px;">${conf.deadline}</div>
            `;
            
            infoBox.style.display = "block";
            
            // Positioning logic
            let left = mouseX + 20;
            let top = mouseY + 20;
            if (left + 250 > window.innerWidth) left = mouseX - 270;
            
            infoBox.style.left = left + "px";
            infoBox.style.top = top + "px";
        }

        // Initial Draw
        render();
    }
});
