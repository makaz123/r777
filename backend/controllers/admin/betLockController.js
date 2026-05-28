import SubAdmin from '../../models/subAdminModel.js';
import { fetchMatchList } from '../../services/matchApi/index.js';
import { refreshUserAndDownlines } from '../../utils/userRefreshNotify.js';

const getSportIdFromName = (name) => {
  const map = {
    cricket: 4,
    soccer: 1,
    tennis: 2,
    kabaddi: 52,
    election: 322,
    horse: 7,
    greyhound: 43,
  };
  return map[name.toLowerCase()] || 4;
};

// Returns a hierarchy of Competition -> Event -> Market for a given date and sport
export const getBetLockTree = async (req, res) => {
  try {
    const { date, sport } = req.query;
    if (!sport) {
      return res
        .status(400)
        .json({ success: false, message: 'Sport is required' });
    }

    const sportId = getSportIdFromName(sport);
    const data = await fetchMatchList(sportId);

    if (!data.success) {
      return res
        .status(500)
        .json({ success: false, message: 'Failed to fetch match list' });
    }

    const t1 = data.data?.t1 || [];
    const t2 = data.data?.t2 || [];
    const allMatches = [...t1, ...t2];

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const targetTime = targetDate.getTime();

    // Group by competition
    const competitionsMap = new Map();

    allMatches.forEach((match) => {
      const matchDate = new Date(match.stime);
      matchDate.setHours(0, 0, 0, 0);

      console.log(
        'Match stime:',
        match.stime,
        'matchDate:',
        matchDate.getTime(),
        'targetTime:',
        targetTime,
        'match.iplay:',
        match.iplay
      );

      // If the match is inplay, or matches the target date
      if (matchDate.getTime() === targetTime || match.iplay) {
        const compId = match.cid || match.cname; // some unique comp ID
        if (!competitionsMap.has(compId)) {
          competitionsMap.set(compId, {
            id: compId,
            title: match.cname,
            children: [],
          });
        }

        const comp = competitionsMap.get(compId);

        const matchId = match.beventId || match.oldgmid || match.gmid;

        // Map markets.
        const markets = [];
        if (match.section && match.section.length > 0) {
          markets.push({ id: `mo_${matchId}`, name: 'Match Odds' });
        }
        if (match.bm) {
          markets.push({ id: `bm_${matchId}`, name: 'Bookmaker' });
        }
        if (match.f) {
          markets.push({ id: `f_${matchId}`, name: 'Fancy' });
        }

        comp.children.push({
          id: matchId,
          title: match.ename,
          markets: markets,
        });
      }
    });

    const competitionData = Array.from(competitionsMap.values());

    return res.status(200).json({
      success: true,
      data: competitionData,
    });
  } catch (error) {
    console.error('Error fetching bet lock tree:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUserBetLocks = async (req, res) => {
  try {
    const { userId } = req.params; // this is the _id of the user
    const user = await SubAdmin.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      advancedBetLocks: user.advancedBetLocks || {},
      gamelock: user.gamelock || [],
    });
  } catch (error) {
    console.error('Error fetching user bet locks:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUserBetLocks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { advancedBetLocks, gamelock } = req.body;

    const user = await SubAdmin.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    if (advancedBetLocks) {
      user.advancedBetLocks = advancedBetLocks;
    }
    if (gamelock) {
      user.gamelock = gamelock;
    }

    await user.save();

    await refreshUserAndDownlines(userId);

    return res.status(200).json({
      success: true,
      message: 'Locks updated successfully',
    });
  } catch (error) {
    console.error('Error updating user bet locks:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
