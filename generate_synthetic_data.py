import numpy as np
import csv

def generate_synthetic_data(num_records=5000):
    """
    Generates a synthetic dataset for predicting Personalized Residue Clearance Time
    for antimicrobials administered to livestock.
    """
    np.random.seed(42)  # For reproducibility

    # Define biological parameters and categories
    species_list = ['Cattle', 'Goat', 'Sheep', 'Pig']
    drugs_list = ['Oxytetracycline', 'Amoxicillin', 'Penicillin', 'Tylosin']
    routes_list = ['Injectable', 'Oral', 'Topical']
    health_statuses = ['Healthy', 'Mild Infection', 'Severe Infection']

    # Initialize lists to store generated data
    data = []
    
    # Base clearance times for each drug (in days)
    base_clearance = {
        'Oxytetracycline': 14,
        'Amoxicillin': 7,
        'Penicillin': 5,
        'Tylosin': 10
    }

    for i in range(num_records):
        animal_id = f"ANI_{i+1:05d}"
        species = np.random.choice(species_list)
        drug_name = np.random.choice(drugs_list)
        administration_route = np.random.choice(routes_list, p=[0.6, 0.3, 0.1])
        health_status = np.random.choice(health_statuses, p=[0.5, 0.3, 0.2])
        
        # 1. Generate realistic weight and age based on species
        if species == 'Cattle':
            weight_kg = max(50, np.random.normal(500, 100))
            age_months = max(1, np.random.normal(36, 12))
        elif species == 'Pig':
            weight_kg = max(10, np.random.normal(100, 20))
            age_months = max(1, np.random.normal(6, 2))
        elif species == 'Sheep':
            weight_kg = max(10, np.random.normal(60, 10))
            age_months = max(1, np.random.normal(12, 4))
        else: # Goat
            weight_kg = max(10, np.random.normal(40, 8))
            age_months = max(1, np.random.normal(12, 4))
            
        # 2. Generate dosage based on drug (realistic ranges)
        if drug_name == 'Oxytetracycline':
            dosage_mg_kg = np.random.uniform(10, 30)
        elif drug_name == 'Amoxicillin':
            dosage_mg_kg = np.random.uniform(5, 15)
        elif drug_name == 'Penicillin':
            dosage_mg_kg = np.random.uniform(10, 25)
        else: # Tylosin
            dosage_mg_kg = np.random.uniform(5, 20)

        # 3. Calculate target variable: days_to_clearance
        clearance = base_clearance[drug_name]
        clearance += (dosage_mg_kg / 10) * 1.5
        
        if administration_route == 'Injectable':
            clearance += 3.0
        elif administration_route == 'Topical':
            clearance -= 2.0
            
        if health_status == 'Mild Infection':
            clearance += 1.5
        elif health_status == 'Severe Infection':
            clearance += 4.0
            
        noise = np.random.normal(0, 1.5)
        clearance += noise
        days_to_clearance = max(1.0, round(clearance, 2))
        
        data.append({
            'animal_id': animal_id,
            'species': species,
            'weight_kg': weight_kg,
            'age_months': age_months,
            'drug_name': drug_name,
            'dosage_mg_kg': dosage_mg_kg,
            'administration_route': administration_route,
            'health_status': health_status,
            'days_to_clearance': days_to_clearance
        })

    # 4. Introduce missing values
    weight_missing_indices = set(np.random.choice(num_records, size=int(num_records * 0.05), replace=False))
    age_missing_indices = set(np.random.choice(num_records, size=int(num_records * 0.05), replace=False))
    
    for i in range(num_records):
        if i in weight_missing_indices:
            data[i]['weight_kg'] = "" # Empty string for CSV missing value
        if i in age_missing_indices:
            data[i]['age_months'] = ""

    return data

if __name__ == "__main__":
    print("Generating synthetic livestock data...")
    data = generate_synthetic_data()
    output_file = "livestock_pharmacology_data.csv"
    
    # Save to CSV
    fieldnames = ['animal_id', 'species', 'weight_kg', 'age_months', 'drug_name', 'dosage_mg_kg', 'administration_route', 'health_status', 'days_to_clearance']
    with open(output_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
        
    print(f"Successfully generated 5,000 records and saved to '{output_file}'.")
    # Print a few samples
    for i in range(5):
        print(data[i])
