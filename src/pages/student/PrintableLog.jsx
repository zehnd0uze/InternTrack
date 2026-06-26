import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSearchParams } from 'react-router-dom'

function formatThaiTime(dt) {
  if (!dt) return '-'
  return format(new Date(dt), 'HH:mm', { locale: th }) 
}

function formatThaiDateShort(dt) {
  if (!dt) return '-'
  return format(new Date(dt), 'dd/MM/yy', { locale: th })
}

export default function PrintableLog() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('studentId') || user?.id

  const [data, setData] = useState([])
  const [placement, setPlacement] = useState(null)
  const [studentProfile, setStudentProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logoLoaded, setLogoLoaded] = useState(false)

  const getSemesterAndYear = (dateStr) => {
    if (!dateStr) return { semester: '', year: '' }
    const dateObj = new Date(dateStr)
    const month = dateObj.getMonth() + 1 // 1-12
    
    if (month >= 6 && month <= 10) {
      return { semester: '1', year: '2569' }
    } else if (month === 11 || month === 12 || month >= 1 && month <= 3) {
      return { semester: '2', year: '2569' }
    }
    
    // Fallback: standard BE conversion based on June-May academic year
    const gYear = dateObj.getFullYear()
    const beYear = gYear + 543
    const sem = (month >= 6 && month <= 10) ? '1' : '2'
    const yr = month < 6 ? beYear - 1 : beYear
    return { semester: sem.toString(), year: yr.toString() }
  }

  const getPlacementMonths = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 10
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    
    const startYear = start.getFullYear()
    const startMonth = start.getMonth() + 1
    const endYear = end.getFullYear()
    const endMonth = end.getMonth() + 1
    
    const total = (endYear - startYear) * 12 + (endMonth - startMonth) + 1
    return total > 0 ? total : 10
  }

  const getMonthNumber = (dateStr, startDateStr) => {
    if (!dateStr || !startDateStr) return 1
    const dateObj = new Date(dateStr)
    const start = new Date(startDateStr)
    
    const startYear = start.getFullYear()
    const startMonth = start.getMonth() + 1
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    
    const index = (year - startYear) * 12 + (month - startMonth) + 1
    return index > 0 ? index : 1
  }

  // Preload logo image to guarantee it's in browser cache before print preview
  useEffect(() => {
    const img = new Image()
    img.src = '/camt-logo.png'
    img.onload = () => setLogoLoaded(true)
    img.onerror = () => {
      console.error('Failed to load logo asset')
      setLogoLoaded(true) // Proceed anyway to avoid blocking user
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return

      // Fetch student profile
      const { data: profileData } = await supabase
        .from('users')
        .select('full_name, student_code')
        .eq('id', studentId)
        .maybeSingle()

      if (profileData) setStudentProfile(profileData)

      // Fetch attendance
      const { data: records, error } = await supabase
        .from('attendance')
        .select(`
          id, date, check_in, check_out, hours_worked,
          daily_logs ( log_text )
        `)
        .eq('user_id', studentId)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching logs for print:', error)
      } else {
        setData(records || [])
      }

      // Fetch company name and placement dates from internship_placements
      try {
        const { data: placementData } = await supabase
          .from('internship_placements')
          .select('company_name, start_date, end_date')
          .eq('student_id', studentId)
          .maybeSingle()

        if (placementData) {
          setPlacement(placementData)
        }
      } catch (err) {
        console.error('Error fetching placement:', err)
      }

      setLoading(false)
    }

    fetchData()
  }, [studentId])

  // Trigger print dialog only when data is fetched and image has loaded
  useEffect(() => {
    if (!loading && logoLoaded) {
      const timer = setTimeout(() => {
        window.print()
      }, 1000) // 1 second safety delay for rendering
      return () => clearTimeout(timer)
    }
  }, [loading, logoLoaded])

  if (loading) {
    return <div className="p-10 text-center font-sarabun text-lg">กำลังโหลดข้อมูล...</div>
  }

  const PAGE_SIZE = 20
  const pages = []
  for (let i = 0; i < data.length; i += PAGE_SIZE) {
    pages.push(data.slice(i, i + PAGE_SIZE))
  }

  if (pages.length === 0) {
    pages.push([])
  }

  return (
    <div className="bg-white text-black min-h-screen text-sm print-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
        
        * { box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body { background: white; margin: 0; padding: 0; color: black; font-family: 'Sarabun', sans-serif; line-height: 1.4; }
        @media print {
          .print-container { background: white; }
          .page-break { page-break-after: always; }
          nav, sidebar, .navbar, .sidebar { display: none !important; }
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; word-break: break-word; }
        th { font-weight: 600; font-size: 13px; }
        td { font-size: 13px; }
        .text-left { text-align: left; }
        .dotted-line { display: inline-block; border-bottom: 1px dotted black; }
      `}</style>

      {pages.map((pageData, pageIndex) => {
        const pageHours = pageData.reduce((sum, row) => sum + parseFloat(row.hours_worked || 0), 0)
        const firstValidRow = pageData.find(row => row && row.date)
        const dateToUse = firstValidRow?.date || new Date().toISOString()
        const { semester, year } = getSemesterAndYear(dateToUse)
        
        // Calculate Month Index and Total Months based on placement dates or defaults
        const startDate = placement?.start_date || '2026-06-22'
        const endDate = placement?.end_date || '2027-03-14'
        const totalMonths = getPlacementMonths(startDate, endDate)
        const currentMonthNum = getMonthNumber(dateToUse, startDate)

        return (
          <div key={pageIndex} className={`pt-4 px-1 ${pageIndex < pages.length - 1 ? 'page-break' : ''}`}>
            
            {/* Header section matching the PDF exactly */}
            <div className="relative mb-4">
              <div className="absolute right-0 top-0 font-bold text-base">DG-B2</div>
              
              {/* CAMT Logo */}
              <div className="flex flex-col items-center justify-center mb-2">
                <img src="/camt-logo.png" alt="CAMT Logo" className="h-12 object-contain" />
              </div>

              <div className="text-center mt-3">
                <div className="text-[15px] mb-0.5">แบบฟอร์มบันทึกเวลาการเรียนรู้ร่วมกับการทำงานของนักศึกษา (WIL-DG)</div>
                <div className="text-[15px]">สาขาวิชาดิจิทัลเกม วิทยาลัยศิลปะ สื่อ และเทคโนโลยี มหาวิทยาลัยเชียงใหม่</div>
              </div>
            </div>

            {/* Input fields matching the PDF exactly */}
            <div className="flex flex-col gap-2 mb-3 text-[14px]">
              <div className="flex items-center w-full">
                <span className="whitespace-nowrap mr-2">ชื่อ-สกุล</span>
                <span className="dotted-line flex-[3] text-center mr-6">{studentProfile?.full_name || ''}</span>
                <span className="whitespace-nowrap mr-2">รหัสนักศึกษา</span>
                <span className="dotted-line flex-[1.5] text-center">{studentProfile?.student_code || ''}</span>
              </div>
              <div className="flex items-center w-full">
                <span className="whitespace-nowrap mr-2">ภาคการศึกษา.</span>
                <span className="dotted-line w-12 text-center">{semester}</span>
                <span className="mx-1">/</span>
                <span className="dotted-line w-12 text-center">{year}</span>
                <span className="whitespace-nowrap ml-6 mr-2">บริษัท</span>
                <span className="dotted-line flex-1 text-center mr-6">{placement?.company_name || ''}</span>
                <span className="whitespace-nowrap mr-2">หน้า</span>
                <span className="dotted-line w-10 text-center">{currentMonthNum}</span>
                <span className="mx-1">/</span>
                <span className="dotted-line w-10 text-center">{totalMonths}</span>
              </div>
            </div>

            {/* Table exactly like PDF */}
            <table>
              <thead>
                <tr className="h-9">
                  <th className="w-[6%]">No.</th>
                  <th className="w-[15%]">วัน/เดือน/ปี</th>
                  <th className="w-[15%]">เวลาเข้างาน</th>
                  <th className="w-[15%]">เวลาเลิกงาน</th>
                  <th className="w-[17%]">จำนวนชั่วโมง (ชม)</th>
                  <th className="w-[32%]">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PAGE_SIZE }).map((_, idx) => {
                  const row = pageData[idx]
                  const rowNum = idx + 1
                  if (!row) {
                    return (
                      <tr key={`blank-${idx}`} className="h-[25px]">
                        <td>{rowNum}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    )
                  }
                  
                  const logText = row.daily_logs && row.daily_logs.length > 0 
                                  ? row.daily_logs[0].log_text 
                                  : ''

                  return (
                    <tr key={row.id} className="h-[25px]">
                      <td>{rowNum}</td>
                      <td>{formatThaiDateShort(row.date)}</td>
                      <td>{formatThaiTime(row.check_in)}</td>
                      <td>{formatThaiTime(row.check_out)}</td>
                      <td>{row.hours_worked || '-'}</td>
                      <td className="text-left text-xs px-2 truncate max-w-[200px]">{logText}</td>
                    </tr>
                  )
                })}
                {/* Total Hours Row */}
                <tr className="h-[28px] font-bold">
                  <td colSpan={4} className="text-center">รวมชั่วโมงหน้านี้</td>
                  <td>{pageHours > 0 ? pageHours.toFixed(1) : ''}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {/* Footer exactly like PDF */}
            <div className="mt-5 flex justify-between items-end">
              <div className="text-[14px]">
                หมายเหตุ : แนบเอกสารนี้ในรายงานตอนสิ้นเทอม
              </div>
              <div className="w-64 text-center text-[14px]">
                <div className="dotted-line w-full mb-1"></div>
                <div className="mb-1">ลงชื่อ ผู้ดูแลนักศึกษา / พี่เลี้ยง</div>
                <div>วันที่............./.................../.................</div>
              </div>
            </div>
            
          </div>
        )
      })}
    </div>
  )
}
