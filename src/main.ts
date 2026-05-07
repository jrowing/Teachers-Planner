import { Plugin, WorkspaceLeaf } from 'obsidian';
import { CalendarView, VIEW_TYPE_CALENDAR } from './views/calendarView';
import { EntryStore } from './helpers/entryStore';
import { TeachersPlannerSettingTab } from './settingsTab';
import { PluginSettings, DEFAULT_SETTINGS } from './types';

export default class TeachersPlannerPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;
	store!: EntryStore;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.store = new EntryStore(this.app, this.settings);

		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) => new CalendarView(leaf, this)
		);

		this.addRibbonIcon('calendar-days', 'Teacher\'s Planner', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-planner',
			name: 'Open planner',
			callback: () => this.activateView(),
		});

		this.addSettingTab(new TeachersPlannerSettingTab(this.app, this));

		// Wait until layout is ready before scanning vault and watching changes
		this.app.workspace.onLayoutReady(() => {
			this.store.start();
		});
	}

	async onunload(): Promise<void> {
		this.store?.stop();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.store?.updateSettings(this.settings);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
		}
		workspace.revealLeaf(leaf);
	}
}
