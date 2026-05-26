export const hasMasterBookDownline = (item) =>
  Boolean(item?.userRole && item.userRole !== 'user');

export const buildMasterBookBreadcrumbRoot = (userInfo) => [
  {
    id: userInfo?._id ?? '',
    userName: userInfo?.userName ?? 'User',
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
