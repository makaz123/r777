import pg from '../../components/api_json/pg.json';
import bigTimeGaming from '../../components/api_json/BigTimeGaming.json';
import cq9 from '../../components/api_json/CQ9.json';
import evolution from '../../components/api_json/Evolution.json';
import ezugi from '../../components/api_json/EZUGI.json';
import habanero from '../../components/api_json/Habanero.json';
import inOut from '../../components/api_json/inout.json';
import jdb from '../../components/api_json/jdb.json';
import jili from '../../components/api_json/jili.json';
import km from '../../components/api_json/km.json';
import microgaming from '../../components/api_json/Microgaming.json';
import nolimit from '../../components/api_json/nolimit.json';
import onegame from '../../components/api_json/onegame.json';
import playtech from '../../components/api_json/playtech.json';
import pragmaticplay from '../../components/api_json/pp.json';
import redtiger from '../../components/api_json/redTiger.json';
import relax from '../../components/api_json/relax.json';
import smartsoft from '../../components/api_json/smartsoft.json';
import spribe from '../../components/api_json/spribe.json';

export const casinoData = {
  providers: {
    pgsoft: pg,
    bigtimegaming: bigTimeGaming,
    cq9,
    evolution,
    ezugi,
    habanero,
    inout: inOut,
    jdb,
    jili,
    km,
    microgaming,
    nolimit,
    onegame,
    playtech,
    pragmaticplay,
    redtiger,
    relax,
    smartsoft,
    spribe,
  },
};

export const providerList = [
  { key: 'indianpoker', label: 'Indian Poker', path: '/indianpoker' },
  { key: 'indianpoker2', label: 'Indian Poker2', path: '/indianpoker2' },
  { key: 'rvgames', label: 'R V Games', path: '/rvgames' },
  { key: 'spribe', label: 'Aviator', path: '/spribe' },
  { key: 'inout', label: 'Chicken Road', path: '/inout' },
  { key: 'ezugi', label: 'Ezugi', path: '/ezugi' },
  { key: 'evolution', label: 'Evolution', path: '/evolution' },
  { key: 'livecasino', label: 'Live Casino', path: '/livecasino' },
  { key: 'vivo', label: 'Livo', path: '/vivo' },
  { key: 'betgames', label: 'Bet Games', path: '/betgames' },
  { key: 'casino3', label: 'Casino 3', path: '/casino3' },

  // { key: 'evolution', label: 'Evolution' },
  // { key: 'ezugi', label: 'Ezugi' },
  // { key: 'spribe', label: 'Aviator' },
  // { key: 'smartsoft', label: 'SmartSoft' },
  // { key: 'pragmaticplay', label: 'Pragmatic Play' },
  // { key: 'pgsoft', label: 'PG Soft' },
  // { key: 'jili', label: 'Jili' },
  // { key: 'jdb', label: 'JDB' },
  // { key: 'cq9', label: 'CQ9' },
  // { key: 'km', label: 'KM' },
  // { key: 'habanero', label: 'Habanero' },
  // { key: 'microgaming', label: 'Microgaming' },
  // { key: 'nolimit', label: 'No Limit City' },
  // { key: 'bigtimegaming', label: 'Big Time Gaming' },
  // { key: 'redtiger', label: 'Red Tiger' },
  // { key: 'relax', label: 'Relax Gaming' },
  // { key: 'playtech', label: 'Playtech' },
  // { key: 'onegame', label: 'One Game' },
  // { key: 'inout', label: 'Inout' },
];
