#!/usr/bin/env python3
import serial
import asyncio
import websockets
import json
import time

print("🚀 Starting Arduino Serial Bridge...")

# Try different serial ports - NOW INCLUDING ttyACM1
serial_ports = ['/dev/ttyACM1', '/dev/ttyACM0', '/dev/ttyUSB0']
arduino = None

for port in serial_ports:
    try:
        arduino = serial.Serial(port, 115200, timeout=1)
        print(f"✅ Connected to Arduino on {port}")
        break
    except Exception as e:
        print(f"❌ Cannot connect to {port}: {e}")

if not arduino:
    print("❌ Could not connect to Arduino on any port")
    exit(1)

connected_clients = set()

async def handle_websocket(websocket, path):
    connected_clients.add(websocket)
    print("🌐 Web client connected")
    
    try:
        await websocket.send(json.dumps({"status": "Connected to Arduino"}))
        
        async for message in websocket:
            try:
                command = json.loads(message)
                print(f"📤 From web: {command}")
            except Exception as e:
                print(f"❌ Web message error: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print("💨 Web client disconnected")
    finally:
        connected_clients.remove(websocket)

async def read_serial():
    buffer = ""
    while True:
        try:
            if arduino.in_waiting > 0:
                data = arduino.read(arduino.in_waiting).decode('utf-8')
                buffer += data
                
                # Process complete lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    
                    if line and line.startswith('{'):
                        try:
                            json_data = json.loads(line)
                            print(f"📥 From Arduino: {json_data.get('production', 'N/A')}% production")
                            
                            # Send to all connected web clients
                            for client in connected_clients.copy():
                                try:
                                    await client.send(json.dumps(json_data))
                                except:
                                    connected_clients.remove(client)
                        except json.JSONDecodeError as e:
                            print(f"❌ JSON decode error: {e}")
                            print(f"📝 Raw data: {line}")
        except Exception as e:
            print(f"❌ Serial read error: {e}")
        
        await asyncio.sleep(0.1)

async def main():
    async with websockets.serve(handle_websocket, "localhost", 5000):
        print("🖥️ WebSocket server running on ws://localhost:5000")
        print("📡 Waiting for Arduino data...")
        await read_serial()

if __name__ == "__main__":
    asyncio.run(main())
