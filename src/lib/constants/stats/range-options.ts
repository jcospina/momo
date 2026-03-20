export const STATS_RANGE_OPTIONS = [
  { label: '1m', value: '1' },
  { label: '3m', value: '3' },
  { label: '6m', value: '6' },
  { label: '12m', value: '12' },
];

export const STATS_RANGE_OPTIONS_NO_1M = STATS_RANGE_OPTIONS.filter(
  option => option.value !== '1',
);
