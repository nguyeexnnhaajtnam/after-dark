import {defineConfig,devices} from '@playwright/test';
// Set E2E_BASE_URL to test an already-running server; otherwise the dev server is started.
const external=process.env.E2E_BASE_URL;
export default defineConfig({testDir:'./e2e',timeout:240000,expect:{timeout:10000},fullyParallel:false,use:{baseURL:external||'http://127.0.0.1:3000',trace:'retain-on-failure'},
 projects:[{name:'mobile-chromium',use:{...devices['iPhone 13'],browserName:'chromium'}}],
 ...(external?{}:{webServer:{command:'corepack pnpm dev',url:'http://127.0.0.1:3000',reuseExistingServer:true,timeout:120000}})});
