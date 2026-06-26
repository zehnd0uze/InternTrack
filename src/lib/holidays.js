// Thai Public Holidays
// This is a static list for common years. For exact lunar dates (Buddhism holidays), 
// they are approximated for 2026, but can be updated here easily.

export const THAI_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
  { date: '2026-03-03', name: 'วันมาฆบูชา' },
  { date: '2026-04-06', name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช (วันจักรี)' },
  { date: '2026-04-13', name: 'วันสงกรานต์' },
  { date: '2026-04-14', name: 'วันสงกรานต์' },
  { date: '2026-04-15', name: 'วันสงกรานต์' },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล' },
  { date: '2026-05-31', name: 'วันวิสาขบูชา' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดาฯ' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา รัชกาลที่ 10' },
  { date: '2026-07-29', name: 'วันอาสาฬหบูชา' },
  { date: '2026-07-30', name: 'วันเข้าพรรษา' },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ' },
  { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต รัชกาลที่ 9' },
  { date: '2026-10-23', name: 'วันปิยมหาราช' },
  { date: '2026-12-05', name: 'วันพ่อแห่งชาติ' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ' },
  { date: '2026-12-31', name: 'วันสิ้นปี' },
]

export function getThaiHolidays(year = 2026) {
  // Currently supports 2026 explicitly, can be expanded dynamically if needed
  if (year === 2026) return THAI_HOLIDAYS_2026;
  return [] // Fallback for other years
}

export function isThaiHoliday(dateString) {
  // dateString should be 'YYYY-MM-DD'
  const year = parseInt(dateString.substring(0, 4))
  const holidays = getThaiHolidays(year)
  const holiday = holidays.find(h => h.date === dateString)
  return holiday ? holiday.name : null
}
