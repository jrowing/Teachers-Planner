import { Entry } from '../types';
import { CalendarView } from './calendarView';
import { startOfDay, isSameDay, isSameMonth } from '../helpers/dateUtil';
import { applyTagColors } from '../helpers/tagColor';

export function renderMonth(container: HTMLElement, view: CalendarView): void {
	container.empty();
	container.addClass('mdcal-month-pane');

	// Header
	const header = container.createDiv({ cls: 'mdcal-month-header' });
	header.createEl('h2', { text: monthTitle(view.displayedMonth) });
	const navBtns = header.createDiv({ cls: 'mdcal-nav-btns' });
	navBtns.createEl('button', { text: '‹' }).addEventListener('click', () => {
		view.displayedMonth = new Date(
			view.displayedMonth.getFullYear(),
			view.displayedMonth.getMonth() - 1,
			1
		);
		view.render();
	});
	navBtns.createEl('button', { text: 'Today' }).addEventListener('click', () => {
		const t = new Date();
		view.displayedMonth = new Date(t.getFullYear(), t.getMonth(), 1);
		view.selectedDate = startOfDay(t);
		view.render();
	});
	navBtns.createEl('button', { text: '›' }).addEventListener('click', () => {
		view.displayedMonth = new Date(
			view.displayedMonth.getFullYear(),
			view.displayedMonth.getMonth() + 1,
			1
		);
		view.render();
	});

	// Weekday header
	const weekdayRow = container.createDiv({ cls: 'mdcal-weekday-row' });
	const weekStartsOn = view.plugin.settings.weekStartsOn;
	const weekdayNames = weekdaySymbols(weekStartsOn);
	for (const name of weekdayNames) {
		weekdayRow.createDiv({ text: name });
	}

	// Grid
	const grid = container.createDiv({ cls: 'mdcal-month-grid' });
	const days = daysInMonthGrid(view.displayedMonth, weekStartsOn);
	const today = startOfDay(new Date());

	for (const day of days) {
		const cell = grid.createDiv({ cls: 'mdcal-day' });
		const isCurrent = isSameMonth(day, view.displayedMonth);
		const isSelected = isSameDay(day, view.selectedDate);
		const isToday = isSameDay(day, today);

		if (!isCurrent) cell.addClass('is-other-month');
		if (isSelected) cell.addClass('is-selected');
		if (isToday) cell.addClass('is-today');

		const num = cell.createDiv({ cls: 'mdcal-day-num', text: String(day.getDate()) });
		if (isToday) num.addClass('is-today-marker');

		const entries = view.getEntriesOnDay(day);
		for (const e of entries.slice(0, 3)) {
			renderPill(cell, e, view);
		}
		if (entries.length > 3) {
			cell.createDiv({ cls: 'mdcal-more', text: `+${entries.length - 3} more` });
		}

		cell.addEventListener('click', () => view.selectDay(day));
		cell.addEventListener('dblclick', (ev) => {
			ev.stopPropagation();
			view.openNewEntryModal(startOfDay(day));
		});
	}
}

function renderPill(parent: HTMLElement, entry: Entry, view: CalendarView): void {
	const pill = parent.createDiv({ cls: 'mdcal-pill' });
	const firstTag = entry.tags[0];
	if (firstTag) applyTagColors(pill, firstTag);
	if (firstTag) {
		const tagEl = pill.createSpan({ cls: 'mdcal-pill-tag', text: firstTag.toUpperCase() });
		tagEl.setAttribute('title', firstTag);
	}
	pill.createSpan({ cls: 'mdcal-pill-title', text: entry.title });
	pill.setAttribute('title', firstTag ? `${firstTag} · ${entry.title}` : entry.title);
	pill.addEventListener('click', (ev) => {
		ev.stopPropagation();
		view.openEntry(entry);
	});
}

function monthTitle(d: Date): string {
	return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function weekdaySymbols(weekStartsOn: 0 | 1): string[] {
	const all = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	if (weekStartsOn === 1) return [...all.slice(1), all[0]];
	return all;
}

function daysInMonthGrid(displayedMonth: Date, weekStartsOn: 0 | 1): Date[] {
	const year = displayedMonth.getFullYear();
	const month = displayedMonth.getMonth();
	const firstOfMonth = new Date(year, month, 1);
	const startOffset = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;
	const gridStart = new Date(year, month, 1 - startOffset);
	const out: Date[] = [];
	for (let i = 0; i < 42; i++) {
		out.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
	}
	return out;
}
