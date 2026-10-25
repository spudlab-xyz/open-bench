import { ChevronDown, ChevronUp, ChevronsUpDown, X } from 'lucide-react';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Button({ variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <header className="panel-header"><div>{title}</div><div className="panel-actions">{action}</div></header>}
    <div className="panel-body">{children}</div>
  </section>;
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  return <span className={`status status-${tone}`}><span className="status-dot" />{children}</span>;
}

export function SortableHeader({ children, active, direction, onSort, className = '' }: { children: ReactNode; active: boolean; direction: 'asc' | 'desc'; onSort: () => void; className?: string }) {
  const Icon = active ? direction === 'asc' ? ChevronUp : ChevronDown : ChevronsUpDown;
  return <th className={`${active ? 'sorted' : ''} ${className}`} aria-sort={active ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button className="sort-header" type="button" onClick={onSort}>{children}{active ? <span className="sort-indicator"><Icon aria-hidden="true" /><small>{direction.toUpperCase()}</small></span> : <Icon className="sort-unsorted" aria-hidden="true" />}</button></th>;
}

export function useSortableRows<T, K extends string>(rows: readonly T[], defaultKey: K, valueFor: (row: T, key: K) => string | number | null | undefined, defaultDirection: 'asc' | 'desc' = 'asc') {
  const [sort, setSort] = useState<{ key: K; direction: 'asc' | 'desc' }>({ key: defaultKey, direction: defaultDirection });
  const sortedRows = [...rows].sort((left, right) => {
    const leftValue = valueFor(left, sort.key);
    const rightValue = valueFor(right, sort.key);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { numeric: true });
    return sort.direction === 'asc' ? result : -result;
  });
  const sortBy = (key: K) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  return { rows: sortedRows, sort, sortBy };
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button></header>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">◎</div><h3>{title}</h3><p>{children}</p>{action}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export function Metric({ value, label }: { value: ReactNode; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}
