import csv
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_and_export_model(data_path="livestock_pharmacology_data.csv", model_path="residue_clearance_model.pkl"):
    """
    Loads synthetic livestock data, constructs an end-to-end Machine Learning pipeline 
    (preprocessing + RandomForest), evaluates the model, and exports it via joblib.
    """
    print(f"Loading data from '{data_path}'...")
    try:
        # We continue to use csv instead of pandas to ensure compatibility with your environment
        with open(data_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            raw_data = list(reader)
    except FileNotFoundError:
        print(f"Error: {data_path} not found. Please run generate_synthetic_data.py first.")
        return
        
    print(f"Successfully loaded {len(raw_data)} records.")
    
    # 1. Parse Data 
    X = []
    y = []
    
    for row in raw_data:
        # Target variable is at index 8 ('days_to_clearance')
        y.append(float(row[8]))
        
        # Extract features (dropping 'animal_id' and the target)
        features = [
            row[1], # species (categorical)
            float(row[2]) if row[2] != "" else np.nan, # weight_kg (numerical)
            float(row[3]) if row[3] != "" else np.nan, # age_months (numerical)
            row[4], # drug_name (categorical)
            float(row[5]), # dosage_mg_kg (numerical)
            row[6], # administration_route (categorical)
            row[7]  # health_status (categorical)
        ]
        X.append(features)

    # Convert to numpy arrays. 'object' dtype handles both strings and floats safely.
    X = np.array(X, dtype=object)
    y = np.array(y, dtype=float)

    # Define indices for ColumnTransformer mapping
    # 0: species, 1: weight, 2: age, 3: drug_name, 4: dosage, 5: route, 6: health
    numerical_features_idx = [1, 2, 4] 
    categorical_features_idx = [0, 3, 5, 6]

    # ==========================================
    # PHASE 1: End-to-End Pipeline Construction
    # ==========================================
    print("Constructing the Scikit-Learn Pipeline...")
    
    # Preprocessing branch for numerical data
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')), # Fills missing weight/age with the median
        ('scaler', StandardScaler())                   # Standardizes data (mean=0, variance=1)
    ])

    # Preprocessing branch for categorical data
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')), # Fills missing categories with mode
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False)) # Creates binary columns
    ])

    # Combine preprocessing steps using ColumnTransformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numerical_features_idx),
            ('cat', categorical_transformer, categorical_features_idx)
        ])
        
    # THE MASTER PIPELINE
    # Bundling preprocessing and the estimator is crucial! It means the backend API
    # will only need to pass raw JSON/CSV data to `model.predict()`, without needing 
    # to replicate the imputing and scaling logic in production.
    master_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        # RandomForest is highly robust for tabular data and handles non-linear relationships well
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
    ])

    # ==========================================
    # PHASE 2: Model Selection & Training
    # ==========================================
    print("Splitting data into 80% Training and 20% Testing...")
    # Fixed random_state ensures reproducibility across different runs and for your panel review
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training the Master Pipeline (RandomForestRegressor)...")
    # By calling fit() on the master pipeline, it automatically fits the preprocessor, 
    # transforms the training data, and then trains the Random Forest on that transformed data.
    master_pipeline.fit(X_train, y_train)

    # ==========================================
    # PHASE 3: Evaluation & Export
    # ==========================================
    print("Evaluating the model on the test set...")
    # The pipeline automatically transforms X_test using the already-fitted preprocessor
    y_pred = master_pipeline.predict(X_test)
    
    # Calculate performance metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred)) # RMSE is the square root of MSE
    r2 = r2_score(y_test, y_pred)
    
    print("\n--- Model Performance Metrics ---")
    print(f"Mean Absolute Error (MAE):      {mae:.4f} days")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f} days")
    print(f"R-squared (R2) Score:           {r2:.4f}")
    print("---------------------------------")
    
    # Export the bundled pipeline using joblib
    print(f"\nExporting the trained pipeline to '{model_path}'...")
    joblib.dump(master_pipeline, model_path)
    print("Export complete! The model is ready to be loaded by the compliance platform backend.")

if __name__ == "__main__":
    train_and_export_model()
