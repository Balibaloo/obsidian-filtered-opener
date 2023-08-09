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
				let projectNotes: TFile[] = this.app.vault.getFiles()
					.filter(f=>f.name.startsWith("🏗")
					&& !f.path.startsWith("🗻"));
				
				this.pickers[this.settings.pickerIndex].pick(this.app, projectNotes,
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