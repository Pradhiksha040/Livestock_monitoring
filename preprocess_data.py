import csv
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

def build_and_run_pipeline(data_path="livestock_pharmacology_data.csv"):
    """
    Loads the synthetic livestock data (without pandas), builds a Scikit-Learn 
    preprocessing pipeline, and prepares the data for machine learning models.
    """
    print(f"Loading data from '{data_path}'...")
    try:
        with open(data_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            raw_data = list(reader)
    except FileNotFoundError:
        print(f"Error: {data_path} not found. Please run generate_synthetic_data.py first.")
        return None
        
    print(f"Dataset shape: {len(raw_data)} rows")
    
    # Column indices in the CSV:
    # 0: animal_id, 1: species, 2: weight_kg, 3: age_months, 4: drug_name,
    # 5: dosage_mg_kg, 6: administration_route, 7: health_status, 8: days_to_clearance

    # 1. Separate Features (X) and Target Variable (y)
    X = []
    y = []
    
    for row in raw_data:
        # Target: days_to_clearance (index 8)
        y.append(float(row[8]))
        
        # Features (dropping animal_id (0) and days_to_clearance (8))
        features = [
            row[1], # species (cat)
            float(row[2]) if row[2] != "" else np.nan, # weight_kg (num)
            float(row[3]) if row[3] != "" else np.nan, # age_months (num)
            row[4], # drug_name (cat)
            float(row[5]), # dosage_mg_kg (num)
            row[6], # administration_route (cat)
            row[7]  # health_status (cat)
        ]
        X.append(features)

    # Convert to numpy array for Scikit-Learn
    # We use object dtype so it can hold both strings and floats
    X = np.array(X, dtype=object)
    y = np.array(y, dtype=float)

    # Feature indices for ColumnTransformer
    # [1, 2, 4] are the numeric columns: weight_kg, age_months, dosage_mg_kg
    # [0, 3, 5, 6] are the categorical columns: species, drug_name, administration_route, health_status
    numerical_features_idx = [1, 2, 4]
    categorical_features_idx = [0, 3, 5, 6]
    
    numerical_feature_names = ['weight_kg', 'age_months', 'dosage_mg_kg']
    categorical_feature_names = ['species', 'drug_name', 'administration_route', 'health_status']

    # 3. Create the preprocessing pipelines
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    # 4. Combine pipelines using ColumnTransformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numerical_features_idx),
            ('cat', categorical_transformer, categorical_features_idx)
        ])

    # 5. Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Training set shape (X_train): {X_train.shape}")
    print(f"Testing set shape (X_test): {X_test.shape}")

    # 6. Fit and transform
    print("Fitting preprocessing pipeline on training data...")
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # Get the feature names from OneHotEncoder
    ohe_feature_names = preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(categorical_feature_names)
    all_feature_names = numerical_feature_names + list(ohe_feature_names)
    
    print(f"Total features after preprocessing: {len(all_feature_names)}")
    print("\nSample of preprocessed training data (first row):")
    print(dict(zip(all_feature_names, X_train_processed[0])))

    return X_train_processed, X_test_processed, y_train, y_test, preprocessor

if __name__ == "__main__":
    build_and_run_pipeline()
