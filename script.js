// MQTT Global Variables
let mqttClient = null;
let isMQTTConnected = false;

// Initialize MQTT Connection
function initMQTT() {
    console.log('🚀 Initializing MQTT connection...');
    
    const clientId = 'pem-dashboard-' + Math.random().toString(16).substr(2, 8);
    mqttClient = new Paho.MQTT.Client('broker.hivemq.com', 8083, clientId);
    
    // Set callback handlers
    mqttClient.onConnectionLost = onConnectionLost;
    mqttClient.onMessageArrived = onMessageArrived;
    
    // Connect the client
    const options = {
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: true,
        timeout: 3,
        keepAliveInterval: 30,
        cleanSession: true
    };
    
    console.log('🔗 Connecting to MQTT broker...');
    mqttClient.connect(options);
}

function onConnect() {
    console.log('✅ MQTT Connected successfully!');
    isMQTTConnected = true;
    updateConnectionStatus('CONNECTED', true);
    
    // Subscribe to Arduino data topic
    mqttClient.subscribe('electrolyzer/bill/data');
    console.log('👂 Subscribed to: electrolyzer/bill/data');
    
    // Update UI to show connected
    document.getElementById('wifiStatus').textContent = 'CONNECTED';
    document.getElementById('wifiStatus').style.color = '#4CAF50';
}

function onFailure(error) {
    console.log('❌ MQTT Connection failed:', error.errorMessage);
    isMQTTConnected = false;
    updateConnectionStatus('DISCONNECTED', false);
    
    // Try to reconnect after 3 seconds
    setTimeout(initMQTT, 3000);
}

function onConnectionLost(response) {
    console.log('🔌 MQTT Connection lost:', response.errorMessage);
    isMQTTConnected = false;
    updateConnectionStatus('RECONNECTING...', false);
    
    // Auto-reconnect
    setTimeout(initMQTT, 2000);
}

function onMessageArrived(message) {
    try {
        const data = JSON.parse(message.payloadString);
        console.log('📥 MQTT Data received:', data);
        updateDashboard(data);
    } catch (error) {
        console.error('❌ Error parsing MQTT data:', error);
    }
}

// Send commands to Arduino via MQTT
function sendMQTTCommand(command, value = null) {
    if (!isMQTTConnected || !mqttClient) {
        console.log('❌ NOT CONNECTED - cannot send command');
        showNotification('Not connected to Arduino', 'error');
        return false;
    }
    
    const message = {
        command: command,
        timestamp: new Date().toISOString()
    };
    
    if (value !== null) {
        message.value = value;
    }
    
    try {
        const mqttMessage = new Paho.MQTT.Message(JSON.stringify(message));
        mqttMessage.destinationName = 'electrolyzer/bill/commands';
        mqttClient.send(mqttMessage);
        console.log(`📤 MQTT Command sent: ${command}`, value ? `Value: ${value}` : '');
        showNotification(`Command sent: ${command}`, 'success');
        return true;
    } catch (error) {
        console.error('❌ Error sending MQTT command:', error);
        showNotification('Failed to send command', 'error');
        return false;
    }
}

