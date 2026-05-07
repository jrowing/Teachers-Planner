import { Entry } from '../types';
import { CalendarView } from './calendarView';
import { startOfDay, startOfWeek, isSameDay, formatTime, pad } from '../helpers/dateUtil';
import { applyTagColors } from '../helpers/tagColor';
import { compareEntriesForDay } from '../helpers/entryStore';

const HOUR_HEIGHT = 56;

export function renderWeek(container: HTMLElement, view: CalendarView): void {
	container.empty();
	container.addClass('mdcal-week-pane');

	const settings = view.plugin.settings;
	const startHour = settings.weekStartHour;
	const endHour = settings.weekEndHour;
	const totalHours = endHour - startHour;
	const weekStartsOn = settings.weekStartsOn;

	// Anchor on the start of the configured week
	const weekStart = startOfWeek(view.weekAnchor, weekStartsOn);
	// Mon-Fri only (5 days). If user wants weekends, that's a future setting.
	const days = Array.from({ length: 5 }, (_, i) => {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + i);
		return d;
	});

	// --- Header ---
	const header = container.createDiv({ cls: 'mdcal-week-header' });
	header.createEl('h2', { text: rangeTitle(weekStart, days[4]) });
	const nav = header.createDiv({ cls: 'mdcal-nav-btns' });
	nav.createEl('button', { text: '‹' }).addEventListener('click', () => {
		view.weekAnchor = new Date(view.weekAnchor.getTime() - 7 * 86400000);
		view.render();
	});
	nav.createEl('button', { text: 'This week' }).addEventListener('click', () => {
		view.weekAnchor = new Date();
		view.selectedDate = startOfDay(new Date());
		view.render();
	});
	nav.createEl('button', { text: '›' }).addEventListener('click', () => {
		view.weekAnchor = new Date(view.weekAnchor.getTime() + 7 * 86400000);
		view.render();
	});

	// --- Day-name row ---
	const dayHeaders = container.createDiv({ cls: 'mdcal-week-dayheaders' });
	dayHeaders.createDiv({ cls: 'mdcal-week-gutter' });
	const today = startOfDay(new Date());
	for (const day of days) {
		const cell = dayHeaders.createDiv({ cls: 'mdcal-week-daycol' });
		if (isSameDay(day, today)) cell.addClass('is-today');
		cell.createDiv({ cls: 'mdcal-week-dayname', text: dayName(day) });
		const num = cell.createDiv({ cls: 'mdcal-week-daynum', text: String(day.getDate()) });
		if (isSameDay(day, today)) num.addClass('is-today-marker');
		cell.addEventListener('click', () => view.selectDay(day));
	}

	// --- All-day row ---
	const allDayByDay: Entry[][] = days.map(d => view.getEntriesOnDay(d).filter(e => !e.hasTime));
	const hasAnyAllDay = allDayByDay.some(arr => arr.length > 0);
	if (hasAnyAllDay) {
		const allDayRow = container.createDiv({ cls: 'mdcal-week-allday' });
		const gutter = allDayRow.createDiv({ cls: 'mdcal-week-gutter', text: 'All-day' });
		for (let i = 0; i < 5; i++) {
			const cell = allDayRow.createDiv({ cls: 'mdcal-week-allday-cell' });
			for (const e of allDayByDay[i]) {
				const ev = cell.createDiv({ cls: 'mdcal-week-allday-event', text: e.title });
				const firstTag = e.tags[0];
				if (firstTag) applyTagColors(ev, firstTag);
				ev.setAttribute('title', e.title);
				ev.addEventListener('click', () => view.openEntry(e));
			}
		}
	}

	// --- Time grid ---
	const grid = container.createDiv({ cls: 'mdcal-week-grid' });
	const inner = grid.createDiv({ cls: 'mdcal-week-grid-inner' });
	inner.style.setProperty('--mdcal-hour-height', HOUR_HEIGHT + 'px');
	inner.style.setProperty('--mdcal-total-hours', String(totalHours));

	// Hour rows (gutter labels + 5 day columns)
	for (let h = 0; h < totalHours; h++) {
		const hour = startHour + h;
		const label = inner.createDiv({ cls: 'mdcal-week-hourlabel', text: formatHourLabel(hour) });
		label.style.height = HOUR_HEIGHT + 'px';
		for (let d = 0; d < 5; d++) {
			const col = inner.createDiv({ cls: 'mdcal-week-cell' });
			col.style.height = HOUR_HEIGHT + 'px';
		}
	}

	// Event overlays
	const overlay = grid.createDiv({ cls: 'mdcal-week-overlay' });
	overlay.style.height = (totalHours * HOUR_HEIGHT) + 'px';

	for (let i = 0; i < 5; i++) {
		const day = days[i];
		const dayCol = overlay.createDiv({ cls: 'mdcal-week-overlay-col' });
		dayCol.style.left = `calc(56px + ${i} * (100% - 56px) / 5)`;
		dayCol.style.width = `calc((100% - 56px) / 5)`;

		const timed = view.getEntriesOnDay(day).filter(e => e.hasTime);
		const placed = computeLayout(timed, startHour, endHour);
		for (const p of placed) {
			const ev = dayCol.createDiv({ cls: 'mdcal-week-event' });
			ev.style.top = p.top + 'px';
			ev.style.height = p.height + 'px';
			ev.style.left = `calc(${p.left}% + 2px)`;
			ev.style.width = `calc(${p.width}% - 4px)`;
			if (p.height < 28) ev.addClass('is-tiny');

			const firstTag = p.entry.tags[0];
			if (firstTag) applyTagColors(ev, firstTag);

			const time = p.entry.endDate
				? `${formatTime(p.entry.date)} – ${formatTime(p.entry.endDate)}`
				: formatTime(p.entry.date);
			ev.createDiv({ cls: 'mdcal-event-time', text: time });
			ev.createDiv({ cls: 'mdcal-event-title', text: p.entry.title });
			ev.setAttribute('title', `${time} · ${p.entry.title}`);
			ev.addEventListener('click', () => view.openEntry(p.entry));
		}

		// Now line if today
		if (isSameDay(day, today)) {
			const now = new Date();
			const minutesFromStart = (now.getHours() - startHour) * 60 + now.getMinutes();
			if (minutesFromStart >= 0 && minutesFromStart <= totalHours * 60) {
				const line = dayCol.createDiv({ cls: 'mdcal-week-nowline' });
				line.style.top = (minutesFromStart / 60 * HOUR_HEIGHT) + 'px';
			}
		}

		dayCol.addEventListener('dblclick', () => {
			view.openNewEntryModal(startOfDay(day));
		});
	}
}

