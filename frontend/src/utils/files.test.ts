import { describe, expect, it } from 'vitest';
import { browserTimeZone, formatDateTime, localDateTimeInputValue, localDateTimeInputValueWithSeconds } from './files';

describe('date and time presentation', () => {
  it('states the browser time zone and UTC offset', () => {
    const formatted = formatDateTime('2026-10-25T12:00:00.000Z');

    expect(formatted).toContain(`(${browserTimeZone()})`);
    expect(formatted).toMatch(/(?:GMT|UTC)/);
  });

  it('formats datetime-local defaults in browser local time rather than UTC text', () => {
    const formatted = localDateTimeInputValue(new Date('2026-10-25T12:34:00.000Z'));

    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(formatted).not.toContain('Z');
  });

  it('preserves seconds when editing an existing timestamp', () => {
    expect(localDateTimeInputValueWithSeconds(new Date('2026-10-25T12:34:56.000Z'))).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:56$/);
  });
});
