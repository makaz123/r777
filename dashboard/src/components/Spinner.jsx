/** Simple inline loader — safe for pages (no auto-navigation). */
const Spinner = () => (
  <div className='mx-auto flex h-[116px] w-[185px] items-center justify-center overflow-hidden rounded-[20px] bg-white'>
    <div className='h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#14805e]' />
  </div>
);

export default Spinner;