interface PlacedEvent {
	entry: Entry;
	top: number;
	height: number;
	left: number;
	width: number;
}

function computeLayout(entries: Entry[], startHour: number, endHour: number): PlacedEvent[] {
	const startMin = startHour * 60;
	const endMin = endHour * 60;

	const items = entries.map(e => {
		const sMin = e.date.getHours() * 60 + e.date.getMinutes();
		let eMin: number;
		if (e.endDate) {
			const sameDay = isSameDay(e.date, e.endDate);
			eMin = sameDay
				? e.endDate.getHours() * 60 + e.endDate.getMinutes()
				: 24 * 60;
		} else {
			eMin = sMin + 30;
		}
		const cs = Math.max(sMin, startMin);
		const ce = Math.min(eMin, endMin);
		if (ce <= cs) return null;
		return { entry: e, startMin: cs, endMin: ce };
	}).filter((x): x is { entry: Entry; startMin: number; endMin: number } => x !== null);

	items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

	interface Group { items: { entry: Entry; startMin: number; endMin: number; col: number }[]; cols: number }
	const groups: Group[] = [];
	let current: Group = { items: [], cols: 0 };
	let currentEnd = -Infinity;

	for (const item of items) {
		if (item.startMin >= currentEnd) {
			if (current.items.length > 0) groups.push(current);
			current = { items: [], cols: 0 };
		}
		const usedCols = new Set(current.items.filter(p => p.endMin > item.startMin).map(p => p.col));
		let col = 0;
		while (usedCols.has(col)) col++;
		current.items.push({ ...item, col });
		current.cols = Math.max(current.cols, col + 1);
		currentEnd = Math.max(currentEnd, item.endMin);
	}
	if (current.items.length > 0) groups.push(current);

	const out: PlacedEvent[] = [];
	for (const g of groups) {
		for (const p of g.items) {
			const top = ((p.startMin - startHour * 60) / 60) * HOUR_HEIGHT;
			const height = Math.max(18, ((p.endMin - p.startMin) / 60) * HOUR_HEIGHT - 2);
			const colWidth = 100 / g.cols;
			out.push({
				entry: p.entry,
				top,
				height,
				left: p.col * colWidth,
				width: colWidth,
			});
		}
	}
	return out;
}

function rangeTitle(start: Date, end: Date): string {
	const sameMonth = start.getMonth() === end.getMonth();
	const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	const endStr = sameMonth
		? String(end.getDate())
		: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return `${startStr} – ${endStr}, ${end.getFullYear()}`;
}

function dayName(d: Date): string {
	return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatHourLabel(h: number): string {
	if (h === 0) return '12am';
	if (h === 12) return '12pm';
	return h < 12 ? `${h}am` : `${h - 12}pm`;
}
