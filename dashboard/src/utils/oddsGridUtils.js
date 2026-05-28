/** Grid slots: back3, back2, back1, lay1, lay2, lay3 */
const ONAME_TO_GRID_INDEX = {
  back3: 0,
  back2: 1,
  back1: 2,
  lay1: 3,
  lay2: 4,
  lay3: 5,
};

export const ODD_GRID_CLASSES = [
  'hidden bg-[#d7e8f4] md:block',
  'hidden bg-[#b7d5eb] md:block',
  'bg-[#72bbef]',
  'bg-[#faa9ba]',
  'hidden bg-[#efd3d9] md:block',
  'hidden bg-[#f6e6ea] md:block',
];

/**
 * Maps an odd to its fixed column (0–5) regardless of API array order.
 */
export function getOddGridIndex(odd) {
  if (!odd) return -1;

  const oname = odd.oname?.toLowerCase();
  if (oname && ONAME_TO_GRID_INDEX[oname] !== undefined) {
    return ONAME_TO_GRID_INDEX[oname];
  }

  const tno = Math.min(Math.max(Number(odd.tno) || 0, 0), 2);

  if (odd.otype === 'back') {
    return 2 - tno;
  }
  if (odd.otype === 'lay') {
    return 3 + tno;
  }

  return -1;
}

/** Returns length-6 array with odds placed in correct columns; empty slots are null. */
export function buildOddGridSlots(odds = []) {
  const slots = Array(6).fill(null);

  if (!Array.isArray(odds)) return slots;

  for (const odd of odds) {
    const index = getOddGridIndex(odd);
    if (index >= 0 && index < 6) {
      slots[index] = odd;
    }
  }

  return slots;
}
