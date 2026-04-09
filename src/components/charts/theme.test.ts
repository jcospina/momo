import theme from './theme.json';

describe('momo chart theme', () => {
  it('sets neobrutalist tooltip and axis defaults', () => {
    expect(theme.tooltip).toMatchObject({
      backgroundColor: 'rgb(246, 245, 236)',
      borderColor: 'rgb(2, 0, 32)',
      borderWidth: 2,
    });
    expect(theme.categoryAxis.axisLine.lineStyle).toMatchObject({
      color: 'rgb(2, 0, 32)',
      width: 2,
    });
    expect(theme.valueAxis.axisTick.lineStyle).toMatchObject({
      color: 'rgb(2, 0, 32)',
      width: 2,
    });
  });

  it('sets visible dark borders for bar and pie marks', () => {
    expect(theme.bar.itemStyle).toMatchObject({
      barBorderWidth: 2,
      barBorderColor: 'rgb(2, 0, 32)',
    });
    expect(theme.pie.itemStyle).toMatchObject({
      borderWidth: 2,
      borderColor: 'rgb(2, 0, 32)',
    });
    expect(theme.line.lineStyle).toMatchObject({
      width: 3,
    });
  });
});
