# Livestock Pharmacology Compliance Platform

An AI-driven web application designed to help farmers and veterinarians track drug treatments in livestock, predict residue clearance times using Machine Learning, and ensure food safety compliance before animals are sent to market.

## 🚀 Features

* **AI Clearance Prediction**: A Scikit-Learn `RandomForestRegressor` machine learning model predicts the exact number of days required for a drug to clear an animal's system based on species, weight, age, drug name, dosage, and administration route.
* **Role-Based Access Control**:
  * **Farmers**: Log new treatments, view compliance status, and manage their livestock.
  * **Veterinarians**: Review AI predictions, append clinical notes, and provide authoritative human oversight by overriding the AI's safe market date if necessary.
  * **Admins**: Full system oversight.
* **Automated Notifications**: Real-time SMS and Email alerts sent to farmers when a veterinarian approves a treatment, and daily cron-job alerts notifying them when a withdrawal period officially ends.
* **Modern UI & Light Theme**: Built with React and Tailwind CSS, featuring an elegant toggleable Light/Dark theme that utilizes advanced CSS variable inversion.

---

## 🛠 Technology Stack

### Backend (API & Machine Learning)
* **Python & Django**: Core backend framework.
* **Django REST Framework (DRF)**: Powers the JSON API endpoints.
* **Scikit-Learn & Joblib**: Machine Learning model training and serialization.
* **Twilio**: External API for dispatching SMS notifications.
* **SQLite**: Lightweight database for development.

### Frontend
* **React 18 & Vite**: Lightning-fast frontend tooling and rendering.
* **Tailwind CSS**: Utility-first styling with custom glass-morphism classes and CSS variable-based dynamic theming.
* **Lucide React**: Beautiful, consistent iconography.

---

## 🏗 Architecture Overview

1. **The Machine Learning Pipeline (`train_model.py`)**: 
   Historical pharmacological data is preprocessed to handle missing values and encode categorical features. A Random Forest model is trained to predict clearance days and saved as `residue_clearance_model.pkl`.
   
2. **The Django Backend**:
   * Intercepts `POST` requests for new treatments.
   * Feeds the clinical payload into the `.pkl` model.
   * Calculates the `safe_market_date` by adding the AI's predicted days to the treatment date.
   * Exposes a `PATCH` endpoint for Veterinarians to review and override these predictions (Human-in-the-Loop architecture).

3. **The React Frontend**:
   * Uses JWT (JSON Web Tokens) for authentication, intercepting unauthorized API calls and silently refreshing tokens.
   * Dynamically routes users to specific dashboards based on their role.
   * Tracks compliance in real-time, displaying whether an animal is "Compliant" or "Under Withdrawal".

---

## ⚙️ Setup & Installation

### 1. Backend Setup
Navigate to the `compliance_backend` directory and set up a Python virtual environment:
```bash
cd compliance_backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the same directory as `manage.py` and populate it with your email and Twilio credentials for the alert system:
```ini
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

Run database migrations and start the server:
```bash
python manage.py migrate
python manage.py runserver
```

### 2. Frontend Setup
In a separate terminal window, navigate to the `compliance-frontend` directory:
```bash
cd compliance-frontend
npm install
npm run dev
```

### 3. Populating Demo Data
If you want to test the system without manually creating users and animals, you can run the synthetic data script from the backend directory:
```bash
python populate.py
```

---

## 📩 Automated Alert System (Cron Job)

To automate the daily SMS/Email alerts for animals whose withdrawal period ends "today", set up a daily cron job (e.g., at 8:00 AM) that executes the custom Django management command:

```bash
# Example crontab entry
0 8 * * * /path/to/venv/bin/python /path/to/project/manage.py send_daily_safe_alerts >> /var/log/livestock_comply_alerts.log 2>&1
```
