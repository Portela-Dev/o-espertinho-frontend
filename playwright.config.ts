import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',fullyParallel:false,workers:1,timeout:45000,use:{baseURL:process.env['E2E_BASE_URL']||'http://localhost:4200',headless:true,channel:process.env['E2E_BROWSER_CHANNEL']||(process.platform==='win32'?'msedge':'chromium'),trace:'retain-on-failure'},reporter:'list'});
