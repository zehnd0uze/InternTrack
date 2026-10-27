// Thai Public Holidays with accurate data including substitution days (วันหยุดชดเชย)

const HOLIDAYS_DB = {
  2025: [
    { date: '2025-01-01', name: 'วันขึ้นปีใหม่' },
    { date: '2025-02-12', name: 'วันมาฆบูชา' },
    { date: '2025-04-06', name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)' },
    { date: '2025-04-07', name: 'ชดเชยวันจักรี' },
    { date: '2025-04-13', name: 'วันสงกรานต์' },
    { date: '2025-04-14', name: 'วันสงกรานต์' },
    { date: '2025-04-15', name: 'วันสงกรานต์' },
    { date: '2025-05-01', name: 'วันแรงงานแห่งชาติ' },
    { date: '2025-05-04', name: 'วันฉัตรมงคล' },
    { date: '2025-05-05', name: 'ชดเชยวันฉัตรมงคล' },
    { date: '2025-05-11', name: 'วันวิสาขบูชา' },
    { date: '2025-05-12', name: 'ชดเชยวันวิสาขบูชา' },
    { date: '2025-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดาฯ' },
    { date: '2025-07-10', name: 'วันอาสาฬหบูชา' },
    { date: '2025-07-11', name: 'วันเข้าพรรษา' },
    { date: '2025-07-28', name: 'วันเฉลิมพระชนมพรรษา รัชกาลที่ 10' },
    { date: '2025-08-12', name: 'วันแม่แห่งชาติ' },
    { date: '2025-10-13', name: 'วันคล้ายวันสวรรคต รัชกาลที่ 9' },
    { date: '2025-10-23', name: 'วันปิยมหาราช' },
    { date: '2025-12-05', name: 'วันพ่อแห่งชาติ' },
    { date: '2025-12-10', name: 'วันรัฐธรรมนูญ' },
    { date: '2025-12-31', name: 'วันสิ้นปี' },
  ],
  2026: [
    { date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
    { date: '2026-03-03', name: 'วันมาฆบูชา' },
    { date: '2026-04-06', name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)' },
    { date: '2026-04-13', name: 'วันสงกรานต์' },
    { date: '2026-04-14', name: 'วันสงกรานต์' },
    { date: '2026-04-15', name: 'วันสงกรานต์' },
    { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
    { date: '2026-05-04', name: 'วันฉัตรมงคล' },
    { date: '2026-05-31', name: 'วันวิสาขบูชา' },
    { date: '2026-06-01', name: 'ชดเชยวันวิสาขบูชา' },
    { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดาฯ' },
    { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา รัชกาลที่ 10' },
    { date: '2026-07-29', name: 'วันอาสาฬหบูชา' },
    { date: '2026-07-30', name: 'วันเข้าพรรษา' },
    { date: '2026-08-12', name: 'วันแม่แห่งชาติ' },
    { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต รัชกาลที่ 9' },
    { date: '2026-10-23', name: 'วันปิยมหาราช' },
    { date: '2026-12-05', name: 'วันพ่อแห่งชาติ' },
    { date: '2026-12-07', name: 'ชดเชยวันพ่อแห่งชาติ' },
    { date: '2026-12-10', name: 'วันรัฐธรรมนูญ' },
    { date: '2026-12-31', name: 'วันสิ้นปี' },
  ]
}

export const THAI_HOLIDAYS_2026 = HOLIDAYS_DB[2026]

// Fixed-date (solar) Thai public holidays. Used for years that have no
// verified list above. Lunar Buddhist days (มาฆบูชา, วิสาขบูชา, อาสาฬหบูชา,
// เข้าพรรษา) and special cabinet days move every year, so admins add them
// in the app (Admin → วันหยุด), stored in the `holidays` table.
const FIXED_HOLIDAYS = [
  ['01-01', 'วันขึ้นปีใหม่'],
  ['04-06', 'วันจักรี'],
  ['04-13', 'วันสงกรานต์'],
  ['04-14', 'วันสงกรานต์'],
  ['04-15', 'วันสงกรานต์'],
  ['05-01', 'วันแรงงานแห่งชาติ'],
  ['05-04', 'วันฉัตรมงคล'],
  ['06-03', 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดาฯ'],
  ['07-28', 'วันเฉลิมพระชนมพรรษา รัชกาลที่ 10'],
  ['08-12', 'วันแม่แห่งชาติ'],
  ['10-13', 'วันคล้ายวันสวรรคต รัชกาลที่ 9'],
  ['10-23', 'วันปิยมหาราช'],
  ['12-05', 'วันพ่อแห่งชาติ'],
  ['12-10', 'วันรัฐธรรมนูญ'],
  ['12-31', 'วันสิ้นปี'],
]

const pad = n => String(n).padStart(2, '0')
const toStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6

// Fixed holidays plus substitution days (ชดเชย): a holiday on Sat/Sun moves
// to the next weekday that is not already a holiday.
function computeFixedHolidays(year) {
  const list = FIXED_HOLIDAYS.map(([md, name]) => ({ date: `${year}-${md}`, name }))
  const taken = new Set(list.map(h => h.date))
  const subs = []
  for (const h of list) {
    const d = new Date(`${h.date}T00:00:00`)
    if (!isWeekend(d)) continue
    do { d.setDate(d.getDate() + 1) } while (isWeekend(d) || taken.has(toStr(d)))
    taken.add(toStr(d))
    subs.push({ date: toStr(d), name: `ชดเชย${h.name}` })
  }
  return [...list, ...subs]
}

function builtinHolidays(year) {
  if (HOLIDAYS_DB[year]) return HOLIDAYS_DB[year]
  // Substitution days can spill into the next year (e.g. 31 Dec on a weekend)
  return [...computeFixedHolidays(year - 1), ...computeFixedHolidays(year)]
    .filter(h => h.date.startsWith(`${year}-`))
}

// ---- Admin-managed overrides (public.holidays) ----
let customHolidays = new Map() // date -> { name, is_day_off }
let loadPromise = null
const listeners = new Set()

export function loadHolidays({ force = false } = {}) {
  if (loadPromise && !force) return loadPromise
  loadPromise = import('./supabase').then(async ({ supabase }) => {
    const { data, error } = await supabase.from('holidays').select('date, name, is_day_off')
    // Table missing (migration 025 not run) → keep built-in list only
    if (error) { console.warn('holidays:', error.message); return }
    customHolidays = new Map(data.map(h => [h.date, h]))
    listeners.forEach(fn => fn())
  })
  return loadPromise
}

export function onHolidaysChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getThaiHolidays(year = new Date().getFullYear()) {
  const byDate = new Map(builtinHolidays(year).map(h => [h.date, { ...h, source: 'builtin' }]))
  for (const [date, h] of customHolidays) {
    if (!date.startsWith(`${year}-`)) continue
    if (h.is_day_off) byDate.set(date, { date, name: h.name, source: 'custom' })
    else byDate.delete(date)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function isThaiHoliday(dateString) {
  // dateString should be 'YYYY-MM-DD'
  const year = parseInt(dateString.substring(0, 4))
  const holiday = getThaiHolidays(year).find(h => h.date === dateString)
  return holiday ? holiday.name : null
}

// Years with a verified built-in list (others rely on admin entries for lunar days)
export function hasVerifiedHolidayList(year) {
  return !!HOLIDAYS_DB[year]
}
