export function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  const timeZone = browserTimeZone();
  const formatted = new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'longOffset',
  }).format(date);
  return `${formatted} (${timeZone})`;
}

export function localDateTimeInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: browserTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function localDateTimeInputValueWithSeconds(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: browserTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
}

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
