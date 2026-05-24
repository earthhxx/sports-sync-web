import { api } from '@/lib/axios';

export const calendarService = {
  // Retrieve authorized calendar events
  async getEvents() {
    const response = await api.get('/calendar');
    return response.data;
  },

  // Trigger calendar synchronization
  async syncCalendar() {
    const response = await api.post('/calendar/sync');
    return response.data;
  },
};
