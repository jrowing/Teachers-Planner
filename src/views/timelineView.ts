import { MarkdownRenderer, Component } from 'obsidian';
import { Entry } from '../types';
import { CalendarView } from './calendarView';
import { startOfDay, isSameDay, formatTime, pad } from '../helpers/dateUtil';
import { compareEntriesForDay } from '../helpers/entryStore';

export function renderTimeline(container: HTMLElement, view: CalendarView): void {
	container.empty();
	container.addClass('mdcal-timeline-pane');

	const header = container.createDiv({ cls: 'mdcal-timeline-header' });
	if (view.filterTag) {
		header.createEl('h2', { text: 'Tagged ' });
		const pill = view.makeTagPill(header.querySelector('h2')!, view.filterTag, { active: true });
		const clearBtn = header.createEl('button', { text: 'Clear filter' });
		clearBtn.addEventListener('click', () => {
			view.filterTag = null;
			view.render();
		});
	} else {
		header.createEl('h2', { text: 'All entries' });
	}

	const entries = view.getFilteredEntries().slice().sort((a, b) => {
		const dayA = startOfDay(a.date).getTime();
		const dayB = startOfDay(b.date).getTime();
		if (dayA !== dayB) return dayA - dayB;
		return compareEntriesForDay(a, b);
	});

	const body = container.createDiv({ cls: 'mdcal-timeline-body' });

	if (entries.length === 0) {
		body.createDiv({
			cls: 'mdcal-empty',
			text: view.filterTag ? `No entries tagged ${view.filterTag}` : 'No entries yet'
		});
		return;
	}

	// Group by year-month
	const groups = new Map<string, Entry[]>();
	for (const e of entries) {
		const key = `${e.date.getFullYear()}-${pad(e.date.getMonth() + 1)}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(e);
	}

	for (const [key, items] of groups) {
		const heading = body.createDiv({
			cls: 'mdcal-timeline-month',
			text: monthLabel(key),
		});
		for (const e of items) {
			renderTimelineItem(body, e, view);
		}
	}
}

function renderTimelineItem(parent: HTMLElement, entry: Entry, view: CalendarView): void {
	const item = parent.createDiv({ cls: 'mdcal-timeline-item' });

	const dateCol = item.createDiv({ cls: 'mdcal-timeline-date' });
	dateCol.createDiv({ cls: 'mdcal-timeline-day', text: String(entry.date.getDate()) });
	dateCol.createDiv({ cls: 'mdcal-timeline-weekday', text: weekdayShort(entry.date) });
	if (entry.hasTime) {
		const time = entry.endDate
			? `${formatTime(entry.date)} – ${formatTime(entry.endDate)}`
			: formatTime(entry.date);
		dateCol.createDiv({ cls: 'mdcal-timeline-time', text: time });
	}

	item.createDiv({ cls: 'mdcal-timeline-rail' });

	const content = item.createDiv({ cls: 'mdcal-timeline-content' });
	content.createEl('h4', { text: entry.title });

	if (entry.tags.length > 0) {
		const tags = content.createDiv({ cls: 'mdcal-timeline-tags' });
		for (const t of entry.tags) {
			view.makeTagPill(tags, t, { clickable: true, active: view.filterTag === t });
		}
	}

	if (entry.body) {
		const md = content.createDiv({ cls: 'mdcal-md' });
		// Use Obsidian's built-in markdown rendering
		const tempComp = new Component();
		MarkdownRenderer.render(view.app, entry.body, md, entry.file.path, tempComp);
	}

	item.addEventListener('click', () => view.openEntry(entry));
}

function monthLabel(key: string): string {
	const [year, month] = key.split('-').map(Number);
	const d = new Date(year, month - 1, 1);
	return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
}

function weekdayShort(d: Date): string {
	return d.toLocaleDateString(undefined, { weekday: 'short' });
}
