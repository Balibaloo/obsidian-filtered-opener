import { App, TFolder, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface SettingsPNO {
	projectFolderPath: string;
	pickerMode: string;
}

const DEFAULT_SETTINGS: SettingsPNO = {
	projectFolderPath: '/',
	pickerMode: "flat",
}

export default class MyPlugin extends Plugin {
	settings: SettingsPNO;

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah! My plugin!');
	}

	onClose() {
		const {contentEl} = this;
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
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Project Note Opener.'});

		new Setting(containerEl)
			.setName('Root Project Folder Path')
			.setDesc('The path to the folder which contains your projects')
			.addText(text => text
				.setPlaceholder('Please enter a path')
				.setValue(this.plugin.settings.projectFolderPath)
				.onChange(async (value) => {
					let folder = this.app.vault.getAbstractFileByPath(value);
					if ( folder && folder instanceof TFolder ){
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
		.setDesc('Flat: Display all project notes in the root project folder as \'pathToProjectFolder/projectFolderName\'Folder: Chose a top level folder in the root project folder and then between any subfolders (if necessary)')
		.addDropdown(dropdown => dropdown
			.addOption("flat","flat")
			.addOption("folder","folder")
			.setValue(this.plugin.settings.pickerMode)
			.onChange(async (value) => {
				console.log("New picker mode", value);
				this.plugin.settings.pickerMode = value;
			})
		);
	}
}
