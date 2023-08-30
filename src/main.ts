import { Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, FNOSettingTab, SettingsFNO } from './settings';
import { NotePicker, pickers } from "./pickers"

export default class FnOPlugin extends Plugin {
	settings: SettingsFNO;

	pickers: NotePicker[] = pickers;

	api_getNote: () => Promise<TFile>

	async onload() {
		await this.loadSettings();
		this.api_getNote = this.getNote,

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'open-filtered-note-picker',
			name: 'Open Filtered Note Picker',
			callback: async () => {
				const file = await this.getNote();
				this.app.workspace.getLeaf(true).openFile(file);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new FNOSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	public getNote(): Promise<TFile> {
		return new Promise((resolve, reject) => {
			const filteredFiles: TFile[] = filterFileList(this.settings, this.app.vault.getFiles());

			const activeFileSiblings = this.app.workspace.getActiveFile()?.parent.children;
			if (activeFileSiblings && activeFileSiblings[0]) {
				const activeProjectNotes = filterFileList(this.settings, activeFileSiblings.filter(f => f instanceof TFile) as TFile[]);

				if (activeProjectNotes[0])
					filteredFiles.unshift(activeProjectNotes[0]);
			}

			if (filteredFiles.length === 1){
				return resolve(filteredFiles[0]);
			}

			this.pickers[this.settings.pickerIndex].pick(this.app, filteredFiles,
				resolve);

		});
	}
}

function filterFileList(settings:SettingsFNO, list:TFile[]):TFile[]{
	if (settings.includePath){
		if (settings.includePathIsRegex){
			list = list.filter(f => f.path.match(settings.includePath))
		} else {
			list = list.filter(f => f.path.includes(settings.includePath))
		}
	}
	
	if (settings.includeFileName){
		if (settings.includeFileNameIsRegex){
			list = list.filter(f => f.name.match(settings.includeFileName))
		} else {
			list = list.filter(f => f.name.includes(settings.includeFileName))
		}
	}

	if (settings.excludePath){
		if (settings.excludePathIsRegex){
			list = list.filter(f => !f.path.match(settings.excludePath))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePath))
		}
	}
	
	if (settings.excludeFileName){
		if (settings.excludeFileNameIsRegex){
			list = list.filter(f => !f.name.match(settings.excludeFileName))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeFileName))
		}
	}

	return list;
}