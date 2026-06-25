import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Check, X, Calendar, User, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmModal from '../../components/ui/ConfirmModal'

const TYPE_LABEL = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
}

const STATUS_BADGE = {
  pending:  <span className="badge badge-warning">รอการอนุมัติ</span>,
  approved: <span className="badge badge-success">อนุมัติแล้ว</span>,
  rejected: <span className="badge badge-danger">ถูกปฏิเสธ</span>,
}

export default function MentorLeaveApprovals() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState(null)
  const [actionType, setActionType] = useState('') // 'approve' or 'reject'

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, users(full_name, student_code)')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setRequests(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async () => {
    if (!selectedReq) return
    setModalOpen(false)
    const status = actionType === 'approve' ? 'approved' : 'rejected'

    const { error } = await supabase
      .from('leave_requests')
      .update({ status })
      .eq('id', selectedReq.id)

    if (error) {
      toast.error('อัปเดตล้มเหลว')
      console.error(error)
    } else {
      toast.success(actionType === 'approve' ? 'อนุมัติคำขอลาแล้ว' : 'ปฏิเสธคำขอลาแล้ว')
      
      // Notify student
      await supabase.from('notifications').insert({
        user_id: selectedReq.user_id,
        message: `คำขอ${TYPE_LABEL[selectedReq.leave_type]} ของคุณถูก${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}แล้ว`,
        type: 'leave_response',
      })
      
      fetchRequests()
    }
  }

  const openModal = (req, type) => {
    setSelectedReq(req)
    setActionType(type)
    setModalOpen(true)
  }

  const filtered = requests.filter(req => {
    const sName = req.users?.full_name?.toLowerCase() || ''
    const sCode = req.users?.student_code?.toLowerCase() || ''
    const matchSearch = sName.includes(searchTerm.toLowerCase()) || sCode.includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || req.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">อนุมัติการลา</h1>
        <p className="text-sm text-gray-500 mt-0.5">จัดการคำขอลาป่วยและลากิจของนักศึกษาในความดูแล</p>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รหัสนักศึกษา..." 
              className="input pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input sm:w-48"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="pending">รอการอนุมัติ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธแล้ว</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-600">ไม่มีคำขอลาที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>นักศึกษา</th>
                  <th>ประเภท</th>
                  <th>ช่วงวันที่ลา</th>
                  <th>เหตุผล</th>
                  <th>สถานะ</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold shrink-0">
                          {req.users?.full_name?.charAt(0) || <User size={16} />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{req.users?.full_name}</p>
                          <p className="text-xs text-gray-500">{req.users?.student_code || 'ไม่มีรหัส'}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-medium text-gray-700">{TYPE_LABEL[req.leave_type]}</span></td>
                    <td className="text-sm">
                      {req.start_date === req.end_date 
                        ? format(new Date(req.start_date), 'd MMM yyyy', { locale: th })
                        : `${format(new Date(req.start_date), 'd MMM', { locale: th })} - ${format(new Date(req.end_date), 'd MMM yyyy', { locale: th })}`
                      }
                    </td>
                    <td className="text-sm text-gray-600 max-w-[200px] truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td>{STATUS_BADGE[req.status]}</td>
                    <td className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openModal(req, 'approve')}
                            className="btn-success btn-sm px-2"
                            title="อนุมัติ"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => openModal(req, 'reject')}
                            className="btn-danger btn-sm px-2"
                            title="ปฏิเสธ"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && selectedReq && (
        <ConfirmModal 
          title={actionType === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการปฏิเสธ'}
          message={`คุณต้องการ${actionType === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอ${TYPE_LABEL[selectedReq.leave_type]} ของ ${selectedReq.users?.full_name} ใช่หรือไม่?`}
          confirmLabel={actionType === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
          confirmClass={actionType === 'approve' ? 'btn-success' : 'btn-danger'}
          onConfirm={handleAction}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
