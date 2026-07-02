import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export function useTimeAlerts(today) {
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
        const lastGoodMorningAlert = localStorage.getItem('alertedGoodMorningDate2');
        if (lastCheckInAlert !== dateStr) localStorage.removeItem('alertedCheckInDate');
        if (lastCheckOutAlert !== dateStr) localStorage.removeItem('alertedCheckOutDate');
        if (lastGoodMorningAlert !== dateStr) localStorage.removeItem('alertedGoodMorningDate2');
        alertedDateRef.current = dateStr;
      }

      const hasAlertedCheckIn = localStorage.getItem('alertedCheckInDate') === dateStr;
      const hasAlertedCheckOut = localStorage.getItem('alertedCheckOutDate') === dateStr;

      // Morning alert: Between 07:50 and 08:30
      const isMorningAlertTime = (h === 7 && m >= 50) || (h === 8 && m < 30);
      if (isMorningAlertTime && !today?.check_in && !hasAlertedCheckIn) {
        localStorage.setItem('alertedCheckInDate', dateStr);
        sendNotification('แจ้งเตือนเข้างาน', 'ใกล้ถึงเวลาเข้างานแล้ว (08:00) อย่าลืมกดเช็คอินนะ!');
      }

      // Afternoon alert: Between 15:50 and 16:30
      const isAfternoonAlertTime = (h === 15 && m >= 50) || (h === 16 && m < 30);
      if (isAfternoonAlertTime && today?.check_in && !today?.check_out && !hasAlertedCheckOut) {
        localStorage.setItem('alertedCheckOutDate', dateStr);
        sendNotification('แจ้งเตือนเลิกงาน', 'ใกล้ถึงเวลาเลิกงานแล้ว (16:00) อย่าลืมกดเช็คเอาท์นะ!');
      }

      // Test 9:12 AM alert (between 09:11 and 09:15)
      const hasAlertedGoodMorning = localStorage.getItem('alertedGoodMorningDate2') === dateStr;
      const isGoodMorningTime = (h === 9 && m >= 11 && m <= 15);
      if (isGoodMorningTime && !hasAlertedGoodMorning) {
        localStorage.setItem('alertedGoodMorningDate2', dateStr);
        sendNotification('อรุณสวัสดิ์', 'Good morning student, have a nice day!');
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
  }, [today]);
}
