const toLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Dashboard reporting week: Monday 00:00:00 → Sunday 23:59:59 (11:59 PM).
 * Rolls over after Sunday 11:59 PM (new week starts Monday 00:00).
 */
export const getCurrentDashboardWeekRange = (now = new Date()) => {
  const current = new Date(now);
  const day = current.getDay(); // 0 = Sunday
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    weekKey: toLocalDateKey(weekStart),
  };
};
