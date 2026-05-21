import { describe, expect, test } from 'vitest';

import { getCurrentDashboardWeekRange } from '../utils/dashboardWeekRange.js';

describe('dashboardWeekRange', () => {
  test('week is Monday 00:00 through Sunday 23:59', () => {
    // Wednesday 2025-05-14
    const wed = new Date('2025-05-14T15:30:00');
    const { startDate, endDate, weekKey } = getCurrentDashboardWeekRange(wed);

    expect(weekKey).toBe('2025-05-12');
    expect(new Date(startDate).getDay()).toBe(1); // Monday
    expect(new Date(endDate).getDay()).toBe(0); // Sunday
    expect(new Date(endDate).getHours()).toBe(23);
    expect(new Date(endDate).getMinutes()).toBe(59);
  });

  test('new week after Sunday 11:59 PM (Monday)', () => {
    const mon = new Date('2025-05-19T00:05:00');
    const { weekKey } = getCurrentDashboardWeekRange(mon);
    expect(weekKey).toBe('2025-05-19');
  });
});
