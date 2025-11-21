import numpy as np
from scipy.optimize import minimize
from ann_predict import NeuralPredictor
import json

class EconomicMPC:
    def __init__(self, prediction_horizon=24, control_interval=15):
        self.prediction_horizon = prediction_horizon  # hours
        self.control_interval = control_interval      # minutes
        self.neural_predictor = NeuralPredictor()
        self.optimization_history = []
    
    def economic_objective(self, setpoints, current_state, price_forecast, demand_forecast):
        """Objective function to minimize operating cost"""
        total_cost = 0
        
        for i, setpoint in enumerate(setpoints):
            # Predict operating parameters for this setpoint
            state = current_state.copy()
            state['electricity_price'] = price_forecast[i]
            state['oxygen_demand'] = demand_forecast[i]
            
            prediction = self.neural_predictor.predict_optimal_setpoint(state)
            
            # Calculate cost components
            electricity_cost = prediction['operating_cost']
            efficiency_penalty = (1 - prediction['expected_efficiency'] / 100) * 10
            demand_mismatch = abs(state['oxygen_demand'] - setpoint) * 0.5
            
            total_cost += electricity_cost + efficiency_penalty + demand_mismatch
        
        return total_cost
    
    def optimize_setpoints(self, current_state, price_forecast, demand_forecast):
        """Optimize economic setpoints over prediction horizon"""
        
        # Initial guess (current setpoint repeated)
        initial_setpoints = np.full(self.prediction_horizon, current_state.get('current_setpoint', 50))
        
        # Bounds for setpoints (0-100%)
        bounds = [(0, 100) for _ in range(self.prediction_horizon)]
        
        # Constraints
        constraints = [
            # Ramp rate constraints (max 10% change per interval)
            {'type': 'ineq', 'fun': lambda x: 10 - np.abs(np.diff(x))}
        ]
        
        # Optimize
        result = minimize(
            self.economic_objective,
            initial_setpoints,
            args=(current_state, price_forecast, demand_forecast),
            bounds=bounds,
            constraints=constraints,
            method='SLSQP',
            options={'maxiter': 100}
        )
        
        if result.success:
            optimized_setpoints = result.x
            total_cost = result.fun
            
            # Store optimization result
            optimization_result = {
                'timestamp': np.datetime64('now'),
                'optimized_setpoints': optimized_setpoints.tolist(),
                'total_cost': total_cost,
                'success': True
            }
            self.optimization_history.append(optimization_result)
            
            return {
                'success': True,
                'setpoints': optimized_setpoints.tolist(),
                'immediate_setpoint': float(optimized_setpoints[0]),
                'total_cost': float(total_cost),
                'message': 'Optimization successful'
            }
        else:
            return {
                'success': False,
                'message': f'Optimization failed: {result.message}',
                'immediate_setpoint': current_state.get('current_setpoint', 50)
            }
    
    def get_forecasts(self):
        """Get price and demand forecasts (simulated)"""
        # Simulate price forecast (higher during day)
        hours = np.arange(self.prediction_horizon)
        price_forecast = 0.15 + 0.1 * np.sin(2 * np.pi * (hours + 6) / 24)
        
        # Simulate demand forecast (higher during working hours)
        demand_forecast = 40 + 20 * np.sin(2 * np.pi * (hours - 8) / 24)
        demand_forecast = np.clip(demand_forecast, 20, 80)
        
        return price_forecast.tolist(), demand_forecast.tolist()

def run_economic_optimization():
    """Run complete economic optimization"""
    mpc = EconomicMPC()
    
    # Get current state (simulated)
    current_state = {
        'electricity_price': 0.18,
        'pv_power': 2.8,
        'oxygen_demand': 45,
        'battery_level': 70,
        'water_temp': 68,
        'current_setpoint': 42
    }
    
    # Get forecasts
    price_forecast, demand_forecast = mpc.get_forecasts()
    
    # Run optimization
    result = mpc.optimize_setpoints(current_state, price_forecast, demand_forecast)
    
    return result

if __name__ == "__main__":
    result = run_economic_optimization()
    print("Economic MPC Result:", json.dumps(result, indent=2))