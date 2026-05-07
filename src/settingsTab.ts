import { App, PluginSettingTab, Setting } from 'obsidian';
import TeachersPlannerPlugin from './main';

export class TeachersPlannerSettingTab extends PluginSettingTab {
	plugin: TeachersPlannerPlugin;

	constructor(app: App, plugin: TeachersPlannerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Source folder')
			.setDesc('Folder containing markdown files to show on the calendar. Leave empty to scan the whole vault.')
			.addText(t => t
				.setPlaceholder('e.g. Calendar')
				.setValue(this.plugin.settings.folderPath)
				.onChange(async v => {
					this.plugin.settings.folderPath = v.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Week starts on')
			.addDropdown(d => d
				.addOption('1', 'Monday')
				.addOption('0', 'Sunday')
				.setValue(String(this.plugin.settings.weekStartsOn))
				.onChange(async v => {
					this.plugin.settings.weekStartsOn = parseInt(v) as 0 | 1;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Week view start hour')
			.setDesc('Hour where the week-view time grid begins (0–23). Default 7.')
			.addText(t => t
				.setValue(String(this.plugin.settings.weekStartHour))
				.onChange(async v => {
					const n = parseInt(v);
					if (!isNaN(n) && n >= 0 && n <= 23) {
						this.plugin.settings.weekStartHour = n;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Week view end hour')
			.setDesc('Hour where the week-view time grid ends (1–24). Default 17.')
			.addText(t => t
				.setValue(String(this.plugin.settings.weekEndHour))
				.onChange(async v => {
					const n = parseInt(v);
					if (!isNaN(n) && n >= 1 && n <= 24) {
						this.plugin.settings.weekEndHour = n;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Default duration')
			.setDesc('Default block height (in minutes) for entries without an explicit end time.')
			.addText(t => t
				.setValue(String(this.plugin.settings.defaultDurationMinutes))
				.onChange(async v => {
					const n = parseInt(v);
					if (!isNaN(n) && n > 0) {
						this.plugin.settings.defaultDurationMinutes = n;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Date front-matter fields')
			.setDesc('Comma-separated list of front-matter keys to use as the entry\'s date, in order of preference.')
			.addText(t => t
				.setValue(this.plugin.settings.dateFieldNames.join(', '))
				.onChange(async v => {
					this.plugin.settings.dateFieldNames = v.split(',').map(s => s.trim()).filter(Boolean);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Requirements headings')
			.setDesc('Comma-separated list of body headings to treat as the requirements section.')
			.addText(t => t
				.setValue(this.plugin.settings.requirementsHeadings.join(', '))
				.onChange(async v => {
					this.plugin.settings.requirementsHeadings = v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
					await this.plugin.saveSettings();
				}));
	}
}
