# Comprehensive Technical Documentation: Local Medical AI Model Integration

## 1. Overview & Architectural Migration

This document details the complete replacement of the **Google Gemini 2.5 Flash API** dependency with a **100% offline, locally trained Machine Learning model, deterministic medical NLP extractor, and local explanation engine** inside **Nexolith Care**.

### Architectural Transition

#### Previous Architecture (API-Dependent):
```text
Uploaded Medical Report
       ↓
PDF / OCR Processing
       ↓
Google Gemini 2.5 Flash API (Requires GEMINI_API_KEY)
       ↓
Structured Analysis & Summary
```

#### New Architecture (100% Offline & Locally Trained):
```text
Uploaded Medical Report
       ↓
PDF Table Extractor (pdfplumber) + OCR Processor (pytesseract)
       ↓
Local Medical Extractor (backend/services/local_medical_extractor.py)
       ↓
Feature Engineering (normalized bounds & deviations)
       ↓
Locally Trained Scikit-Learn ML Model (backend/ml_models/medical_status_model.joblib)
       ↓
Normal / Borderline / Critical Classification
       ↓
Local Medical Knowledge Engine (backend/services/medical_knowledge.py)
       ↓
Django REST API → React Dashboard
```

---

## 2. Why Gemini Was Removed

1. **Zero External API Dependency**: Medical report analysis must run reliably without relying on third-party cloud services or API keys.
2. **Data Privacy & Compliance**: Sensitive health data is processed entirely within local memory without transmitting reports to external LLM servers.
3. **Latency & Predictability**: Eliminates multi-second network round-trips and rate-limit errors associated with cloud API keys.
4. **Cost & Maintenance**: Replaces recurring API consumption charges with a lightweight (~500 KB) local model artifact.

---

## 3. Dataset Specification & Preprocessing

* **Dataset Origin**: 4,400 samples generated based strictly on official clinical reference range standards across 22 core medical lab parameters.
* **Audit File Path**: [`backend/ml_models/medical_training_data.csv`](file:///c:/Users/nedam/OneDrive/Desktop/nexolith-care/backend/ml_models/medical_training_data.csv)
* **Dataset Labeling**: Clearly documented as a **synthetic dataset based on medically defined reference standards**.

### Supported Lab Parameters:
* Fasting Glucose, HbA1c
* Total Cholesterol, LDL Cholesterol, HDL Cholesterol, Triglycerides
* Hemoglobin, WBC Count, Platelets, RBC Count
* Creatinine, BUN
* ALT (SGPT), AST (SGOT)
* TSH, Vitamin D, Vitamin B12
* Systolic BP, Diastolic BP
* Calcium, Potassium, Sodium

---

## 4. Feature Engineering

Features are computed dynamically per parameter measurement to ensure scale invariance and cross-unit robustness:

| Feature Name | Formula / Logic | Purpose |
| :--- | :--- | :--- |
| `normalized_pos` | `(value - lower) / (upper - lower)` | Relative position within normal reference span |
| `deviation_lower` | `max(0, lower - value) / lower` | Percentage deficit below lower bound |
| `deviation_upper` | `max(0, value - upper) / upper` | Percentage excess above upper bound |
| `relative_mid_delta` | `abs(value - mid) / mid` | Distance from optimal reference midpoint |
| `is_below_lower` | `1.0 if value < lower else 0.0` | Binary lower boundary breach flag |
| `is_above_upper` | `1.0 if value > upper else 0.0` | Binary upper boundary breach flag |
| `param_code` | `LabelEncoder().transform(param_name)` | Categorical parameter identity encoding |

---

## 5. Training Methodology & Data Leakage Prevention

* **Train / Test Split**: 80% Training Set (3,520 samples), 20% Held-Out Test Set (880 samples).
* **Stratification**: Stratified by class label (`Normal`, `Borderline`, `Critical`).
* **Random Seed**: Fixed `random_state=42` for exact reproducibility.
* **Leakage Prevention**: All `StandardScaler` and `LabelEncoder` parameters were fitted strictly on `X_train` and applied to `X_test`.

---

## 6. Empirical Model Comparison & Evaluation Metrics

Three candidate supervised ML models were trained and evaluated on the held-out test dataset:

| Model Candidate | Test Accuracy | Macro Precision | Macro Recall | Macro F1-Score | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RandomForestClassifier** | **99.77%** | **0.9950** | **0.9970** | **0.9960** | **SELECTED** |
| **GradientBoostingClassifier** | 99.77% | 0.9950 | 0.9970 | 0.9960 | Candidate |
| **LogisticRegression** | 96.59% | 0.9468 | 0.9333 | 0.9390 | Candidate |

### Classification Report (Held-Out Test Set):
```text
              precision    recall  f1-score   support

  Borderline       1.00      0.99      0.995       220
    Critical       0.985     1.00      0.992       132
      Normal       1.00      1.00      1.000       528

    accuracy                           0.9977       880
   macro avg       0.995     0.997     0.9960       880
weighted avg       0.998     0.998     0.9977       880
```

### Confusion Matrix:
```text
               Predicted Normal   Predicted Borderline   Predicted Critical
Actual Normal        528                   0                      0
Actual Borderline      0                 218                      2
Actual Critical        0                   0                    132
```

---

## 7. Model Artifact Serialization & Django Integration

* **Model Binary**: [`backend/ml_models/medical_status_model.joblib`](file:///c:/Users/nedam/OneDrive/Desktop/nexolith-care/backend/ml_models/medical_status_model.joblib)
* **Preprocessing Binary**: [`backend/ml_models/preprocessing.joblib`](file:///c:/Users/nedam/OneDrive/Desktop/nexolith-care/backend/ml_models/preprocessing.joblib)
* **Django Service**: [`MedicalAnalyzer`](file:///c:/Users/nedam/OneDrive/Desktop/nexolith-care/backend/services/medical_analyzer.py#L22) loads joblib artifacts into memory upon Django initialization and reuses the loaded model for fast, low-latency predictions (~2ms inference time per report).

---

## 8. Deterministic Medical Explanation Layer

Because ML classifiers output discrete statuses rather than natural language, patient explanations are generated by [`MedicalKnowledgeEngine`](file:///c:/Users/nedam/OneDrive/Desktop/nexolith-care/backend/services/medical_knowledge.py#L182) using a structured medical knowledge catalog.

* **Parameter Descriptions**: Clinical definitions for each marker.
* **Status Explanations**: Plain-English explanations tailored to *Normal*, *Borderline*, and *Critical* predictions.
* **Dietary & Lifestyle Recommendations**: Actionable guidance for abnormal findings.
* **Medical Disclaimer**: Emphasizes that AI findings provide educational health insights and do not replace professional medical diagnosis.

---

## 9. Confirmation of Zero API Key Dependency

* **`requirements.txt`**: `google-generativeai` and `google-genai` removed. `scikit-learn==1.9.0` and `joblib==1.5.3` added.
* **`settings.py`**: `GEMINI_API_KEY` configuration completely removed.
* **`views.py`**: `ChatAssistantView` updated to generate answers locally using family health records and `MedicalKnowledgeEngine`.

---

## 10. Execution Commands

### Retrain the Local Model:
```bash
python backend/ml_models/train_model.py
```

### Run Unit Test Suite:
```bash
python backend/manage.py test reports ml_models
```
