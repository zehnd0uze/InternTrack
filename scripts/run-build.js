import { spawn } from 'child_process';
import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import { join } from 'path';

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
      data = [mockUser, ...mockStudents];
    } else if (table === 'attendance') {
      data = mockAttendance;
    } else if (table === 'daily_logs') {
      data = mockLogs;
    } else if (table === 'internship_placements') {
      data = mockPlacements;
    } else if (table === 'leave_requests') {
      data = mockLeaves;
    } else if (table === 'missing_attendance') {
      data = [
        { id: 'm1', student_id: 'mock-student-1', date: '2026-07-08', missing_type: 'both', note: 'ทำงานเว็บแอป', time_in: '08:00', time_out: '17:00', users: mockStudents[0] }
      ];
    }

    let chainData = data;
    const chain = {
      select: () => chain,
      eq: (col, val) => {
        if (table === 'users' && col === 'id') {
          chainData = chainData.filter(item => item[col] === val);
        }
        return chain;
      },
      neq: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve({ data: chainData[0] || null, error: null }),
      maybeSingle: () => Promise.resolve({ data: chainData[0] || null, error: null }),
      then: (resolve) => resolve({ data: chainData, count: chainData.length, error: null }),
      insert: (payload) => Promise.resolve({ data: payload, error: null }),
      update: (payload) => Promise.resolve({ data: payload, error: null }),
      delete: () => Promise.resolve({ error: null }),
    };
    return chain;
  }
};
`;

async function isServerReady() {
  return new Promise((resolve) => {
    http.get('http://localhost:5173', (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  // Backup and mock supabase BEFORE building
  if (fs.existsSync(supabasePath)) {
    fs.copyFileSync(supabasePath, supabaseBackupPath);
  }
  fs.writeFileSync(supabasePath, mockSupabaseCode);
  console.log('Mocked supabase.js BEFORE building for production compilation.');

  console.log('Building Vite Production App...');
  const buildResult = await new Promise((resolve) => {
    const cp = spawn('npm', ['run', 'build'], {
      shell: true,
      stdio: 'inherit'
    });
    cp.on('close', (code) => resolve(code));
  });

  if (buildResult !== 0) {
    console.error('Vite compilation failed.');
    // Restore backup on build failure
    if (fs.existsSync(supabaseBackupPath)) {
      fs.copyFileSync(supabaseBackupPath, supabasePath);
      fs.unlinkSync(supabaseBackupPath);
      console.log('Restored original supabase.js due to build failure.');
    }
    process.exit(1);
  }

  console.log('Starting Vite Preview Server on port 5173...');
  const viteProcess = spawn('npx', ['vite', 'preview', '--port', '5173'], {
    shell: true,
    stdio: 'inherit'
  });

  // Wait for server to start (up to 15 seconds)
  let ready = false;
  for (let i = 0; i < 15; i++) {
    ready = await isServerReady();
    if (ready) break;
    await delay(1000);
    console.log('Waiting for preview server to start...');
  }

  if (!ready) {
    console.error('Failed to start Vite preview server.');
    // Kill Vite
    if (process.platform === 'win32') {
      exec('taskkill /pid ' + viteProcess.pid + ' /T /F');
    } else {
      viteProcess.kill();
    }
    // Restore backup
    if (fs.existsSync(supabaseBackupPath)) {
      fs.copyFileSync(supabaseBackupPath, supabasePath);
      fs.unlinkSync(supabaseBackupPath);
      console.log('Restored original supabase.js');
    }
    process.exit(1);
  }

  console.log('Preview server is ready! Running screenshot capture...');
  
  // Run capture script
  const captureResult = await new Promise((resolve) => {
    const cp = spawn('node', ['scripts/capture-screenshots.js'], {
      shell: true,
      stdio: 'inherit'
    });
    cp.on('close', (code) => resolve(code));
  });

  if (captureResult !== 0) {
    console.error('Screenshot capture failed.');
    // Stop server
    if (process.platform === 'win32') {
      exec('taskkill /pid ' + viteProcess.pid + ' /T /F');
    } else {
      viteProcess.kill();
    }
    // Restore backup
    if (fs.existsSync(supabaseBackupPath)) {
      fs.copyFileSync(supabaseBackupPath, supabasePath);
      fs.unlinkSync(supabaseBackupPath);
      console.log('Restored original supabase.js');
    }
    process.exit(1);
  }

  console.log('Screenshots captured successfully. Running PDF builder...');

  // Run PDF build
  const pdfResult = await new Promise((resolve) => {
    const cp = spawn('node', ['scripts/build-manual.js'], {
      shell: true,
      stdio: 'inherit'
    });
    cp.on('close', (code) => resolve(code));
  });

  console.log('Stopping Vite Preview Server...');
  // Kill Vite
  if (process.platform === 'win32') {
    exec('taskkill /pid ' + viteProcess.pid + ' /T /F');
  } else {
    viteProcess.kill();
  }

  // Restore original supabase.js
  if (fs.existsSync(supabaseBackupPath)) {
    fs.copyFileSync(supabaseBackupPath, supabasePath);
    fs.unlinkSync(supabaseBackupPath);
    console.log('Restored original supabase.js after completion.');
  }

  if (pdfResult !== 0) {
    console.error('PDF manual generation failed.');
    process.exit(1);
  }

  console.log('All processes completed successfully! USER_MANUAL.pdf updated.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  // Double-check restore
  if (fs.existsSync(supabaseBackupPath)) {
    fs.copyFileSync(supabaseBackupPath, supabasePath);
    fs.unlinkSync(supabaseBackupPath);
  }
  process.exit(1);
});
