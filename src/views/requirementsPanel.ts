import { Entry, RequirementsMode } from '../types';
import { CalendarView } from './calendarView';
import { startOfWeek, isSameDay, formatTime } from '../helpers/dateUtil';
import { compareEntriesForDay } from '../helpers/entryStore';

export function renderRequirementsPanel(container: HTMLElement, view: CalendarView): void {
	container.empty();
	container.addClass('mdcal-req');

	// Header
	const header = container.createDiv({ cls: 'mdcal-req-header' });
	header.createEl('h3', { text: 'Weekly requirements' });
	const closeBtn = header.createEl('button', { cls: 'mdcal-icon-btn', text: '×' });
	closeBtn.setAttribute('aria-label', 'Close');
	closeBtn.addEventListener('click', () => {
		view.showRequirements = false;
		view.render();
	});

	// Week nav
	const weekStart = startOfWeek(view.requirementsAnchor, view.plugin.settings.weekStartsOn);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);

	const nav = container.createDiv({ cls: 'mdcal-req-weeknav' });
	const prevBtn = nav.createEl('button', { text: '‹', cls: 'mdcal-icon-btn' });
	prevBtn.addEventListener('click', () => {
		view.requirementsAnchor = new Date(view.requirementsAnchor.getTime() - 7 * 86400000);
		view.render();
	});
	const labelBlock = nav.createDiv({ cls: 'mdcal-req-weeklabel' });
	labelBlock.createDiv({ text: rangeString(weekStart) });
	const subline = labelBlock.createDiv({ cls: 'mdcal-req-subline' });

	const allInWeek = view.getFilteredEntries()
		.filter(e => e.date >= weekStart && e.date < weekEnd)
		.slice()
		.sort((a, b) => {
			const dayA = a.date.getTime();
			const dayB = b.date.getTime();
			if (dayA !== dayB) return dayA - dayB;
			return compareEntriesForDay(a, b);
		});

	subline.setText(
		`${allInWeek.length} ${allInWeek.length === 1 ? 'session' : 'sessions'}` +
		(view.filterTag ? ` · tagged ${view.filterTag}` : '')
	);

	const thisWeekBtn = nav.createEl('button', { text: 'This week' });
	thisWeekBtn.addEventListener('click', () => {
		view.requirementsAnchor = new Date();
		view.render();
	});
	const nextBtn = nav.createEl('button', { text: '›', cls: 'mdcal-icon-btn' });
	nextBtn.addEventListener('click', () => {
		view.requirementsAnchor = new Date(view.requirementsAnchor.getTime() + 7 * 86400000);
		view.render();
	});

	// Mode toggle
	const modeBar = container.createDiv({ cls: 'mdcal-req-mode' });
	const modes: { mode: RequirementsMode; label: string }[] = [
		{ mode: 'aggregated', label: 'Aggregated' },
		{ mode: 'breakdown', label: 'Per-session' },
	];
	for (const { mode, label } of modes) {
		const b = modeBar.createEl('button', { text: label });
		if (view.requirementsMode === mode) b.addClass('is-active');
		b.addEventListener('click', () => {
			view.requirementsMode = mode;
			view.render();
		});
	}

	// Body
	const body = container.createDiv({ cls: 'mdcal-req-body' });
	if (allInWeek.length === 0) {
		body.createDiv({ cls: 'mdcal-empty', text: 'No sessions this week.' });
	} else if (view.requirementsMode === 'aggregated') {
		renderAggregated(body, allInWeek);
	} else {
		renderBreakdown(body, allInWeek, view);
	}

	// Footer
	const withReqs = allInWeek.filter(e => e.requirements.length > 0);
	if (allInWeek.length > 0) {
		const totalReqs = withReqs.reduce((acc, e) => acc + e.requirements.length, 0);
		container.createDiv({
			cls: 'mdcal-req-totals',
			text: `${withReqs.length} of ${allInWeek.length} ${allInWeek.length === 1 ? 'session has' : 'sessions have'} requirements · ${totalReqs} item${totalReqs === 1 ? '' : 's'} total`,
		});
	}
}

function renderAggregated(parent: HTMLElement, entries: Entry[]): void {
	interface Bucket { display: string; sessions: Set<string> }
	const buckets = new Map<string, Bucket>();
	for (const e of entries) {
		for (const req of e.requirements) {
			const key = req.toLowerCase().replace(/\s+/g, ' ').trim();
			if (!buckets.has(key)) {
				buckets.set(key, { display: req, sessions: new Set() });
			}
			buckets.get(key)!.sessions.add(e.id);
		}
	}
	if (buckets.size === 0) {
		parent.createDiv({
			cls: 'mdcal-empty',
			text: 'No `## Requirements` sections found in this week\'s sessions.'
		});
		return;
	}
	const sorted = [...buckets.values()].sort((a, b) => {
		if (b.sessions.size !== a.sessions.size) return b.sessions.size - a.sessions.size;
		return a.display.localeCompare(b.display);
	});
	for (const item of sorted) {
		const row = parent.createDiv({ cls: 'mdcal-req-item' });
		const checkbox = row.createEl('input', { type: 'checkbox' });
		row.createDiv({ cls: 'mdcal-req-text', text: item.display });
		const count = row.createDiv({ cls: 'mdcal-req-count', text: `${item.sessions.size}×` });
		count.setAttribute('title', `${item.sessions.size} session${item.sessions.size === 1 ? '' : 's'}`);
	}
}

function renderBreakdown(parent: HTMLElement, entries: Entry[], view: CalendarView): void {
	const withReqs = entries.filter(e => e.requirements.length > 0);
	if (withReqs.length === 0) {
		parent.createDiv({
			cls: 'mdcal-empty',
			text: 'No sessions this week have requirements listed.'
		});
		return;
	}
	for (const e of withReqs) {
		const block = parent.createDiv({ cls: 'mdcal-req-session' });
		const head = block.createDiv({ cls: 'mdcal-req-session-head' });
		head.setText(`${dayLabel(e.date)} · ${e.hasTime ? formatTime(e.date) : 'all day'}`);
		const title = block.createEl('h4', { text: e.title });
		title.addEventListener('click', () => view.openEntry(e));
		const ul = block.createEl('ul');
		for (const r of e.requirements) {
			ul.createEl('li', { text: r });
		}
	}
}

function rangeString(weekStart: Date): string {
	const cal = weekStart;
	const end = new Date(cal);
	end.setDate(end.getDate() + 6);
	const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return `${fmt(weekStart)} – ${fmt(end)}, ${end.getFullYear()}`;
}

function dayLabel(d: Date): string {
	return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
