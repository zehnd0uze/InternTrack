import { useState } from 'react'
import { Clock, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function WorkHoursModal({ user, onComplete }) {
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!startTime || !endTime) {
      toast.error('กรุณาระบุเวลาให้ครบถ้วน')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          work_start_time: startTime + ':00',
          work_end_time: endTime + ':00'
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('บันทึกเวลาทำงานประจำสำเร็จ!')
      if (onComplete) onComplete()
    } catch (err) {
      console.error(err)
      toast.error('บันทึกข้อมูลล้มเหลว กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden animate-slide-up">
        <div className="bg-primary-50 p-6 text-center border-b border-primary-100">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-primary-100">
            <Clock size={32} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900">ตั้งค่าเวลาทำงานประจำ</h2>
          <p className="text-sm text-primary-700 mt-2">
            เพื่อให้ระบบสามารถแจ้งเตือนการเช็คอินและเช็คเอาท์ได้อย่างแม่นยำ กรุณาระบุเวลาเข้าและเลิกงานปกติของคุณ
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-muted mb-1.5">
                เวลาเข้างาน <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-muted mb-1.5">
                เวลาเลิกงาน <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-sm text-blue-700">
            <strong>หมายเหตุ:</strong> คุณสามารถแก้ไขเวลานี้ได้ภายหลังในหน้า "โปรไฟล์"
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-base flex justify-center items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {loading ? 'กำลังบันทึก...' : 'บันทึกเวลาทำงาน'}
          </button>
        </form>
      </div>
    </div>
  )
}
