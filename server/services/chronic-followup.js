// Dates civiles, sans dÃ©calage de fuseau et sans intervalle clinique imposÃ©.
export function validFollowupDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (!Number.isFinite(Date.parse(value + 'T00:00:00Z'))) return false;
  return value >= '1900-01-01' && value <= '9999-12-31' && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
export function followupStatus(date, today = new Date().toISOString().slice(0, 10)) {
  if (!date) return { followupStatus: 'unscheduled', daysUntilFollowup: null };
  const days = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
  return { followupStatus: days < 0 ? 'overdue' : days <= 7 ? 'due_soon' : 'scheduled', daysUntilFollowup: days };
}
