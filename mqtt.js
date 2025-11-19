// MQTT Configuration
const MQTT_BROKER = 'broker.hivemq.com';
const MQTT_PORT = 8083;
const MQTT_TOPIC_DATA = 'electrolyzer/bill/data';
const MQTT_TOPIC_COMMANDS = 'electrolyzer/bill/commands';

let mqttSocket = null;
let isConnected = false;

console.log('🏁 PEM Dashboard Initializing...');

// Simple WebSocket MQTT implementation
function connectMQTT() {
    console.log('🚀 Connecting to MQTT via WebSocket...');
    
    try {
        // Close existing connection
        if (mqttSocket) {
            mqttSocket.close();
        }
        
        // Create WebSocket connection
        mqttSocket = new WebSocket(`ws://${MQTT_BROKER}:${MQTT_PORT}/mqtt`);
        
        mqttSocket.onopen = function(event) {
            console.log('✅ WebSocket Connected to HiveMQ!');
            isConnected = true;
            document.getElementById('wifiStatus').textContent = 'CONNECTED';
            document.getElementById('wifiStatus').style.color = 'green';
            
            // Subscribe to data topic (simple MQTT over WebSocket)
            const subscribeMsg = {
                cmd: 'subscribe',
                topic: MQTT_TOPIC_DATA,
                qos: 0
            };
            mqttSocket.send(JSON.stringify(subscribeMsg));
        };
        
        mqttSocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📥 Data received:', data);
                updateDashboard(data);
                
                // Update last update time
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            } catch (e) {
                console.error('Parse error:', e);
            }
        };
        
        mqttSocket.onclose = function(event) {
            console.log('🔌 WebSocket connection closed');
            isConnected = false;
            document.getElementById('wifiStatus').textContent = 'RECONNECTING';
            document.getElementById('wifiStatus').style.color = 'orange';
            setTimeout(connectMQTT, 3000);
        };
        
        mqttSocket.onerror = function(error) {
            console.log('❌ WebSocket error:', error);
            isConnected = false;
            document.getElementById('wifiStatus').textContent = 'ERROR';
            document.getElementById('wifiStatus').style.color = 'red';
            setTimeout(connectMQTT, 5000);
        };
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        setTimeout(connectMQTT, 5000);
    }
}

// Send commands to Arduino
function sendMQTTCommand(command, value = null) {
    if (!isConnected || !mqttSocket) {
        console.log('❌ Not connected to Arduino');
        showNotification('Not connected to Arduino!', 'error');
        return;
    }
    
    const message = {
        command: command,
        timestamp: new Date().toISOString()
    };
    
    if (value !== null) message.value = value;
    
    // Send via WebSocket
    const mqttMessage = {
        cmd: 'publish',
        topic: MQTT_TOPIC_COMMANDS,
        payload: JSON.stringify(message),
        qos: 0
    };
    
    mqttSocket.send(JSON.stringify(mqttMessage));
    console.log('📤 Sent:', command, value);
}

// Update dashboard with data (keep your existing function)
function updateDashboard(data) {
    if (data.water !== undefined) {
        document.getElementById('waterVal').textContent = data.water.toFixed(1) + '%';
        updateBar('waterBar', data.water);
    }
    if (data.oxygen !== undefined) {
        document.getElementById('oxyVal').textContent = data.oxygen.toFixed(1) + '%';
        updateBar('o2Bar', data.oxygen);
    }
    if (data.hydrogen !== undefined) {
        document.getElementById('h2Val').textContent = data.hydrogen.toFixed(1) + '%';
        updateBar('h2Bar', data.hydrogen);
    }
    if (data.chamber !== undefined) {
        document.getElementById('chamberVal').textContent = data.chamber.toFixed(1) + '°C';
        updateBar('tempBar', data.chamber, 100);
    }
    if (data.production !== undefined) {
        document.getElementById('prodValue').textContent = data.production + '%';
        document.getElementById('prodSlider').value = data.production;
    }
    if (data.efficiency !== undefined) {
        document.getElementById('efficiencyText').textContent = data.efficiency.toFixed(1) + '%';
    }
    if (data.battery !== undefined) {
        document.getElementById('batteryV').textContent = data.battery.toFixed(1) + ' V';
    }
    if (data.purity !== undefined) {
        document.getElementById('purityLevel').textContent = data.purity.toFixed(1) + '%';
    }
    if (data.controllerType !== undefined) {
        document.getElementById('controllerType').textContent = data.controllerType;
    }
    if (data.systemMode !== undefined) {
        document.getElementById('currentMode').textContent = data.systemMode;
    }
}

function updateBar(barId, value, max = 100) {
    const bar = document.getElementById(barId);
    if (bar) {
        const percentage = Math.min((value / max) * 100, 100);
        bar.style.height = percentage + '%';
    }
}

// Control functions (keep your existing ones)
function setProductionRate(value) {
    console.log('🎚️ Setting production rate via MQTT:', value + '%');
    sendMQTTCommand('slider', parseInt(value));
}

function setMode(mode) {
    console.log('🔧 Setting mode via MQTT:', mode);
    sendMQTTCommand('mode', mode);
    document.getElementById('currentMode').textContent = mode;
    showNotification('Mode set to ' + mode, 'info');
}

function startSystem() {
    console.log('🚀 Starting system via MQTT');
    sendMQTTCommand('START');
    showNotification('System STARTED', 'success');
}

function stopSystem() {
    console.log('⏹️ Stopping system via MQTT');
    sendMQTTCommand('STOP');
    showNotification('System STOPPED', 'warning');
}

// Notification system (keep your existing one)
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    
    const colors = {
        success: '#1dd1a1',
        error: '#ff6b6b',
        warning: '#feca57',
        info: '#4bcffa'
    };
    
    notification.style.background = colors[type] || colors.info;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Dashboard initialization complete');
    
    // Setup slider event listener
    const slider = document.getElementById('prodSlider');
    if (slider) {
        slider.addEventListener('input', function(e) {
            const value = e.target.value;
            document.getElementById('prodValue').textContent = value + '%';
            console.log('🎚️ Slider moved to:', value + '%');
            setProductionRate(value);
        });
    }
    
    // Start MQTT connection
    setTimeout(connectMQTT, 1000);
});
