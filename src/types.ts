import { TFile } from 'obsidian';

export interface Entry {
	id: string;          // file path, used as stable key
	file: TFile;
	title: string;
	date: Date;
	endDate: Date | null;
	hasTime: boolean;
	tags: string[];
	body: string;                // body without ## Requirements section
	bodyFull: string;            // body including the requirements section
	requirements: string[];
	frontMatter: Record<string, string>;
	mtime: number;
}

export type ViewMode = 'month' | 'week' | 'timeline';
export type RequirementsMode = 'aggregated' | 'breakdown';

export interface PluginSettings {
	folderPath: string;          // empty = whole vault
	weekStartsOn: 0 | 1;         // 0 = Sunday, 1 = Monday
	weekStartHour: number;       // 7
	weekEndHour: number;         // 17
	defaultDurationMinutes: number;
	dateFieldNames: string[];    // tried in order: date, created, published
	requirementsHeadings: string[];
}

export const DEFAULT_SETTINGS: PluginSettings = {
	folderPath: '',
	weekStartsOn: 1,
	weekStartHour: 7,
	weekEndHour: 17,
	defaultDurationMinutes: 30,
	dateFieldNames: ['date', 'created', 'published'],
	requirementsHeadings: ['requirements', 'requires', 'needs', 'materials', 'equipment'],
};
