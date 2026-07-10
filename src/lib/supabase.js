
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
  id: `mock-${mockRole}-id`,
  email: `${mockRole}@example.com`,
  full_name: `Mock ${mockRole.charAt(0).toUpperCase() + mockRole.slice(1)}`,
  role: mockRole,
  is_active: true,
  target_hours: 240,
  institution_id: 'mock-institution-id',
  work_start_time: '08:00',
  internship_start_date: todayStr,
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
