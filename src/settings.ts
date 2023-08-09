import { App, Notice, PluginSettingTab, Setting, TFolder } from "obsidian";
import PnOPlugin from "./main";

export interface SettingsPNO {
	projectFolderPath: string;
	pickerIndex: number;
}

export const DEFAULT_SETTINGS: SettingsPNO = {
	projectFolderPath: '/',
	pickerIndex: 0,
}

export class PNOSettingTab extends PluginSettingTab {
	plugin: PnOPlugin;

	constructor(app: App, plugin: PnOPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Project Note Opener.' });

		new Setting(containerEl)
			.setName('Root Project Folder Path')
			.setDesc('The path to the folder which contains your projects')
			.addText(text => text
				.setPlaceholder('Please enter a path')
				.setValue(this.plugin.settings.projectFolderPath)
				.onChange(async (value) => {
					let folder = this.app.vault.getAbstractFileByPath(value);
					if (folder && folder instanceof TFolder) {
						console.log('New Project Folder Path: ' + value);
						this.plugin.settings.projectFolderPath = value;
						text.inputEl.removeClasses(["opn_error"])
						new Notice("Saved Project Folder Path")
					} else {
						text.inputEl.addClasses(["opn_error"])
					}

					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName("Project picker mode")
			.setDesc("Picker types: " + this.plugin.pickers.map(p => `${p.name}: ${p.description}`).join(", "))
			.addDropdown(dropdown => {
				// add populate dropdown options
				this.plugin.pickers.forEach((picker, index) => {
					dropdown.addOption(index.toString(), picker.name)
				});

				// select current picker
				dropdown.setValue(this.plugin.settings.pickerIndex.toString())

				// change selected picker on change
				dropdown.onChange(async (pickerIndexString) => {
					let chosenPickerIndex: number = parseInt(pickerIndexString)
					console.log("New picker mode", this.plugin.pickers[chosenPickerIndex].name);
					this.plugin.settings.pickerIndex = chosenPickerIndex;
				})
			});
	}
}