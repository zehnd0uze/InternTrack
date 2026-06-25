import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function formatThaiTime(dt) {
  if (!dt) return '-'
  return format(new Date(dt), 'HH:mm', { locale: th }) 
}

function formatThaiDateShort(dt) {
  if (!dt) return '-'
  return format(new Date(dt), 'dd/MM/yy', { locale: th })
}

export default function PrintableLog() {
  const { user, profile } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      const { data: records, error } = await supabase
        .from('attendance')
        .select(`
          id, date, check_in, check_out, hours_worked,
          daily_logs ( log_text )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching logs for print:', error)
      } else {
        setData(records || [])
      }
      setLoading(false)

      setTimeout(() => {
        window.print()
      }, 500)
    }

    fetchData()
  }, [user])

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
        
        @page { size: A4; margin: 15mm; }
        body { background: white; margin: 0; padding: 0; color: black; font-family: 'Sarabun', sans-serif; line-height: 1.5; }
        @media print {
          .print-container { background: white; }
          .page-break { page-break-after: always; }
          nav, sidebar, .navbar, .sidebar { display: none !important; }
        }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid black; padding: 4px 8px; text-align: center; vertical-align: middle; }
        th { font-weight: normal; font-size: 14px; }
        td { font-size: 14px; }
        .text-left { text-align: left; }
        .dotted-line { display: inline-block; border-bottom: 1px dotted black; }
      `}</style>

      {pages.map((pageData, pageIndex) => {
        const pageHours = pageData.reduce((sum, row) => sum + parseFloat(row.hours_worked || 0), 0)

        return (
          <div key={pageIndex} className={`pt-4 ${pageIndex < pages.length - 1 ? 'page-break' : ''}`}>
            
            {/* Header section matching the PDF exactly */}
            <div className="relative mb-6">
              <div className="absolute right-0 top-0 font-bold text-base">DG-B2</div>
              
              {/* CAMT Logo placeholder */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="w-12 h-10 border-[3px] border-gray-800 flex flex-col justify-between p-1 mb-1 relative overflow-hidden">
                   <div className="w-4 h-4 bg-gray-800 absolute top-[-5px] right-[-5px] transform rotate-45"></div>
                   <div className="w-4 h-4 bg-gray-800 absolute bottom-[-5px] left-[-5px] transform rotate-45"></div>
                </div>
                <div className="font-bold text-xl tracking-wider uppercase leading-none">CAMT</div>
                <div className="text-[7px] uppercase tracking-[0.2em] mt-1">Creative Digital Innovation</div>
              </div>

              <div className="text-center mt-6">
                <div className="text-[16px] mb-1">แบบฟอร์มบันทึกเวลาการเรียนรู้ร่วมกับการทำงานของนักศึกษา (WIL-DG)</div>
                <div className="text-[16px]">สาขาวิชาดิจิทัลเกม วิทยาลัยศิลปะ สื่อ และเทคโนโลยี มหาวิทยาลัยเชียงใหม่</div>
              </div>
            </div>

            {/* Input fields matching the PDF exactly */}
            <div className="flex flex-col gap-3 mb-4 text-[15px] px-8">
              <div className="flex items-center">
                <span className="whitespace-nowrap mr-2">ชื่อ-สกุล</span>
                <span className="dotted-line flex-1 text-center">{profile?.full_name || ''}</span>
                <span className="whitespace-nowrap ml-4 mr-2">รหัสนักศึกษา</span>
                <span className="dotted-line w-48 text-center">{profile?.student_code || ''}</span>
              </div>
              <div className="flex items-center">
                <span className="whitespace-nowrap mr-2">ภาคการศึกษา.</span>
                <span className="dotted-line w-16"></span>
                <span className="mx-2">/</span>
                <span className="dotted-line w-16"></span>
                <span className="whitespace-nowrap ml-6 mr-2">บริษัท</span>
                <span className="dotted-line flex-1"></span>
                <span className="whitespace-nowrap ml-6 mr-2">หน้า</span>
                <span className="dotted-line w-8 text-center">{pageIndex + 1}</span>
                <span className="mx-2">/</span>
                <span className="dotted-line w-8 text-center">{pages.length}</span>
              </div>
            </div>

            {/* Table exactly like PDF */}
            <table>
              <thead>
                <tr className="h-10">
                  <th className="w-12">No.</th>
                  <th className="w-[12%]">วัน/เดือน/ปี</th>
                  <th className="w-[12%]">เวลาเข้างาน</th>
                  <th className="w-[12%]">เวลาเลิกงาน</th>
                  <th className="w-[18%]">จำนวนชั่วโมง (ชม)</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PAGE_SIZE }).map((_, idx) => {
                  const row = pageData[idx]
                  const globalIdx = pageIndex * PAGE_SIZE + idx + 1
                  if (!row) {
                    return (
                      <tr key={`blank-${idx}`} className="h-[28px]">
                        <td>{globalIdx}</td>
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
                    <tr key={row.id} className="h-[28px]">
                      <td>{globalIdx}</td>
                      <td>{formatThaiDateShort(row.date)}</td>
                      <td>{formatThaiTime(row.check_in)}</td>
                      <td>{formatThaiTime(row.check_out)}</td>
                      <td>{row.hours_worked || '-'}</td>
                      <td className="text-left text-xs px-2 truncate max-w-[200px]">{logText}</td>
                    </tr>
                  )
                })}
                {/* Total Hours Row */}
                <tr className="h-[32px]">
                  <td colSpan={4} className="text-center">รวมชั่วโมงหน้านี้</td>
                  <td>{pageHours > 0 ? pageHours.toFixed(1) : ''}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {/* Footer exactly like PDF */}
            <div className="mt-12 flex justify-between items-end px-4">
              <div className="text-[15px]">
                หมายเหตุ : แนบเอกสารนี้ในรายงานตอนสิ้นเทอม
              </div>
              <div className="w-64 text-center text-[15px]">
                <div className="dotted-line w-full mb-2"></div>
                <div className="mb-2">ลงชื่อ ผู้ดูแลนักศึกษา / พี่เลี้ยง</div>
                <div>วันที่............./.................../.................</div>
              </div>
            </div>
            
          </div>
        )
      })}
    </div>
  )
}
