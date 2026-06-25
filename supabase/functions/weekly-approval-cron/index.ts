// Supabase Edge Function: weekly-approval-cron
// Deploy with: supabase functions deploy weekly-approval-cron
// Schedule via Supabase Dashboard -> Edge Functions -> Cron (every Sunday 23:00)
// Cron expression: 0 23 * * 0

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

Deno.serve(async () => {
  try {
    const weekStart = getWeekStart(new Date())

    // Get all active students
    const { data: students, error: studErr } = await supabase
      .from('users')
      .select('id, supervisor_id')
      .eq('role', 'student')
      .eq('is_active', true)

    if (studErr) throw studErr

    let created = 0
    let skipped = 0

    for (const student of students ?? []) {
      // Check if already submitted
      const { data: existing } = await supabase
        .from('weekly_approvals')
        .select('id')
        .eq('student_id', student.id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (existing) { skipped++; continue }

      // Get week's total hours
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      const { data: att } = await supabase
        .from('attendance')
        .select('hours_worked')
        .eq('user_id', student.id)
        .gte('date', weekStart)
        .lte('date', weekEndStr)
        .not('check_out', 'is', null)

      const totalHours = (att ?? []).reduce((s, r) => s + parseFloat(r.hours_worked ?? 0), 0)

      if (totalHours === 0) { skipped++; continue }

      // Insert approval request
      const { error } = await supabase.from('weekly_approvals').insert({
        student_id: student.id,
        supervisor_id: student.supervisor_id,
        week_start: weekStart,
        total_hours: parseFloat(totalHours.toFixed(2)),
        status: 'pending',
      })

      if (!error) {
        created++
        // Notify supervisor
        if (student.supervisor_id) {
          await supabase.from('notifications').insert({
            user_id: student.supervisor_id,
            message: `[อัตโนมัติ] มีคำขออนุมัติชั่วโมงสัปดาห์ ${weekStart} รอการอนุมัติ`,
            type: 'approval_request',
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, weekStart, created, skipped }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
