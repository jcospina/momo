import {
  distanceFromBottom,
  flushScrollEvents,
  installFakeScrollLayout,
  notifyResize,
  userScrollTo,
  viewportTop,
} from './fake-scroll-layout.test-helper';
import { createStickToBottom } from './stick-to-bottom';

const CLIENT_HEIGHT = 300;
const ROW_HEIGHT = 100;
const ROW_COUNT = 10;
/** 10 rows of 100px in a 300px viewport. */
const END_SCROLL_TOP = ROW_COUNT * ROW_HEIGHT - CLIENT_HEIGHT;

let restoreLayout: () => void;

beforeAll(() => {
  restoreLayout = installFakeScrollLayout();
});

afterAll(() => {
  restoreLayout();
});

afterEach(() => {
  document.body.innerHTML = '';
});

function buildRow(height = ROW_HEIGHT) {
  const row = document.createElement('div');
  row.setAttribute('data-fake-height', String(height));
  return row;
}

/**
 * Builds `scroller > rows > row × ROW_COUNT`, connects a helper and lets the
 * scroll event from its first jump to the end run, as it would in a browser
 * long before the reader does anything.
 */
async function connectList() {
  const scroller = document.createElement('div');
  scroller.setAttribute('data-fake-client-height', String(CLIENT_HEIGHT));
  const rows = document.createElement('div');
  for (let i = 0; i < ROW_COUNT; i += 1) {
    rows.append(buildRow());
  }
  scroller.append(rows);
  document.body.append(scroller);

  const stick = createStickToBottom();
  const disconnect = stick.connect(scroller);
  await flushScrollEvents();
  return { scroller, rows, stick, disconnect };
}

function firstVisibleRow(rows: HTMLElement) {
  const row = [...rows.children].find(
    child => child.getBoundingClientRect().bottom > 0,
  );
  if (!row) throw new Error('no visible row');
  return row;
}

describe('createStickToBottom', () => {
  it('turns native scroll anchoring off on the scroller', async () => {
    const { scroller } = await connectList();
    expect(scroller.style.getPropertyValue('overflow-anchor')).toBe('none');
  });

  it('starts at the end and follows rows appended below', async () => {
    const { scroller, rows } = await connectList();
    expect(scroller.scrollTop).toBe(END_SCROLL_TOP);

    rows.append(buildRow());
    await flushScrollEvents();

    expect(scroller.scrollTop).toBe(END_SCROLL_TOP + ROW_HEIGHT);
    expect(distanceFromBottom(scroller)).toBe(0);
  });

  it('follows a row that grows at the end, like streamed text', async () => {
    const { scroller, rows } = await connectList();

    rows.lastElementChild?.setAttribute('data-fake-height', '260');
    notifyResize();

    expect(distanceFromBottom(scroller)).toBe(0);
  });

  it('keeps the first visible row in place when older rows are prepended', async () => {
    const { scroller, rows, stick } = await connectList();
    await userScrollTo(scroller, 450);
    const watched = firstVisibleRow(rows);
    const topBefore = viewportTop(watched);

    rows.prepend(buildRow(80), buildRow(80), buildRow(80));
    await flushScrollEvents();

    expect(stick.get().following).toBe(false);
    expect(viewportTop(watched)).toBe(topBefore);
    expect(scroller.scrollTop).toBe(450 + 3 * 80);
  });

  it('keeps the first visible row in place when a row above it grows or disappears', async () => {
    const { scroller, rows } = await connectList();
    await userScrollTo(scroller, 450);
    const watched = firstVisibleRow(rows);
    const topBefore = viewportTop(watched);

    rows.children[1].setAttribute('data-fake-height', '250');
    notifyResize();
    expect(viewportTop(watched)).toBe(topBefore);

    (rows.children[2] as HTMLElement).style.display = 'none';
    notifyResize();
    expect(viewportTop(watched)).toBe(topBefore);
  });

  it('does not follow rows appended while scrolled up and reports them as unseen', async () => {
    const { scroller, rows, stick } = await connectList();
    await userScrollTo(scroller, 200);

    rows.append(buildRow());
    await flushScrollEvents();

    expect(scroller.scrollTop).toBe(200);
    expect(stick.get()).toEqual({
      following: false,
      atBottom: false,
      unseen: true,
    });
  });

  it('resumes following after scrollToBottom()', async () => {
    const { scroller, rows, stick } = await connectList();
    await userScrollTo(scroller, 200);

    stick.scrollToBottom();
    expect(distanceFromBottom(scroller)).toBe(0);

    rows.append(buildRow());
    await flushScrollEvents();
    expect(distanceFromBottom(scroller)).toBe(0);
    expect(stick.get().following).toBe(true);
  });

  it('resumes following when the reader scrolls back to the end', async () => {
    const { scroller, stick } = await connectList();
    await userScrollTo(scroller, 200);
    expect(stick.get().following).toBe(false);

    await userScrollTo(scroller, END_SCROLL_TOP);
    expect(stick.get()).toMatchObject({ following: true, atBottom: true });
  });

  it('restores the distance from the bottom after prepend()', async () => {
    const { scroller, rows, stick } = await connectList();
    await userScrollTo(scroller, 450);
    const distanceBefore = distanceFromBottom(scroller);

    stick.prepend();
    rows.prepend(buildRow(), buildRow());
    await flushScrollEvents();

    expect(distanceFromBottom(scroller)).toBe(distanceBefore);
  });

  it('stops following on an upward wheel before any scroll event', async () => {
    const { scroller, stick } = await connectList();

    scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: -40 }));

    expect(stick.get().following).toBe(false);
  });

  it('stops watching after disconnect', async () => {
    const { scroller, rows, disconnect } = await connectList();
    disconnect();

    rows.append(buildRow());
    await flushScrollEvents();

    expect(scroller.scrollTop).toBe(END_SCROLL_TOP);
  });
});
