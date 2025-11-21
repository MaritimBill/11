import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import json
from data_simulator import generate_training_data

class NeuralEconomicMPC:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.training_history = []
        
    def generate_training_data(self, n_samples=10000):
        """Generate synthetic training data for economic MPC"""
        print("Generating training data...")
        data = generate_training_data(n_samples)
        return data
    
    def train_model(self, data):
        """Train neural network model"""
        print("Training neural network model...")
        
        # Prepare features and targets
        X = data[['electricity_price', 'pv_power', 'oxygen_demand', 
                 'time_of_day', 'battery_level', 'water_temp']]
        y = data[['optimal_setpoint', 'expected_efficiency', 'operating_cost']]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Create and train neural network
        self.model = MLPRegressor(
            hidden_layer_sizes=(64, 32, 16),
            activation='relu',
            solver='adam',
            learning_rate_init=0.001,
            max_iter=1000,
            random_state=42
        )
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        print(f"Training R²: {train_score:.4f}")
        print(f"Test R²: {test_score:.4f}")
        
        # Save model
        self.save_model()
        
        return {
            'training_accuracy': train_score,
            'test_accuracy': test_score,
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }
    
    def save_model(self):
        """Save trained model and scaler"""
        joblib.dump(self.model, 'models/neural_mpc_model.pkl')
        joblib.dump(self.scaler, 'models/scaler.pkl')
        print("Model saved successfully")
    
    def load_model(self):
        """Load trained model"""
        try:
            self.model = joblib.load('models/neural_mpc_model.pkl')
            self.scaler = joblib.load('models/scaler.pkl')
            print("Model loaded successfully")
            return True
        except FileNotFoundError:
            print("No trained model found")
            return False

def main():
    """Main training function"""
    neural_mpc = NeuralEconomicMPC()
    
    # Generate training data
    training_data = neural_mpc.generate_training_data(5000)
    
    # Train model
    results = neural_mpc.train_model(training_data)
    
    # Save results
    with open('training_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("Training completed successfully!")
    return results

if __name__ == "__main__":
    main()