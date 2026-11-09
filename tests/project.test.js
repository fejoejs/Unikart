import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

async function runVerification() {
  console.log('\n=================================================================');
  console.log('🧪 UNIKART 2-APPLICATION & CODEBASE ORGANIZATION SUITE');
  console.log('=================================================================\n');

  const appsDir = path.join(ROOT_DIR, 'apps');
  const appEntries = fs.readdirSync(appsDir);

  // 1. App Directory Structure
  assert('Exactly 2 applications exist in apps/', appEntries.length === 2 && appEntries.includes('storefront') && appEntries.includes('inventory'));
  assert("Standalone app 'crm' folder is completely removed", !fs.existsSync(path.join(appsDir, 'crm')));
  assert("Standalone app 'delivery' folder is completely removed", !fs.existsSync(path.join(appsDir, 'delivery')));
  assert("Standalone app 'erp' folder is completely removed", !fs.existsSync(path.join(appsDir, 'erp')));
  assert("Standalone app 'pos' folder is completely removed", !fs.existsSync(path.join(appsDir, 'pos')));
  assert("Standalone app 'superadmin' folder is completely removed", !fs.existsSync(path.join(appsDir, 'superadmin')));
  assert("Standalone app 'warehouse' folder is completely removed", !fs.existsSync(path.join(appsDir, 'warehouse')));

  // 2. Storefront App Verification
  assert('Storefront directory exists in-place (apps/storefront)', fs.existsSync(path.join(appsDir, 'storefront')));
  assert('Storefront main.jsx is intact', fs.existsSync(path.join(appsDir, 'storefront', 'src', 'main.jsx')));
  assert('Storefront App.jsx is intact', fs.existsSync(path.join(appsDir, 'storefront', 'src', 'App.jsx')));
  assert('Storefront package.json preserved', fs.existsSync(path.join(appsDir, 'storefront', 'package.json')));

  // 3. Consolidated Inventory App Verification
  const invSrc = path.join(appsDir, 'inventory', 'src');
  assert('Inventory pages/admin directory exists', fs.existsSync(path.join(invSrc, 'pages', 'admin')));
  assert('Inventory pages/inventory-staff directory exists', fs.existsSync(path.join(invSrc, 'pages', 'inventory-staff')));
  
  // Admin Core Pages
  assert('Admin AdminDashboard exists', fs.existsSync(path.join(invSrc, 'pages', 'admin', 'AdminDashboard.jsx')));
  assert('Admin CustomerOrders exists', fs.existsSync(path.join(invSrc, 'pages', 'admin', 'CustomerOrders.jsx')));
  assert('Admin EmployeeManagement exists', fs.existsSync(path.join(invSrc, 'pages', 'admin', 'EmployeeManagement.jsx')));
  assert('Admin MyProfile exists', fs.existsSync(path.join(invSrc, 'pages', 'admin', 'MyProfile.jsx')));
  assert('Unwanted ApplicationSettings page is removed', !fs.existsSync(path.join(invSrc, 'pages', 'admin', 'ApplicationSettings.jsx')));
  
  // Staff Core Pages
  assert('Staff InventoryStaffDashboard exists', fs.existsSync(path.join(invSrc, 'pages', 'inventory-staff', 'InventoryStaffDashboard.jsx')));
  assert('Staff ProductCatalog exists', fs.existsSync(path.join(invSrc, 'pages', 'inventory-staff', 'ProductCatalog.jsx')));
  assert('Staff StockAdjustment exists', fs.existsSync(path.join(invSrc, 'pages', 'inventory-staff', 'StockAdjustment.jsx')));
  assert('Staff LowStockAlerts exists', fs.existsSync(path.join(invSrc, 'pages', 'inventory-staff', 'LowStockAlerts.jsx')));
  
  // 4. Layouts, Navigation & Routes Verification
  assert('AdminLayout exists in src/layouts/', fs.existsSync(path.join(invSrc, 'layouts', 'AdminLayout.jsx')));
  assert('InventoryStaffLayout exists in src/layouts/', fs.existsSync(path.join(invSrc, 'layouts', 'InventoryStaffLayout.jsx')));
  assert('AdminSidebar component exists in navigation/', fs.existsSync(path.join(invSrc, 'components', 'navigation', 'AdminSidebar.jsx')));
  assert('InventoryStaffSidebar component exists in navigation/', fs.existsSync(path.join(invSrc, 'components', 'navigation', 'InventoryStaffSidebar.jsx')));
  assert('Header component exists in navigation/', fs.existsSync(path.join(invSrc, 'components', 'navigation', 'Header.jsx')));
  assert('ProtectedRoute exists in routes/', fs.existsSync(path.join(invSrc, 'routes', 'ProtectedRoute.jsx')));
  assert('AuthStore with 24h session check exists in stores/', fs.existsSync(path.join(invSrc, 'stores', 'authStore.js')));
  assert('ApiClient exists in services/', fs.existsSync(path.join(invSrc, 'services', 'apiClient.js')));
  assert('FormatCurrency utility exists in utils/', fs.existsSync(path.join(invSrc, 'utils', 'formatCurrency.js')));

  // 5. Shared Packages Verification
  const authStorePath = path.join(ROOT_DIR, 'packages', 'auth', 'src', 'useEnterpriseAuthStore.js');
  const authContent = fs.readFileSync(authStorePath, 'utf8');
  assert('ENTERPRISE_APPS in auth store only exposes storefront and inventory', !authContent.includes("'erp'") && !authContent.includes("'warehouse'") && !authContent.includes("'crm'"));

  // 6. Root Configuration Verification
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  assert('Root scripts do not contain obsolete app scripts', !rootPkg.scripts['dev:superadmin'] && !rootPkg.scripts['dev:pos'] && !rootPkg.scripts['dev:erp']);
  assert('Root build:all builds storefront and inventory', rootPkg.scripts['build:all'] === 'npm run build:storefront && npm run build:inventory');

  console.log('\n=================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
