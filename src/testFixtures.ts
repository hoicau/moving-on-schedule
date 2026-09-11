import { DEFAULT_SETTINGS } from './schedule';

// Explicit clock times for tests; new user timetables start with blank times.
export const TIMED_SETTINGS = {
  ...DEFAULT_SETTINGS,
  periods: [
    ['08:00', '08:45'],
    ['08:55', '09:40'],
    ['10:00', '10:45'],
    ['10:55', '11:40'],
    ['14:00', '14:45'],
    ['14:55', '15:40'],
    ['16:00', '16:45'],
    ['16:55', '17:40'],
    ['19:00', '19:45'],
    ['19:55', '20:40'],
    ['20:50', '21:35'],
    ['21:45', '22:30'],
  ].map(([start, end]) => ({ start, end })),
};
