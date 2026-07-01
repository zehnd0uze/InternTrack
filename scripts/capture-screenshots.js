import puppeteer from 'puppeteer';
import { join } from 'path';

const APP_URL = 'http://localhost:5173';
const OUTPUT_DIR = join(process.cwd(), 'public', 'manual_images');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 }); // Increase height to capture complete views

  // --- 1. STUDENT ---
  console.log('Navigating to Student views...');
  await page.goto(`${APP_URL}/student?mockRole=student`);
  await page.waitForSelector('.bg-sidebar');
  await delay(2000); // Wait for dashboard clock & timer
  await page.screenshot({ path: join(OUTPUT_DIR, 'student_dashboard.png') });

  // Let's open the Student Edit Log Modal and capture it
  console.log('Opening Student Edit Log Modal...');
  await page.waitForSelector('table tbody tr:first-child button');
  await page.click('table tbody tr:first-child button');
  await delay(1000); // Wait for modal slide in
  await page.screenshot({ path: join(OUTPUT_DIR, 'student_edit_log_modal.png') });
  
  // Close the modal
  await page.keyboard.press('Escape');
  await delay(500);

  await page.goto(`${APP_URL}/student/weekly`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'student_weekly_submit.png') });

  await page.goto(`${APP_URL}/student/leave`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'student_leave_request.png') });

  await page.goto(`${APP_URL}/student/schedule`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'student_schedule.png') });

  await page.goto(`${APP_URL}/student/profile`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'student_profile.png') });

  // --- 2. MENTOR ---
  console.log('Navigating to Mentor views...');
  await page.goto(`${APP_URL}/mentor?mockRole=mentor`);
  await page.waitForSelector('.bg-sidebar');
  await delay(2000);
  await page.screenshot({ path: join(OUTPUT_DIR, 'mentor_dashboard.png') });

  await page.goto(`${APP_URL}/mentor/approvals`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  
  // Expand the pending weekly approval to show detailed daily breakdown
  console.log('Expanding Mentor pending approval card...');
  await page.waitForSelector('.shadow-card');
  await page.click('.shadow-card > div');
  await delay(1500); // Wait for expand details transition
  await page.screenshot({ path: join(OUTPUT_DIR, 'mentor_approvals.png') });

  await page.goto(`${APP_URL}/mentor/leave`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'mentor_leave_approvals.png') });

  await page.goto(`${APP_URL}/mentor/schedule`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'mentor_schedule.png') });

  // --- 3. SUPERVISOR ---
  console.log('Navigating to Supervisor views...');
  await page.goto(`${APP_URL}/supervisor?mockRole=supervisor`);
  await page.waitForSelector('.bg-sidebar');
  await delay(2000);
  await page.screenshot({ path: join(OUTPUT_DIR, 'supervisor_dashboard.png') });

  await page.goto(`${APP_URL}/supervisor/report`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'supervisor_report.png') });

  // --- 4. ADMIN ---
  console.log('Navigating to Admin views...');
  await page.goto(`${APP_URL}/admin?mockRole=admin`);
  await page.waitForSelector('.bg-sidebar');
  await delay(2000);
  await page.screenshot({ path: join(OUTPUT_DIR, 'admin_dashboard.png') });

  await page.goto(`${APP_URL}/admin/users`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'admin_users.png') });

  await page.goto(`${APP_URL}/admin/placements`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'admin_placements.png') });

  await page.goto(`${APP_URL}/admin/data`);
  await page.waitForSelector('.bg-sidebar');
  await delay(1500);
  await page.screenshot({ path: join(OUTPUT_DIR, 'admin_data_manager.png') });

  // Let's capture the Admin Edit Log/Time Modal (through viewing student dashboard mock)
  console.log('Navigating to Student dashboard in Admin view-as mode...');
  await page.goto(`${APP_URL}/student?mockRole=admin`);
  await page.waitForSelector('.bg-sidebar');
  await delay(2000);
  
  console.log('Opening Admin Edit Log Modal...');
  await page.waitForSelector('table tbody tr:first-child button');
  await page.click('table tbody tr:first-child button');
  await delay(1500); // Wait for modal slide in
  await page.screenshot({ path: join(OUTPUT_DIR, 'admin_edit_log_modal.png') });

  console.log('Done! All screenshots captured.');
  await browser.close();
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
