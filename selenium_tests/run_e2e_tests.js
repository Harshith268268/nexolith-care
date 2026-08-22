/**
 * Nexolith Care - Main Selenium End-to-End Test Runner & Excel Report Generator
 */

const { createWebDriver } = require('./helpers/driver_factory');
const { generateExcelReport } = require('./helpers/excel_reporter');
const config = require('./config');

// Test Suite Imports
const { testHealthCheck } = require('./test_suites/01_health_check.test');
const { testAuthentication } = require('./test_suites/02_authentication.test');
const { testDashboard } = require('./test_suites/03_dashboard.test');
const { testReportUpload } = require('./test_suites/04_report_upload.test');
const { testLocalMLPrediction } = require('./test_suites/05_local_ml_prediction.test');
const { testChatAssistant } = require('./test_suites/06_chat_assistant.test');

async function runE2ETests() {
  console.log('\n===============================================================');
  console.log('  NEXOLITH CARE - SELENIUM END-TO-END AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  const suiteStartTime = Date.now();
  const allResults = [];
  let healthInfo = {};
  let driver = null;

  try {
    // 1. Health Check Test
    console.log('[1/6] Running System & Health Pre-flight Test...');
    const healthResult = await testHealthCheck();
    allResults.push(healthResult);
    healthInfo = healthResult.healthData || {};
    console.log(`      Status: ${healthResult.status} (${healthResult.durationMs}ms)`);

    // 2. Initialize Selenium WebDriver
    console.log('\n[2/6] Initializing Selenium Headless WebDriver...');
    driver = await createWebDriver();
    console.log('      WebDriver initialized successfully.');

    // 3. Authentication Test
    console.log('\n[3/6] Running User Authentication & Session Test...');
    const authResults = await testAuthentication(driver);
    authResults.forEach(r => {
      allResults.push(r);
      console.log(`      [${r.id}] ${r.name}: ${r.status} (${r.durationMs}ms)`);
    });

    // 4. Dashboard & Navigation Test
    console.log('\n[4/6] Running Dashboard Container & UI Test...');
    const dashResults = await testDashboard(driver);
    dashResults.forEach(r => {
      allResults.push(r);
      console.log(`      [${r.id}] ${r.name}: ${r.status} (${r.durationMs}ms)`);
    });

    // 5. Report Upload Flow Test
    console.log('\n[5/6] Running Medical Report Upload & Dispatch Test...');
    const uploadResults = await testReportUpload(driver);
    uploadResults.forEach(r => {
      allResults.push(r);
      console.log(`      [${r.id}] ${r.name}: ${r.status} (${r.durationMs}ms)`);
    });

    // 6. Local ML Prediction Test
    console.log('\n[6/6] Running Local Random Forest ML Model Verification...');
    const mlResults = await testLocalMLPrediction();
    mlResults.forEach(r => {
      allResults.push(r);
      console.log(`      [${r.id}] ${r.name}: ${r.status} (${r.durationMs}ms)`);
    });

    // 7. Chat Assistant Local Test
    console.log('\n[Bonus] Running Local Chat Assistant Verification...');
    const chatResults = await testChatAssistant(driver);
    chatResults.forEach(r => {
      allResults.push(r);
      console.log(`      [${r.id}] ${r.name}: ${r.status} (${r.durationMs}ms)`);
    });

  } catch (err) {
    console.error(`\n[ERROR] Test suite execution encountered an error: ${err.message}`);
  } finally {
    if (driver) {
      console.log('\nClosing Selenium WebDriver session...');
      try {
        await driver.quit();
      } catch {}
    }
  }

  // Calculate summary metrics
  const total = allResults.length;
  const passed = allResults.filter(r => r.status === 'PASS').length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const durationSec = ((Date.now() - suiteStartTime) / 1000).toFixed(2);

  const summaryMetrics = {
    total,
    passed,
    failed,
    passRate,
    durationSec,
    timestamp: new Date().toISOString(),
    frontendUrl: config.FRONTEND_URL,
    backendUrl: config.BACKEND_URL
  };

  console.log('\n===============================================================');
  console.log('                 E2E TEST SUMMARY RESULTS                      ');
  console.log('===============================================================');
  console.log(`  Total Executed : ${total}`);
  console.log(`  Passed         : ${passed}`);
  console.log(`  Failed         : ${failed}`);
  console.log(`  Pass Rate      : ${passRate}%`);
  console.log(`  Total Duration : ${durationSec}s`);
  console.log('===============================================================\n');

  // Generate Excel Report
  console.log('Generating Excel Analysis Report (.xlsx)...');
  try {
    const reportPath = await generateExcelReport(allResults, healthInfo, summaryMetrics);
    console.log(`SUCCESS: Excel report saved to:\n  ${reportPath}\n`);
  } catch (ex) {
    console.error(`[ERROR] Failed to write Excel report: ${ex.message}`);
  }
}

if (require.main === module) {
  runE2ETests();
}

module.exports = { runE2ETests };
