from flask import Flask, render_template, request, jsonify
from ann_train import NeuralEconomicMPC
from economic_mpc import run_economic_optimization
import json

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/train_neural_network', methods=['POST'])
def train_neural_network():
    """API endpoint to train neural network"""
    try:
        neural_mpc = NeuralEconomicMPC()
        training_data = neural_mpc.generate_training_data(5000)
        results = neural_mpc.train_model(training_data)
        
        return jsonify({
            'success': True,
            'training_accuracy': results['training_accuracy'],
            'test_accuracy': results['test_accuracy'],
            'message': 'Neural network training completed successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/run_economic_mpc', methods=['POST'])
def run_economic_mpc():
    """API endpoint to run economic MPC"""
    try:
        result = run_economic_optimization()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)