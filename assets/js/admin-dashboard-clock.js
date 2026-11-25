(() => {
  'use strict';

  const capsule = document.getElementById('adminTodayCapsule');
  const time = capsule?.querySelector('#adminHeroLiveTime');
  const date = capsule?.querySelector('[data-overview-date]');
  if (!time || !date) return;

  const timeZone = 'Asia/Manila';
  const timeLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });
  const dateLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone, month: 'long', day: 'numeric', year: 'numeric',
  });
  const dateTimeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
  });
  let timer;

  function tick() {
    const now = new Date();
    const { year, month, day, hour, minute, second, timeZoneName } = Object.fromEntries(
      dateTimeParts.formatToParts(now).map(({ type, value }) => [type, value]),
    );
    const dayString = `${year}-${month}-${day}`;
    time.textContent = timeLabel.format(now);
    time.setAttribute('datetime', `${dayString}T${hour}:${minute}:${second}${timeZoneName.slice(3)}`);
    if (date.getAttribute('datetime') !== dayString) {
      date.textContent = dateLabel.format(now);
      date.setAttribute('datetime', dayString);
    }
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
  }

  const stop = () => window.clearTimeout(timer);
  function sync() {
    stop();
    if (!document.hidden) tick();
  }

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
  sync();
})();
