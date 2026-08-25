# Nexolith Care — Enterprise CI/CD Deployment & Live Selenium E2E Automation Guide

This documentation covers the architecture, setup, configuration, local execution, CI/CD pipeline stages, reporting, and troubleshooting for the **Nexolith Care Enterprise CI/CD Deployment & Live E2E Testing Framework**.

---

## 1. Executive Summary & Live Deployment URL

- **Repository**: [https://github.com/Harshith268268/nexolith-care](https://github.com/Harshith268268/nexolith-care)
- **Live Deployed Application URL**: [https://Harshith268268.github.io/nexolith-care/](https://Harshith268268.github.io/nexolith-care/)
- **Target BASE_URL Configuration**: `BASE_URL=https://Harshith268268.github.io/nexolith-care/`

> **MANDATORY RULE**: Selenium E2E tests strictly execute against the LIVE deployed application URL on GitHub Pages. Never run Selenium against localhost or local preview servers.

---

## 2. Directory & Framework Architecture

```text
nexolith-care/
├── .github/
│   └── workflows/
│       ├── deploy-and-test.yml    # Complete 13-stage GitHub Actions CI/CD Pipeline
│       └── e2e.yml                # Parallel Multi-Job Master Pipeline
│
├── automation/                    # Enterprise Selenium Framework
│   ├── config/
│   │   └── config.py              # Configuration & Environment Variables
│   ├── drivers/
│   │   └── driver_factory.py      # Cross-platform Headless Chrome Driver Factory
│   ├── data/
│   │   └── test_data_generator.py # 440 Test Cases Across 14 Categories
│   ├── pages/
│   │   ├── base_page.py           # Explicit Waits & Common Page Interactions
│   │   └── app_pages.py           # POM for Login, Dashboard, Upload, Reports, Assistant, etc.
│   ├── utils/
│   │   ├── logger.py              # Centralized Logger Utility
│   │   ├── screenshot_util.py     # PNG Screenshot Capture on Failure
│   │   ├── excel_report_generator.py # 6-Sheet Excel Workbook Generator
│   │   ├── html_report_generator.py  # Responsive HTML Dashboard Generator
│   │   ├── summary_generator.py      # Markdown & $GITHUB_STEP_SUMMARY Publisher
│   │   └── deployment_verifier.py   # Live Deployment Polling & HTTP 200 Verification
│   ├── tests/
│   │   └── test_runner.py         # Master Test Suite Execution Engine
│   ├── run_automation.py          # Framework Execution Entry Point
│   └── requirements.txt           # Python Dependencies
│
└── Test Results/                  # Generated Artifacts Directory (30-day Retention)
    ├── Excel/
    │   ├── Automation_Test_Report.xlsx
    │   ├── Failed_Test_Cases.xlsx
    │   ├── Passed_Test_Cases.xlsx
    │   └── Summary_Report.xlsx
    ├── HTML/
    │   ├── execution-report.html
    │   └── dashboard.html
    ├── JSON/
    │   └── execution-results.json
    ├── Screenshots/               # PNG Failure Evidence
    ├── Logs/                      # Detailed System & Console Logs
    └── Summary/
        └── summary.md             # Pipeline Execution Markdown Summary
```

---

## 3. GitHub Actions Pipeline Stages (13 Stages)

1. **Stage 1: Checkout Repository**: Pulls latest codebase from branch.
2. **Stage 2: Setup Environments**: Configures Node.js v20 and Python 3.11 with pip caching.
3. **Stage 3: Build Application**: Executes `npm run build` with base path `/nexolith-care/`.
4. **Stage 4: Static Analysis**: Validates code structure and runs Django system checks.
5. **Stage 5: Deploy to GitHub Pages**: Publishes built `dist/` bundle to `gh-pages` branch.
6. **Stage 6: Wait for Deployment**: Pauses for propagation delay.
7. **Stage 7: Deployment Verification**: Polls `BASE_URL` for HTTP status 200 & HTML DOM rendering.
8. **Stage 8: Run Selenium E2E Tests**: Executes 440 Selenium test cases against live GitHub Pages URL.
9. **Stage 9 & 10: Generate Reports**: Constructs Excel spreadsheets and HTML dashboards.
10. **Stage 11: Upload Artifacts**: Uploads `Test Results/` folder with 30-day retention.
11. **Stage 12: Publish Summary**: Appends Markdown report to `$GITHUB_STEP_SUMMARY`.
12. **Stage 13: Store Historical Results**: Preserves execution metadata.

---

## 4. Test Case Breakdown (440 Test Cases Across 14 Categories)

| Category | Test Count | Prefix | Focus Area |
| :--- | :---: | :--- | :--- |
| **Authentication** | 40 | `TC-AUTH-` | Sign-in, sign-out, OTP verification, password reset |
| **Authorization** | 40 | `TC-AUTHZ-` | Role permissions, family data isolation, route guards |
| **Navigation** | 30 | `TC-NAV-` | Navbar routing, breadcrumbs, back-button handling |
| **UI Validation** | 50 | `TC-UI-` | Design tokens, typography, glassmorphism, responsive grid |
| **Forms** | 50 | `TC-FORM-` | Family member forms, profile edits, setting toggles |
| **CRUD Operations** | 50 | `TC-CRUD-` | Create, read, update, delete reports & family profiles |
| **Input Validation** | 40 | `TC-INP-` | Special characters, numerical bounds, email formats |
| **Error Handling** | 20 | `TC-ERR-` | 404 pages, fallback states, offline network banners |
| **Session Management** | 20 | `TC-SESS-` | JWT token renewal, session expiry, state persistence |
| **File Upload** | 20 | `TC-UPL-` | PDF upload, PNG scan, file dropzone validation |
| **Accessibility** | 20 | `TC-A11Y-` | ARIA labels, contrast ratio, keyboard focus traps |
| **Responsive Design** | 20 | `TC-RESP-` | Mobile viewports, tablet layouts, desktop views |
| **Performance Smoke Tests** | 20 | `TC-PERF-` | DOM render times, asset load speeds |
| **Regression** | 50 | `TC-REG-` | End-to-end user workflows & medical data accuracy |
| **TOTAL** | **440** | | **Comprehensive Test Suite** |

---

## 5. Local Execution Guide

To run the Selenium E2E test suite locally against the LIVE application:

```bash
# 1. Install Python dependencies
pip install -r automation/requirements.txt

# 2. Set target LIVE URL (Default: https://Harshith268268.github.io/nexolith-care/)
export BASE_URL=https://Harshith268268.github.io/nexolith-care/

# 3. Execute test suite
python automation/run_automation.py
```

---

## 6. GitHub Repository Settings & Pages Configuration

To ensure GitHub Actions deploys to GitHub Pages automatically:

1. Open your repository on GitHub: `https://github.com/Harshith268268/nexolith-care`
2. Go to **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
4. Select branch: `gh-pages` and folder: `/ (root)`.
5. Under **Settings** → **Actions** → **General** → **Workflow permissions**, select **Read and write permissions**.
