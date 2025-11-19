// MQTT Configuration
const MQTT_BROKER = 'broker.hivemq.com';
const MQTT_PORT = 8083;
const MQTT_TOPIC_DATA = 'electrolyzer/bill/data';
const MQTT_TOPIC_COMMANDS = 'electrolyzer/bill/commands';

let mqttClient;
let isConnected = false;

function connectMQTT() {
    console.log('🚀 Connecting to HiveMQ...');
    
    try {
        const clientId = 'webclient_' + Math.random().toString(16).substr(2, 8);
        mqttClient = new Paho.MQTT.Client(MQTT_BROKER, Number(MQTT_PORT), clientId);
        
        mqttClient.onConnectionLost = onConnectionLost;
        mqttClient.onMessageArrived = onMessageArrived;
        
        mqttClient.connect({
            onSuccess: onConnectSuccess,
            onFailure: onConnectFailure,
            useSSL: false,
            timeout: 10
        });
    } catch (error) {
        console.error('❌ MQTT Error:', error);
        setTimeout(connectMQTT, 5000);
    }
}

function onConnectSuccess() {
    console.log('✅ Connected to HiveMQ!');
    isConnected = true;
    mqttClient.subscribe(MQTT_TOPIC_DATA);
    document.getElementById('wifiStatus').textContent = 'CONNECTED';
    document.getElementById('wifiStatus').style.color = 'green';
}

function onConnectFailure(error) {
    console.log('❌ Connection failed:', error.errorMessage);
    setTimeout(connectMQTT, 3000);
}

function onConnectionLost(response) {
    console.log('🔌 Connection lost:', response.errorMessage);
    isConnected = false;
    setTimeout(connectMQTT, 2000);
}

function onMessageArrived(message) {
    try {
        const data = JSON.parse(message.payloadString);
        console.log('📥 Data received:', data);
        updateDashboard(data);
    } catch (e) {
        console.error('Parse error:', e);
    }
}

// Start connection when page loads
setTimeout(connectMQTT, 1000);