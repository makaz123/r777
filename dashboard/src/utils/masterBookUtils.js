export const hasMasterBookDownline = (item) =>
  Boolean(item?.userRole && item.userRole !== 'user');

export const buildMasterBookBreadcrumbRoot = (userInfo) => [
  {
    id: userInfo?._id ?? '',
    userName: userInfo?.userName ?? 'User',
    partnership: Number(userInfo?.partnership) || 0,
  },
];

export const applyPartnership = (role, amount, partnership) => {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (role === 'user') {
    return roundedAmount;
  }
  return Math.round(roundedAmount * ((100 - partnership) / 100) * 100) / 100;
};

export const getMasterBookTeamValue = (item, team) => {
  if (item.otype === 'back') {
    return item.teamName === team ? item.totalBetAmount : -item.totalPrice;
  }
  return item.teamName === team ? -item.totalPrice : item.totalBetAmount;
};

export const getMasterBookCellDisplay = (item, team) => {
  const displayValue = getMasterBookTeamValue(item, team);
  const roundedValue = applyPartnership(
    item.userRole,
    displayValue,
    item.partnership
  );
  const numericValue = parseFloat(roundedValue) || 0;
  return {
    roundedValue,
    colorClass: numericValue >= 0 ? 'text-green-600' : 'text-red-500',
  };
};

export const getMasterBookBreakdown = (item, team, viewerPartnership = 0) => {
  const rawAmount = getMasterBookTeamValue(item, team) || 0;
  const itemPartnership =
    item.userRole === 'user' ? 0 : Number(item.partnership) || 0;

  // Total passed UP to the viewer
  const total =
    Math.round(rawAmount * ((100 - itemPartnership) / 100) * 100) / 100;

  // Viewer's P/L
  const pl =
    Math.round(
      rawAmount * ((viewerPartnership - itemPartnership) / 100) * 100
    ) / 100;

  // Viewer's Up Line (Negated as per UI convention: Total + UpLine = P/L)
  const upline =
    (-1 * Math.round(rawAmount * ((100 - viewerPartnership) / 100) * 100)) /
    100;

  return {
    total: {
      value: total,
      class: total >= 0 ? 'text-green-600' : 'text-red-500',
    },
    upline: {
      value: upline,
      class: upline >= 0 ? 'text-green-600' : 'text-red-500',
    },
    pl: {
      value: pl,
      class: pl >= 0 ? 'text-green-600' : 'text-red-500',
    },
  };
};
