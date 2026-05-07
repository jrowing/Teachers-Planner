import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { Entry, ViewMode, RequirementsMode } from '../types';
import { EntryStore } from '../helpers/entryStore';
import { renderMonth } from './monthView';
import { renderWeek } from './weekView';
import { renderTimeline } from './timelineView';
import { renderRequirementsPanel } from './requirementsPanel';
import { renderDetailPanel } from './detailPanel';
import { startOfDay, startOfWeek, isSameMonth } from '../helpers/dateUtil';
import { applyTagColors } from '../helpers/tagColor';
import { NewEntryModal } from '../modals/newEntryModal';
import TeachersPlannerPlugin from '../main';

export const VIEW_TYPE_CALENDAR = 'teachers-planner-view';

export class CalendarView extends ItemView {
	plugin: TeachersPlannerPlugin;
	store: EntryStore;

	// View state
	mode: ViewMode = 'month';
	displayedMonth: Date = startOfDay(new Date());
	weekAnchor: Date = new Date();
	requirementsAnchor: Date = new Date();
	selectedDate: Date = startOfDay(new Date());
	filterTag: string | null = null;
	showRequirements: boolean = false;
	requirementsMode: RequirementsMode = 'aggregated';

	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TeachersPlannerPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.store = plugin.store;
	}

	getViewType(): string { return VIEW_TYPE_CALENDAR; }
	getDisplayText(): string { return 'Teacher\'s Planner'; }
	getIcon(): string { return 'calendar-days'; }

	async onOpen(): Promise<void> {
		this.unsubscribe = this.store.subscribe(() => this.render());
		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
	}

	openEntry(entry: Entry): void {
		const leaf = this.app.workspace.getLeaf(false);
		leaf.openFile(entry.file);
	}

	openNewEntryModal(date: Date): void {
		new NewEntryModal(this.app, this.plugin, date).open();
	}

	render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('mdcal-root');

		this.renderToolbar(container);

		const main = container.createDiv({ cls: 'mdcal-main' });

		if (this.showRequirements) {
			const reqPane = main.createDiv({ cls: 'mdcal-req-pane' });
			renderRequirementsPanel(reqPane, this);
		}

		const center = main.createDiv({ cls: 'mdcal-center' });
		switch (this.mode) {
			case 'month': renderMonth(center, this); break;
			case 'week': renderWeek(center, this); break;
			case 'timeline': renderTimeline(center, this); break;
		}

		const detail = main.createDiv({ cls: 'mdcal-detail-pane' });
		renderDetailPanel(detail, this);
	}

	private renderToolbar(parent: HTMLElement): void {
		const tb = parent.createDiv({ cls: 'mdcal-toolbar' });

		// View toggle
		const seg = tb.createDiv({ cls: 'mdcal-segmented' });
		const modes: { mode: ViewMode; label: string }[] = [
			{ mode: 'month', label: 'Calendar' },
			{ mode: 'week', label: 'Week' },
			{ mode: 'timeline', label: 'Timeline' },
		];
		for (const { mode, label } of modes) {
			const btn = seg.createEl('button', { text: label });
			if (this.mode === mode) btn.addClass('is-active');
			btn.addEventListener('click', () => {
				this.mode = mode;
				this.render();
			});
		}

		// Tag filter dropdown
		const tags = this.store.allTagsWithCounts();
		if (tags.length > 0) {
			const select = tb.createEl('select', { cls: 'mdcal-tag-filter' });
			select.createEl('option', { text: 'All entries', value: '' });
			for (const { tag, count } of tags) {
				const opt = select.createEl('option', { text: `${tag} (${count})`, value: tag });
				if (this.filterTag === tag) opt.selected = true;
			}
			select.addEventListener('change', () => {
				this.filterTag = select.value || null;
				this.render();
			});
		}

		// Requirements toggle
		const reqBtn = tb.createEl('button', { text: 'Requirements' });
		if (this.showRequirements) reqBtn.addClass('is-active');
		reqBtn.addEventListener('click', () => {
			this.showRequirements = !this.showRequirements;
			this.render();
		});

		// Spacer
		tb.createDiv({ cls: 'mdcal-spacer' });

		// New entry
		const newBtn = tb.createEl('button', { text: '+ New entry', cls: 'mod-cta' });
		newBtn.addEventListener('click', () => {
			this.openNewEntryModal(this.selectedDate);
		});
	}

	// Helpers used by sub-views

	getFilteredEntries(): Entry[] {
		const all = this.store.getAll();
		if (this.filterTag) return all.filter(e => e.tags.includes(this.filterTag!));
		return all;
	}

	getEntriesOnDay(day: Date): Entry[] {
		const filtered = this.store.getOnDay(day);
		if (this.filterTag) return filtered.filter(e => e.tags.includes(this.filterTag!));
		return filtered;
	}

	selectDay(d: Date): void {
		this.selectedDate = startOfDay(d);
		if (!isSameMonth(this.selectedDate, this.displayedMonth)) {
			this.displayedMonth = new Date(this.selectedDate);
		}
		this.render();
	}

	makeTagPill(parent: HTMLElement, tag: string, opts: { active?: boolean; clickable?: boolean } = {}): HTMLElement {
		const span = parent.createSpan({ cls: 'mdcal-tag', text: tag });
		applyTagColors(span, tag, { active: opts.active });
		if (opts.clickable) {
			span.addClass('mdcal-clickable');
			span.addEventListener('click', (e) => {
				e.stopPropagation();
				this.filterTag = this.filterTag === tag ? null : tag;
				this.render();
			});
		}
		return span;
	}
}
