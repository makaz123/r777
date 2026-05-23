import { ODD_GRID_CLASSES, buildOddGridSlots } from '../utils/oddsGridUtils';

const OddsGridCells = ({ odds }) => {
  const slots = buildOddGridSlots(odds);

  return slots.map((odd, i) => (
    <div
      key={i}
      className={`col-span-1 m-0.5 min-h-[36px] px-[3px] py-0.5 ${ODD_GRID_CLASSES[i]}`}
    >
      {odd ? (
        <>
          <div className='text-[14px] leading-[18px] font-bold'>{odd.odds}</div>
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
