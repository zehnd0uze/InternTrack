import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export function useTimeAlerts(today, profile) {
  const alertedDateRef = useRef(null);

  useEffect(() => {
    // Request permission if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      // Format as YYYY-MM-DD for local timezone
      const dateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const h = now.getHours();
      const m = now.getMinutes();

      // Reset local flags on a new day to ensure alerts can fire again the next day
      if (alertedDateRef.current !== dateStr) {
        const lastCheckInAlert = localStorage.getItem('alertedCheckInDate');
        const lastCheckOutAlert = localStorage.getItem('alertedCheckOutDate');
        const lastGoodMorningAlert = localStorage.getItem('alertedGoodMorningDate3');
        if (lastCheckInAlert !== dateStr) localStorage.removeItem('alertedCheckInDate');
        if (lastCheckOutAlert !== dateStr) localStorage.removeItem('alertedCheckOutDate');
        if (lastGoodMorningAlert !== dateStr) localStorage.removeItem('alertedGoodMorningDate3');
        alertedDateRef.current = dateStr;
      }

      const hasAlertedCheckIn = localStorage.getItem('alertedCheckInDate') === dateStr;
      const hasAlertedCheckOut = localStorage.getItem('alertedCheckOutDate') === dateStr;

      // Morning alert: 10 minutes before work_start_time (default 08:00)
      let startH = 8, startM = 0;
      if (profile?.work_start_time) {
        [startH, startM] = profile.work_start_time.split(':').map(Number);
      }
      
      const startAlertTime = new Date(now);
      startAlertTime.setHours(startH, startM, 0, 0);
      startAlertTime.setMinutes(startAlertTime.getMinutes() - 10); // 10 mins before
      const startEndWindow = new Date(startAlertTime);
      startEndWindow.setMinutes(startEndWindow.getMinutes() + 40); // 40 min window

      if (now >= startAlertTime && now <= startEndWindow && !today?.check_in && !hasAlertedCheckIn) {
        localStorage.setItem('alertedCheckInDate', dateStr);
        const timeStr = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`;
        sendNotification('แจ้งเตือนเข้างาน', `ใกล้ถึงเวลาเข้างานแล้ว (${timeStr}) อย่าลืมกดเช็คอินนะ!`);
      }

      // Afternoon alert: 10 minutes before work_end_time (default 17:00)
      let endH = 17, endM = 0;
      if (profile?.work_end_time) {
        [endH, endM] = profile.work_end_time.split(':').map(Number);
      }

      const endAlertTime = new Date(now);
      endAlertTime.setHours(endH, endM, 0, 0);
      endAlertTime.setMinutes(endAlertTime.getMinutes() - 10);
      const endEndWindow = new Date(endAlertTime);
      endEndWindow.setMinutes(endEndWindow.getMinutes() + 40);

      if (now >= endAlertTime && now <= endEndWindow && today?.check_in && !today?.check_out && !hasAlertedCheckOut) {
        localStorage.setItem('alertedCheckOutDate', dateStr);
        const timeStr = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
        sendNotification('แจ้งเตือนเลิกงาน', `ใกล้ถึงเวลาเลิกงานแล้ว (${timeStr}) อย่าลืมกดเช็คเอาท์นะ!`);
      }

      // Test 9:25 AM alert (between 09:24 and 09:28)
      const hasAlertedGoodMorning = localStorage.getItem('alertedGoodMorningDate3') === dateStr;
      const isGoodMorningTime = (h === 9 && m >= 24 && m <= 28);
      if (isGoodMorningTime && !hasAlertedGoodMorning) {
        localStorage.setItem('alertedGoodMorningDate3', dateStr);
        sendNotification('อรุณสวัสดิ์', 'GOod morning everyone have a nice day');
      }
    };

    const sendNotification = (title, body) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.svg'
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } else {
        // Fallback to in-app toast if permission not granted or denied
        toast(`${title}: ${body}`, { icon: '🔔', duration: 8000 });
      }
    };

    // Check immediately upon mount or today state change
    checkTime();
    
    // Then check every 1 minute
    const interval = setInterval(checkTime, 60000);

    return () => clearInterval(interval);
  }, [today, profile]);
}
