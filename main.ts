import { App, TFolder, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

interface SettingsPNO {
	projectFolderPath: string;
	pickerIndex: number;
}

type NotePicker = {
	name: string;
	description: String;
	pick(notes: TFile[]): TFile;
}

const DEFAULT_SETTINGS: SettingsPNO = {
	projectFolderPath: '/',
	pickerIndex: 0,
}


let flatPicker: NotePicker = {
	name: "flat",
	description: "Display all project notes in the root project folder as \'pathToProjectFolder/projectFolderName\'",
	pick: (notes: TFile[]): TFile => {
		return notes[0];
	}
}

let recursivePicker: NotePicker = {
	name: "recursive",
	description: "Chose a top level folder in the root project folder and then between any subfolders (if necessary)",
	pick: (notes: TFile[]): TFile => {
		return notes[0];
	}
}


export default class MyPlugin extends Plugin {
	settings: SettingsPNO;

	pickers: NotePicker[] = [recursivePicker, flatPicker];

	async onload() {
		await this.loadSettings();

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'open-project-note-picker',
			name: 'Open Project Note Picker',
			callback: () => {
				new ProjectNoteOpenerModal(this.app).open();
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

class ProjectNoteOpenerModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Hello, welcome to the project note opener');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class PNOSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
