import { useState } from 'react';
import Cricket from './Cricket';
import Football from './Football';
import Tennis from './Tennis';
import sportsIcon from '../../assets/sports-icons.png';

function InplayBadge({ count }) {
  return (
    <span className='absolute top-3 right-6 grid h-[16px] min-w-[16px] justify-items-center rounded-[3px] bg-red-600 px-1 py-0.5 text-[10px] leading-[11px] text-white'>
      {count}
    </span>
  );
}

export default function Inplay() {
  const [activeTab, setActiveTab] = useState('all');
  const [cricketCount, setCricketCount] = useState(0);
  const [soccerCount, setSoccerCount] = useState(0);
  const [tennisCount, setTennisCount] = useState(0);

  return (
    <div className='flex gap-px'>
      <div className='ml-0 w-full md:ml-1 lg:flex-1'>
        <div className='h-[28px] bg-[#18adc5] px-[7px] py-1.5 text-[14px] font-bold text-white'>
          In-Play
        </div>
        <div className='scrollbar-hide flex overflow-x-scroll bg-white px-[5px] pt-[5px]'>
          <div
            className='grid justify-items-center px-2.5 md:px-[17px]'
            onClick={() => setActiveTab('all')}
          >
            <span
              className='transition-all duration-500 hover:transform-[scale(1.1)]'
              style={{
                backgroundImage: `url(${sportsIcon})`,
                backgroundPosition: '0px -915px',
                backgroundSize: '55px auto',
                width: '57px',
                height: '47px',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className='block text-[14px] leading-[26px] font-bold'>
              All Games
            </span>
          </div>
          <div
            className='relative grid justify-items-center px-2.5 md:px-[17px]'
            onClick={() => setActiveTab('cricket')}
          >
            <span
              className='transition-all duration-500 hover:transform-[scale(1.1)]'
              style={{
                backgroundImage: `url(${sportsIcon})`,
                backgroundPosition: '0px -642px',
                backgroundSize: '55px auto',
                width: '57px',
                height: '47px',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className='block text-[14px] leading-[26px] font-bold'>
              Cricket
            </span>
            <InplayBadge count={cricketCount} />
          </div>
          <div
            className='relative grid justify-items-center px-2.5 md:px-[17px]'
            onClick={() => setActiveTab('soccer')}
          >
            <span
              className='transition-all duration-500 hover:transform-[scale(1.1)]'
              style={{
                backgroundImage: `url(${sportsIcon})`,
                backgroundPosition: '0px -2017px',
                backgroundSize: '55px auto',
                width: '57px',
                height: '47px',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className='block text-[14px] leading-[26px] font-bold'>
              Soccer
            </span>
            <InplayBadge count={soccerCount} />
          </div>
          <div
            className='relative grid justify-items-center px-2.5 md:px-[17px]'
            onClick={() => setActiveTab('tennis')}
          >
            <span
              className='transition-all duration-500 hover:transform-[scale(1.1)]'
              style={{
                backgroundImage: `url(${sportsIcon})`,
                backgroundPosition: '0px -2155px',
                backgroundSize: '55px auto',
                width: '57px',
                height: '47px',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className='block text-[14px] leading-[26px] font-bold'>
              Tennis
            </span>
            <InplayBadge count={tennisCount} />
          </div>
        </div>

        <div className='-mt-2'>
          {(activeTab === 'all' || activeTab === 'cricket') && (
            <Cricket
              viewMorePath='/cricket'
              showBanner={false}
              showOnlyInplay={true}
              onInplayCountChange={setCricketCount}
            />
          )}

          {(activeTab === 'all' || activeTab === 'soccer') && (
            <Football
              viewMorePath='/football'
              showBanner={false}
              showOnlyInplay={true}
              onInplayCountChange={setSoccerCount}
            />
          )}

          {(activeTab === 'all' || activeTab === 'tennis') && (
            <Tennis
              viewMorePath='/tennis'
              showBanner={false}
              showOnlyInplay={true}
              onInplayCountChange={setTennisCount}
            />
          )}
        </div>
      </div>
      <div className='sticky top-0 hidden h-fit lg:block'>
        <div className='w-[350px] text-[14px]'>
          <div className='h-[23px] bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-1 text-white'>
            Matched Bet
          </div>

          <table className='w-full'>
            <thead>
              <tr className='bg-[#028dad] text-left text-white'>
                <th className='border border-white px-[3px] py-[1px]'>
                  Matched Bet
                </th>
                <th className='border border-white px-[3px] py-[1px]'>Odds</th>
                <th className='border border-white px-[3px] py-[1px]'>Stake</th>
              </tr>
            </thead>
          </table>
        </div>
      </div>
    </div>
  );
}