// Update dashboard with live data from Arduino
function updateDashboard(data) {
    console.log('🔄 Updating dashboard with MQTT data');
    
    // Update basic sensor values
    if (data.water !== undefined) {
        document.getElementById('waterVal').textContent = data.water.toFixed(1) + '%';
        updateVerticalBar('waterBar', data.water);
    }
    
    if (data.oxygen !== undefined) {
        document.getElementById('oxyVal').textContent = data.oxygen.toFixed(1) + '%';
        updateVerticalBar('o2Bar', data.oxygen);
    }
    
    if (data.hydrogen !== undefined) {
        document.getElementById('h2Val').textContent = data.hydrogen.toFixed(1) + '%';
        updateVerticalBar('h2Bar', data.hydrogen);
    }
    
    if (data.chamber !== undefined) {
        document.getElementById('chamberVal').textContent = data.chamber.toFixed(1) + '°C';
        updateVerticalBar('tempBar', data.chamber, 100);
    }
    
    if (data.efficiency !== undefined) {
        document.getElementById('efficiencyText').textContent = data.efficiency.toFixed(1) + '%';
        if (window.updateEfficiency) {
            window.updateEfficiency(data.efficiency);
        }
    }
    
    if (data.purity !== undefined) {
        document.getElementById('purityVal').textContent = data.purity.toFixed(1) + '%';
    }
    
    if (data.battery !== undefined) {
        document.getElementById('batteryV').textContent = data.battery.toFixed(1) + ' V';
    }
    
    // Update production rate
    if (data.production !== undefined) {
        document.getElementById('prodValue').textContent = data.production.toFixed(0) + '%';
        const slider = document.getElementById('prodSlider');
        if (slider) slider.value = data.production;
    }
    
    // Update system status
    if (data.systemRunning !== undefined) {
        const statusBtn = document.getElementById('systemStatusBtn');
        if (statusBtn) {
            if (data.systemRunning) {
                statusBtn.textContent = 'RUNNING: GOOD';
                statusBtn.style.backgroundColor = '#4CAF50';
            } else {
                statusBtn.textContent = 'STOPPED';
                statusBtn.style.backgroundColor = '#f44336';
            }
        }
    }
    
    if (data.systemMode !== undefined) {
        document.getElementById('modeStatus').textContent = data.systemMode;
    }
    
    // Update timestamp
    if (data.timestamp) {
        document.getElementById('dateTime').textContent = data.timestamp;
        document.getElementById('lastUpdatedBtn').textContent = 'Last: ' + data.timestamp;
    }
    
    // Update additional data if available
    if (data.voltage !== undefined) document.getElementById('voltage').textContent = data.voltage.toFixed(1) + ' V';
    if (data.current !== undefined) document.getElementById('current').textContent = data.current.toFixed(1) + ' A';
    if (data.power !== undefined) document.getElementById('power').textContent = data.power.toFixed(1) + ' W';
    if (data.flow !== undefined) document.getElementById('flowVal').textContent = data.flow.toFixed(1) + ' L/min';
    if (data.h2leak !== undefined) document.getElementById('h2LeakVal').textContent = data.h2leak.toFixed(1) + '%';
    
    // Update connection status to show live data
    updateConnectionStatus('LIVE DATA', true);
}

// Helper functions
function updateConnectionStatus(status, isConnected) {
    const wifiElement = document.getElementById('wifiStatus');
    if (wifiElement) {
        wifiElement.textContent = status;
        wifiElement.style.color = isConnected ? '#4CAF50' : '#f44336';
    }
}

function updateVerticalBar(barId, value, max = 100) {
    const bar = document.getElementById(barId);
    if (bar) {
        const percentage = Math.min((value / max) * 100, 100);
        bar.style.height = percentage + '%';
    }
}

function showNotification(message, type = 'info') {
    // Create a simple notification
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    
    // You can add a proper notification UI here
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Override your existing control functions
function setProductionRate(value) {
    console.log(`🎚️ Setting production rate via MQTT: ${value}%`);
    sendMQTTCommand('SET_RATE', parseInt(value));
}

function setMode(mode) {
    console.log(`🔄 Setting mode via MQTT: ${mode}`);
    sendMQTTCommand('SET_MODE', mode);
}

function startSystem() {
    console.log('🚀 Starting system via MQTT');
    sendMQTTCommand('START');
}

function stopSystem() {
    console.log('🛑 Stopping system via MQTT');
    sendMQTTCommand('STOP');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 PEM Dashboard Initializing...');
    
    // Start MQTT connection
    initMQTT();
    
    // Set up event listeners
    const slider = document.getElementById('prodSlider');
    if (slider) {
        slider.addEventListener('input', function(e) {
            const value = e.target.value;
            document.getElementById('prodValue').textContent = value + '%';
            console.log(`🎚️ Slider moved to: ${value}%`);
            setProductionRate(value);
        });
    }
    
    // Override control buttons
    const powerBtn = document.getElementById('powerBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (powerBtn) {
        powerBtn.addEventListener('click', startSystem);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopSystem);
    }
    
    console.log('✅ Dashboard initialization complete');
});