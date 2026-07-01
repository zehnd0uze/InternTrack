import puppeteer from 'puppeteer';
import { join } from 'path';
import fs from 'fs';

const APP_URL = 'http://localhost:5173';
const OUTPUT_DIR = join(process.cwd(), 'public', 'manual_images');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const supabasePath = join(process.cwd(), 'src', 'lib', 'supabase.js');
const supabaseBackupPath = join(process.cwd(), 'supabase.backup.js');

const mockSupabaseCode = `
const todayStr = new Date().toISOString().split('T')[0];

let mockRole = 'student';
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get('mockRole');
  if (urlRole) {
    sessionStorage.setItem('mockRole', urlRole);
    mockRole = urlRole;
  } else {
    mockRole = sessionStorage.getItem('mockRole') || 'student';
  }
}

const mockUser = {
  id: \`mock-\${mockRole}-id\`,
  email: \`\${mockRole}@example.com\`,
  full_name: \`Mock \${mockRole.charAt(0).toUpperCase() + mockRole.slice(1)}\`,
  role: mockRole,
  is_active: true,
  target_hours: 240,
};

const mockStudents = [
  { id: 'mock-student-1', full_name: 'สมชาย ดีใจ', email: 'student1@example.com', role: 'student', is_active: true, target_hours: 240, supervisor_id: 'mock-supervisor-id' },
  { id: 'mock-student-2', full_name: 'สมศรี มีสุข', email: 'student2@example.com', role: 'student', is_active: true, target_hours: 240, supervisor_id: 'mock-supervisor-id' },
];

const mockPlacements = [
  { id: 'p1', student_id: 'mock-student-1', mentor_id: 'mock-mentor-id', company_name: 'บริษัท เทค จำกัด', student: mockStudents[0] },
  { id: 'p2', student_id: 'mock-student-2', mentor_id: 'mock-mentor-id', company_name: 'บริษัท เทค จำกัด', student: mockStudents[1] },
];

const mockAttendance = [
  { id: 'a1', user_id: 'mock-student-1', date: todayStr, check_in: todayStr + 'T08:00:00.000Z', check_out: todayStr + 'T16:00:00.000Z', hours_worked: 8, users: mockStudents[0] },
  { id: 'a2', user_id: 'mock-student-2', date: todayStr, check_in: todayStr + 'T08:30:00.000Z', check_out: null, hours_worked: null, users: mockStudents[1] },
];

const mockLogs = [
  { id: 'l1', log_text: 'พัฒนาเว็บไซต์ด้วย React และ TailwindCSS', date: todayStr, created_at: todayStr + 'T16:00:00.000Z', user_id: 'mock-student-1', users: mockStudents[0] },
];

const mockLeaves = [
  { id: 'lv1', student_id: 'mock-student-1', user_id: 'mock-student-1', type: 'sick', start_date: '2026-07-05', end_date: '2026-07-06', status: 'pending', reason: 'เป็นไข้หวัด', created_at: todayStr + 'T12:00:00.000Z', student: mockStudents[0] },
];

export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: { user: mockUser } } }),
    onAuthStateChange: (callback) => {
      if (typeof callback === 'function') {
        setTimeout(() => callback('SIGNED_IN', { user: mockUser }), 0);
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signOut: () => Promise.resolve({ error: null }),
  },
  channel: () => ({
    on: function() { return this; },
    subscribe: (callback) => {
      if (typeof callback === 'function') {
        setTimeout(() => callback('SUBSCRIBED'), 0);
      }
      return {};
    },
  }),
  removeChannel: () => {},
  from: (table) => {
    let data = [];
    if (table === 'users') {
      if (mockRole === 'student') {
        data = [mockUser];
      } else {
        data = mockStudents;
      }
    } else if (table === 'attendance') {
      data = mockAttendance;
    } else if (table === 'daily_logs') {
      data = mockLogs;
    } else if (table === 'internship_placements') {
      data = mockPlacements;
    } else if (table === 'leave_requests') {
      data = mockLeaves;
    }

    const chain = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve({ data: data[0] || null, error: null }),
      maybeSingle: () => Promise.resolve({ data: data[0] || null, error: null }),
      then: (resolve) => resolve({ data, count: data.length, error: null }),
      insert: (payload) => Promise.resolve({ data: payload, error: null }),
      update: (payload) => Promise.resolve({ data: payload, error: null }),
      delete: () => Promise.resolve({ error: null }),
    };
    return chain;
  }
};
`;

async function capture() {
  // Backup original supabase.js
  if (fs.existsSync(supabasePath)) {
    fs.copyFileSync(supabasePath, supabaseBackupPath);
  }
  // Write mock supabase.js
  fs.writeFileSync(supabasePath, mockSupabaseCode);
  console.log('Mocked supabase.js for Puppeteer capture.');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Pipe console messages and errors for debugging
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  try {
    // --- 1. STUDENT ---
    console.log('Navigating to Student views...');
    await page.goto(`${APP_URL}/student?mockRole=student`);
    await page.waitForSelector('.bg-sidebar');
    await delay(3000); 
    await page.screenshot({ path: join(OUTPUT_DIR, 'student_dashboard.png') });

    console.log('Opening Student Edit Log Modal...');
    await page.waitForSelector('table tbody tr:first-child button');
    await page.click('table tbody tr:first-child button');
    await delay(1500);
    await page.screenshot({ path: join(OUTPUT_DIR, 'student_edit_log_modal.png') });
    
    await page.keyboard.press('Escape');
    await delay(500);

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

    console.log('Navigating to Student dashboard in Admin view-as mode...');
    await page.goto(`${APP_URL}/student?mockRole=admin`);
    await page.waitForSelector('.bg-sidebar');
    await delay(2000);
    
    console.log('Opening Admin Edit Log Modal...');
    await page.waitForSelector('table tbody tr:first-child button');
    await page.click('table tbody tr:first-child button');
    await delay(1500);
    await page.screenshot({ path: join(OUTPUT_DIR, 'admin_edit_log_modal.png') });

    console.log('Done! All screenshots captured.');
  } finally {
    await browser.close();
    // Restore original supabase.js
    if (fs.existsSync(supabaseBackupPath)) {
      fs.copyFileSync(supabaseBackupPath, supabasePath);
      fs.unlinkSync(supabaseBackupPath);
      console.log('Restored original supabase.js');
    }
  }
}

capture().catch(err => {
  console.error('Error during capture:', err);
  // Ensure restoration even on script failure
  if (fs.existsSync(supabaseBackupPath)) {
    fs.copyFileSync(supabaseBackupPath, supabasePath);
    fs.unlinkSync(supabaseBackupPath);
    console.log('Restored original supabase.js after error.');
  }
  process.exit(1);
});
