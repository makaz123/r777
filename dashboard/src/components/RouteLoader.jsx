/** Full-screen loader for auth route guards only (no navigation side effects). */
const RouteLoader = () => (
  <div className='flex h-screen w-full items-center justify-center bg-white'>
    <div className='h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#14805e]' />
  </div>
);

export default RouteLoader;
