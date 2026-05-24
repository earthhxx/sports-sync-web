import { api } from '@/lib/axios';

export const calendarService = {
  // Retrieve authorized calendar events with optional query filters
  async getEvents(filters?: { startDate?: string; endDate?: string; sports?: string; page?: number; limit?: number }, config?: any) {
    const response = await api.get('/calendar', { params: filters, ...config });
    return response.data;
  },

  // Retrieve active sport categories dynamically from database for filters
  async getSports() {
    const response = await api.get('/calendar/sports');
    return response.data;
  },

  // Export schedule as plain text; returns the TXT string
  async exportSchedule(params: URLSearchParams): Promise<string> {
    const response = await api.get(`/calendar/export?${params.toString()}`, {
      responseType: 'text',
    });
    // axios may auto-parse JSON even with responseType:'text' on some configs,
    // so normalise to string
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data, null, 2);
  },
};
