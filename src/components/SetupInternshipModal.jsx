import { useState } from 'react'
import { Calendar, Clock, Save, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function SetupInternshipModal({ onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  const [internshipStartDate, setInternshipStartDate] = useState(profile?.internship_start_date || '')
  const [internshipEndDate, setInternshipEndDate] = useState(profile?.internship_end_date || '')
  const [workStartTime, setWorkStartTime] = useState(profile?.work_start_time ? profile.work_start_time.slice(0, 5) : '08:00')
  const [workEndTime, setWorkEndTime] = useState(profile?.work_end_time ? profile.work_end_time.slice(0, 5) : '17:00')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!internshipStartDate || !internshipEndDate || !workStartTime || !workEndTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    setLoading(true)
    try {
      // 1. Update Profile
      const { error: dbErr } = await supabase
        .from('users')
        .update({ 
          work_start_time: workStartTime + ':00',
          work_end_time: workEndTime + ':00',
          internship_start_date: internshipStartDate,
          internship_end_date: internshipEndDate
        })
        .eq('id', user.id)

      if (dbErr) throw dbErr

      // 2. Generate retroactive attendance
      const { data: recordsCreated, error: rpcErr } = await supabase.rpc('generate_retroactive_attendance', {
        p_user_id: user.id,
        p_start_date: internshipStartDate,
        p_end_date: internshipEndDate,
        p_start_time: workStartTime + ':00',
        p_end_time: workEndTime + ':00'
      })
      
      if (rpcErr) {
        console.error('Error generating attendance:', rpcErr)
      } else if (recordsCreated > 0) {
        toast.success(`สร้างประวัติการลงเวลาย้อนหลังสำเร็จ จำนวน ${recordsCreated} วัน`)
      } else {
        toast.success('บันทึกข้อมูลสำเร็จ')
      }

      await refreshProfile()
      if (onClose) onClose()
      
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">ตั้งค่าเริ่มต้นการฝึกงาน</h2>
          <p className="text-primary-100 text-sm">
            กรุณาระบุช่วงเวลาฝึกงานและเวลาเข้างานของคุณ<br/>เพื่อช่วยให้ระบบจัดการชั่วโมงทำงานให้คุณอัตโนมัติ
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form id="setup-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-2">
              <p className="text-xs text-primary-800 font-medium">
                <span className="font-bold">✨ พิเศษ:</span> ระบบจะนำข้อมูลนี้ไปสร้างประวัติการลงเวลาย้อนหลัง (จ.-ศ.) ให้โดยอัตโนมัติ ไม่ต้องมานั่งกรอกย้อนหลังเอง!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-muted mb-1.5">
                  วันที่เริ่มฝึกงาน <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={internshipStartDate}
                    onChange={e => setInternshipStartDate(e.target.value)}
                    className="input pl-9 w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-content-muted mb-1.5">
                  วันสิ้นสุดการฝึกงาน <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={internshipEndDate}
                    onChange={e => setInternshipEndDate(e.target.value)}
                    className="input pl-9 w-full"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-muted mb-1.5">
                  เวลาเข้างานปกติ <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={e => setWorkStartTime(e.target.value)}
                    className="input pl-9 w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-content-muted mb-1.5">
                  เวลาเลิกงานปกติ <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={e => setWorkEndTime(e.target.value)}
                    className="input pl-9 w-full"
                    required
                  />
                </div>
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-surface-hover flex justify-end gap-3">
          <button
            type="submit"
            form="setup-form"
            disabled={loading}
            className="btn-primary flex-1 py-2.5 text-base shadow-lg shadow-primary-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Save size={18} /> บันทึกและเริ่มใช้งาน
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
