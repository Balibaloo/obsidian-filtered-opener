import { Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, PNOSettingTab, SettingsPNO } from './settings';
import { NotePicker, pickers } from "./pickers"

export default class PnOPlugin extends Plugin {
	settings: SettingsPNO;

	pickers: NotePicker[] = pickers;

	async onload() {
		await this.loadSettings();

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'open-project-note-picker',
			name: 'Open Project Note Picker',
			callback: () => {
				const filteredFiles: TFile[] = filterFileList(this.settings, this.app.vault.getFiles());
				
				const activeFileSiblings = this.app.workspace.getActiveFile()?.parent.children;
				if (activeFileSiblings && activeFileSiblings[0]){
					const activeProjectNotes = filterFileList( this.settings, activeFileSiblings.filter(f => f instanceof TFile) as TFile[]);
					
					if (activeProjectNotes[0])
						filteredFiles.unshift(activeProjectNotes[0]);
				}
				
				this.pickers[this.settings.pickerIndex].pick(this.app, filteredFiles,
					file=>{
						this.app.workspace.getLeaf(true).openFile(file);
				});
				
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PNOSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function filterFileList(settings:SettingsPNO, list:TFile[]):TFile[]{
	if (settings.includePNPath){
		if (settings.includePNPathIsRegex){
			list = list.filter(f => f.path.match(settings.includePNPath))
		} else {
			list = list.filter(f => f.path.includes(settings.includePNPath))
		}
	}
	
	if (settings.includePNFileName){
		if (settings.includePNFileNameIsRegex){
			list = list.filter(f => f.name.match(settings.includePNFileName))
		} else {
			list = list.filter(f => f.name.includes(settings.includePNFileName))
		}
	}

	if (settings.excludePNPath){
		if (settings.excludePNPathIsRegex){
			list = list.filter(f => !f.path.match(settings.excludePNPath))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePNPath))
		}
	}
	
	if (settings.excludePNFileName){
		if (settings.excludePNFileNameIsRegex){
			list = list.filter(f => !f.name.match(settings.excludePNFileName))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludePNFileName))
		}
	}

	return list;
}