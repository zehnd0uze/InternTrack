import { useState, useEffect } from 'react'
import { Clock, Save, GraduationCap, Building2, BookOpen, ChevronRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const STEPS = [
  { id: 'institution', title: 'สถาบันการศึกษา', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { id: 'faculty',     title: 'คณะ / แผนก',     icon: BookOpen,   color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  { id: 'major',       title: 'สาขาวิชา',        icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  { id: 'hours',       title: 'เวลาทำงาน',       icon: Clock,      color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
]

export default function OnboardingWizard({ user, profile, onComplete }) {
  const [step, setStep] = useState(0)

  // ---- Institution / Faculty / Major ----
  const [institutions, setInstitutions] = useState([])
  const [faculties, setFaculties] = useState([])
  const [majors, setMajors] = useState([])
  const [selectedInstitution, setSelectedInstitution] = useState(profile?.institution_id || '')
  const [selectedFaculty, setSelectedFaculty] = useState(profile?.faculty_id || '')
  const [selectedMajor, setSelectedMajor] = useState(profile?.major_id || '')

  // ---- Work Hours ----
  const [startTime, setStartTime] = useState(
    profile?.work_start_time ? profile.work_start_time.slice(0, 5) : '08:00'
  )
  const [endTime, setEndTime] = useState(
    profile?.work_end_time ? profile.work_end_time.slice(0, 5) : '17:00'
  )
  
  // ---- Internship Dates ----
  const [internshipStartDate, setInternshipStartDate] = useState(profile?.internship_start_date || '')
  const [internshipEndDate, setInternshipEndDate] = useState(profile?.internship_end_date || '')

  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)

  // Load institutions on mount
  useEffect(() => {
    supabase.from('institutions').select('*').eq('is_active', true).order('sort_order').order('full_name')
      .then(({ data }) => setInstitutions(data || []))
  }, [])

  // Load faculties when institution changes
  useEffect(() => {
    if (!selectedInstitution) { setFaculties([]); setSelectedFaculty(''); setMajors([]); setSelectedMajor(''); return }
    setDataLoading(true)
    supabase.from('faculties').select('*').eq('institution_id', selectedInstitution).eq('is_active', true).order('name')
      .then(({ data }) => { setFaculties(data || []); setDataLoading(false) })
  }, [selectedInstitution])

  // Load majors when faculty changes
  useEffect(() => {
    if (!selectedFaculty) { setMajors([]); setSelectedMajor(''); return }
    supabase.from('majors').select('*').eq('faculty_id', selectedFaculty).eq('is_active', true).order('name')
      .then(({ data }) => setMajors(data || []))
  }, [selectedFaculty])

  const handleFinalSave = async () => {
    setLoading(true)
    try {
      const payload = {
        institution_id: selectedInstitution || null,
        faculty_id: selectedFaculty || null,
        major_id: selectedMajor || null,
        work_start_time: startTime + ':00',
        work_end_time: endTime + ':00',
        internship_start_date: internshipStartDate,
        internship_end_date: internshipEndDate
      }
      const { error } = await supabase.from('users').update(payload).eq('id', user.id)
      if (error) throw error
      
      // Generate retroactive attendance
      await supabase.rpc('generate_retroactive_attendance', {
        p_user_id: user.id,
        p_start_date: internshipStartDate,
        p_end_date: internshipEndDate,
        p_start_time: startTime + ':00',
        p_end_time: endTime + ':00'
      })
      
      toast.success('บันทึกข้อมูลสำเร็จ! ยินดีต้อนรับสู่ระบบ 🎉')
      if (onComplete) onComplete()
      
      // Force reload so dashboard fetches newly generated attendance
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error(err)
      toast.error('บันทึกล้มเหลว กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 0) return !!selectedInstitution
    if (step === 1) return !!selectedFaculty
    if (step === 2) return true // major is optional
    if (step === 3) return !!startTime && !!endTime && !!internshipStartDate && !!internshipEndDate
    return true
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFinalSave()
  }

  const handleSkip = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFinalSave()
  }

  const currentStep = STEPS[step]
  const Icon = currentStep.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden animate-slide-up">

        {/* Header with steps indicator */}
        <div className={`${currentStep.bg} p-6 border-b ${currentStep.border}`}>
          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-white border-2 border-current shadow-sm ' + currentStep.color :
                  'bg-white/50 text-gray-400 border border-gray-200'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full transition-all duration-300 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className={`w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border ${currentStep.border}`}>
              <Icon size={26} className={currentStep.color} />
            </div>
            <h2 className="text-lg font-bold text-content">ขั้นตอนที่ {step + 1} / {STEPS.length}</h2>
            <p className="font-semibold text-content mt-0.5">{currentStep.title}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">

          {/* STEP 0 — Institution */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-content-muted">เลือกสถาบันการศึกษาที่คุณกำลังศึกษาอยู่</p>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {institutions.map(inst => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => { setSelectedInstitution(inst.id); setSelectedFaculty(''); setSelectedMajor('') }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 ${
                      selectedInstitution === inst.id
                        ? 'border-primary-600 bg-primary-50 text-primary-900'
                        : 'border-border bg-card hover:border-primary-300 hover:bg-surface-hover/40'
                    }`}
                  >
                    <Building2 size={16} className={selectedInstitution === inst.id ? 'text-primary-600' : 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{inst.full_name}</p>
                      <p className="text-xs text-content-muted">{inst.short_name}</p>
                    </div>
                    {selectedInstitution === inst.id && (
                      <Check size={16} className="text-primary-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Faculty */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-content-muted">เลือกคณะหรือแผนกวิชาของคุณ</p>
              {dataLoading ? (
                <div className="py-8 text-center text-sm text-content-muted">กำลังโหลดข้อมูล...</div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {faculties.length === 0 && (
                    <p className="text-center py-6 text-sm text-gray-400">ไม่พบข้อมูลคณะสำหรับสถาบันนี้</p>
                  )}
                  {faculties.map(fac => (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => { setSelectedFaculty(fac.id); setSelectedMajor('') }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 ${
                        selectedFaculty === fac.id
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-border bg-card hover:border-purple-300 hover:bg-surface-hover/40'
                      }`}
                    >
                      <BookOpen size={16} className={selectedFaculty === fac.id ? 'text-purple-500' : 'text-gray-400'} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{fac.name}</p>
                        {fac.name_en && <p className="text-xs text-content-muted truncate">{fac.name_en}</p>}
                      </div>
                      {selectedFaculty === fac.id && (
                        <Check size={16} className="text-purple-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Major */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-content-muted">เลือกสาขาวิชาของคุณ (ไม่บังคับ)</p>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {majors.length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-400">
                    <GraduationCap size={28} className="mx-auto mb-2 opacity-30" />
                    ไม่มีสาขาในระบบ หรือสามารถข้ามขั้นตอนนี้ได้
                  </div>
                )}
                {majors.map(maj => (
                  <button
                    key={maj.id}
                    type="button"
                    onClick={() => setSelectedMajor(selectedMajor === maj.id ? '' : maj.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 ${
                      selectedMajor === maj.id
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : 'border-border bg-card hover:border-green-300 hover:bg-surface-hover/40'
                    }`}
                  >
                    <GraduationCap size={16} className={selectedMajor === maj.id ? 'text-green-500' : 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{maj.name}</p>
                      {maj.name_en && <p className="text-xs text-content-muted">{maj.name_en}</p>}
                    </div>
                    {selectedMajor === maj.id && (
                      <Check size={16} className="text-green-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Work Hours */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-content-muted">ระบุช่วงเวลาฝึกงานและเวลาเข้างานของคุณ เพื่อให้ระบบแจ้งเตือนได้อย่างแม่นยำ</p>
              
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3">
                <p className="text-xs text-primary-800 font-medium">
                  <span className="font-bold">✨ พิเศษ:</span> ระบบจะนำข้อมูลนี้ไปสร้างประวัติการลงเวลาย้อนหลัง (จ.-ศ.) ให้โดยอัตโนมัติ ไม่ต้องมานั่งกรอกย้อนหลังเอง!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1.5">
                    วันที่เริ่มฝึกงาน <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={internshipStartDate}
                    onChange={e => setInternshipStartDate(e.target.value)}
                    className="input w-full text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1.5">
                    วันสิ้นสุดการฝึกงาน <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={internshipEndDate}
                    onChange={e => setInternshipEndDate(e.target.value)}
                    className="input w-full text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1.5">
                    เวลาเข้างานปกติ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-1.5">
                    เวลาเลิกงานปกติ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-sm text-blue-700">
                <strong>หมายเหตุ:</strong> แก้ไขข้อมูลทั้งหมดได้ภายหลังในหน้า "โปรไฟล์"
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="btn-secondary flex-1"
            >
              ← ย้อนกลับ
            </button>
          )}

          {/* Skip — available on faculty (if none found) and major step */}
          {(step === 1 && faculties.length === 0) || step === 2 ? (
            <button type="button" onClick={handleSkip} className="btn-secondary flex-1">
              ข้ามขั้นตอนนี้
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : step < STEPS.length - 1 ? (
              <><span>ถัดไป</span> <ChevronRight size={16} /></>
            ) : (
              <><Save size={16} /> <span>บันทึกและเริ่มใช้งาน</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
