import { useState, useRef, useEffect } from 'react';
import { ODD_GRID_CLASSES, buildOddGridSlots } from '../utils/oddsGridUtils';

const OddsGridCells = ({ odds }) => {
  const slots = buildOddGridSlots(odds);

  const [highlightedCells, setHighlightedCells] = useState({});
  const previousCellsRef = useRef({});
  const highlightTimeoutsRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(highlightTimeoutsRef.current).forEach((timeoutId) =>
        clearTimeout(timeoutId)
      );
    };
  }, []);

  const slotsSignature = JSON.stringify(
    slots.map((odd) => (odd ? `${odd.odds ?? ''}|${odd.size ?? ''}` : 'empty'))
  );

  useEffect(() => {
    if (!slots || slots.length === 0) return;

    const nextCells = {};

    slots.forEach((odd, i) => {
      const cellKey = `odd-${i}`;
      const signature = odd ? `${odd.odds ?? ''}|${odd.size ?? ''}` : 'empty';
      nextCells[cellKey] = signature;
    });

    const previousCells = previousCellsRef.current;
    Object.entries(nextCells).forEach(([cellKey, signature]) => {
      if (previousCells[cellKey] && previousCells[cellKey] !== signature) {
        setHighlightedCells((prev) => ({ ...prev, [cellKey]: true }));

        if (highlightTimeoutsRef.current[cellKey]) {
          clearTimeout(highlightTimeoutsRef.current[cellKey]);
        }

        highlightTimeoutsRef.current[cellKey] = setTimeout(() => {
          setHighlightedCells((prev) => {
            const updated = { ...prev };
            delete updated[cellKey];
            return updated;
          });
          delete highlightTimeoutsRef.current[cellKey];
        }, 1000);
      }
    });

    previousCellsRef.current = nextCells;
  }, [slotsSignature]);

  return slots.map((odd, i) => (
    <div
      key={i}
      className={`m-0.5 min-h-[36px] w-1/2 px-[3px] py-0.5 transition-colors duration-300 md:w-1/3 ${ODD_GRID_CLASSES[i]}`}
      style={{ backgroundColor: highlightedCells[`odd-${i}`] ? '#fde047' : undefined }}
    >
      {odd ? (
        <>
          <div className='text-[12px] leading-[18px] font-bold md:text-[14px]'>
            {odd.odds}
          </div>
          <div className='text-[10px] text-[#43444a]'>
            {Number(odd.size).toFixed(2)}
          </div>
        </>
      ) : (
        <span>-</span>
      )}
    </div>
  ));
};

export default OddsGridCells;
