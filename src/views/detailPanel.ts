import { MarkdownRenderer, Component } from 'obsidian';
import { Entry } from '../types';
import { CalendarView } from './calendarView';
import { formatTime } from '../helpers/dateUtil';

export function renderDetailPanel(container: HTMLElement, view: CalendarView): void {
	container.empty();
	container.addClass('mdcal-detail');

	const header = container.createDiv({ cls: 'mdcal-detail-header' });
	const headTop = header.createDiv({ cls: 'mdcal-detail-headtop' });
	const titleBlock = headTop.createDiv();
	titleBlock.createEl('h3', { text: formatDate(view.selectedDate) });
	const entries = view.getEntriesOnDay(view.selectedDate);
	titleBlock.createDiv({
		cls: 'mdcal-detail-count',
		text: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`,
	});
	const newBtn = headTop.createEl('button', { text: '+', cls: 'mdcal-icon-btn' });
	newBtn.setAttribute('aria-label', 'New entry on this day');
	newBtn.addEventListener('click', () => view.openNewEntryModal(view.selectedDate));

	const body = container.createDiv({ cls: 'mdcal-detail-body' });
	if (entries.length === 0) {
		body.createDiv({ cls: 'mdcal-empty', text: 'No entries' });
		return;
	}
	for (const entry of entries) {
		renderEntryCard(body, entry, view);
	}
}

function renderEntryCard(parent: HTMLElement, entry: Entry, view: CalendarView): void {
	const card = parent.createDiv({ cls: 'mdcal-card' });

	card.createEl('h4', { text: entry.title });
	card.createDiv({ cls: 'mdcal-card-path', text: entry.file.path });
	card.createDiv({ cls: 'mdcal-card-time', text: timeDisplay(entry) });

	if (entry.tags.length > 0) {
		const tags = card.createDiv({ cls: 'mdcal-card-tags' });
		for (const t of entry.tags) {
			view.makeTagPill(tags, t, { clickable: true, active: view.filterTag === t });
		}
	}

	if (entry.body) {
		const md = card.createDiv({ cls: 'mdcal-md' });
		const tempComp = new Component();
		MarkdownRenderer.render(view.app, entry.body, md, entry.file.path, tempComp);
	}

	if (entry.requirements.length > 0) {
		const reqs = card.createDiv({ cls: 'mdcal-card-reqs' });
		reqs.createDiv({ cls: 'mdcal-card-reqs-label', text: 'Requirements' });
		const ul = reqs.createEl('ul');
		for (const r of entry.requirements) {
			ul.createEl('li', { text: r });
		}
	}

	card.addEventListener('click', () => view.openEntry(entry));
}

function formatDate(d: Date): string {
	return d.toLocaleDateString(undefined, {
		weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
	});
}

function timeDisplay(entry: Entry): string {
	if (!entry.hasTime) return 'All day';
	const start = formatTime(entry.date);
	if (entry.endDate) {
		const minutes = Math.round((entry.endDate.getTime() - entry.date.getTime()) / 60000);
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		const parts: string[] = [];
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		return `${start} – ${formatTime(entry.endDate)} · ${parts.join(' ')}`;
	}
	return start;
}
