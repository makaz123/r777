/**
 * Provider match times use US order: "M/D/YYYY h:mm:ss AM/PM".
 */
export function parseApiMatchDate(dateString) {
  if (dateString == null || dateString === '') return null;

  const raw = String(dateString).trim();
  const parts = raw.split(/\s+/);

  if (parts.length >= 3) {
    const [datePart, timePart, ampm] = parts;
    const dateSplit = datePart.split('/');
    const timeSplit = timePart.split(':');

    if (dateSplit.length === 3 && timeSplit.length >= 2) {
      const [month, day, year] = dateSplit;
      let hr = parseInt(timeSplit[0], 10);
      const minutes = parseInt(timeSplit[1], 10) || 0;
      const seconds = parseInt(timeSplit[2], 10) || 0;
      if (/pm/i.test(ampm) && hr < 12) hr += 12;
      if (/am/i.test(ampm) && hr === 12) hr = 0;
      const d = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        hr,
        minutes,
        seconds
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
