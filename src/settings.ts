import { App, Notice, PluginSettingTab, Setting, TFolder, TextComponent } from "obsidian";
import PnOPlugin from "./main";

export interface SettingsPNO {
	projectFolderPath: string;
	pickerIndex: number;
  includePNPath: string;
  includePNPathIsRegex: boolean;
  includePNFileName: string;
  includePNFileNameIsRegex: boolean;
  excludePNPath: string;
  excludePNPathIsRegex: boolean;
  excludePNFileName: string;
  excludePNFileNameIsRegex: boolean;
}

export const DEFAULT_SETTINGS: SettingsPNO = {
	projectFolderPath: '/',
	pickerIndex: 0,
  includePNPath: "",
  includePNPathIsRegex: false,
  includePNFileName: "",
  includePNFileNameIsRegex: false,
  excludePNPath: "",
  excludePNPathIsRegex: false,
  excludePNFileName: "",
  excludePNFileNameIsRegex: false,
}

export class PNOSettingTab extends PluginSettingTab {
	plugin: PnOPlugin;

	constructor(app: App, plugin: PnOPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
    const { containerEl, plugin: { settings } } = this;


		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Project Note Opener.' });

		new Setting(containerEl)
			.setName('Root Project Folder Path')
			.setDesc('The path to the folder which contains your projects')
			.addText(text => text
				.setPlaceholder('Please enter a path')
        .setValue(settings.projectFolderPath)
				.onChange(async (value) => {
					let folder = this.app.vault.getAbstractFileByPath(value);
					if (folder && folder instanceof TFolder) {
						console.log('New Project Folder Path: ' + value);
            settings.projectFolderPath = value;
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
        dropdown.setValue(settings.pickerIndex.toString())

				// change selected picker on change
				dropdown.onChange(async (pickerIndexString) => {
					let chosenPickerIndex: number = parseInt(pickerIndexString)
					console.log("New picker mode", this.plugin.pickers[chosenPickerIndex].name);
          settings.pickerIndex = chosenPickerIndex;
          await this.plugin.saveSettings();
				})
			});

    new Setting(containerEl)
      .setName("Project Note Matching")
      .setDesc("Toggles enable regex matching")
      .setHeading()

    new Setting(containerEl)
      .setName("Path includes")
      .addText(text => {
        text.setValue(settings.includePNPath)
          .setPlaceholder(settings.includePNPathIsRegex ? "regex" : "Text includes")
          .setValue(settings.includePNPath)
          .onChange(async v => {
            if (settings.includePNPathIsRegex && v !== "" && !isValidRegex(v)) {
              text.inputEl.addClasses(["opn_error"]);

            } else {
              settings.includePNPath = v;
              text.inputEl.removeClasses(["opn_error"]);
              new Notice("Saved");
            }
            await this.plugin.saveSettings();
          })
      })
      .addToggle(toggle => {
        toggle.setTooltip("Use Regex expression")
          .setValue(settings.includePNPathIsRegex)
          .onChange(async v => {
            settings.includePNPathIsRegex = v;
            await this.plugin.saveSettings();
          }) // todo check text
      })

    new Setting(containerEl)
      .setName("File name includes")
      .addText(text => {
        text.setValue(settings.includePNFileName)
          .setPlaceholder(settings.includePNFileNameIsRegex ? "regex" : "Text includes")
          .setValue(settings.includePNFileName)
          .onChange(async v => {
            if (settings.includePNFileNameIsRegex && v !== "" && !isValidRegex(v)) {
              text.inputEl.addClasses(["opn_error"]);

            } else {
              settings.includePNFileName = v;
              text.inputEl.removeClasses(["opn_error"]);
              new Notice("Saved");
            }
            await this.plugin.saveSettings();
          })
      })
      .addToggle(toggle => {
        toggle.setTooltip("Use Regex expression")
          .setValue(settings.includePNFileNameIsRegex)
          .onChange(async v => {
            settings.includePNFileNameIsRegex = v
            await this.plugin.saveSettings();}) // todo check text
      })

    new Setting(containerEl)
      .setName("Path excludes")
      .addText(text => {
        text.setValue(settings.excludePNPath)
          .setPlaceholder(settings.excludePNPathIsRegex ? "regex" : "Text excludes")
          .setValue(settings.excludePNPath)
          .onChange(async v => {
            if (settings.excludePNPathIsRegex && v !== "" && !isValidRegex(v)) {
              text.inputEl.addClasses(["opn_error"]);

            } else {
              settings.excludePNPath = v;
              text.inputEl.removeClasses(["opn_error"]);
              await this.plugin.saveSettings();
              new Notice("Saved");
            }
          })
      })
      .addToggle(toggle => {
        toggle.setTooltip("Use Regex expression")
          .setValue(settings.excludePNPathIsRegex)
          .onChange(async v => {settings.excludePNPathIsRegex = v;
            await this.plugin.saveSettings();}) // todo check text
      })

    new Setting(containerEl)
      .setName("File name excludes")
      .addText(text => {
        text.setValue(settings.excludePNFileName)
          .setPlaceholder(settings.excludePNFileNameIsRegex ? "regex" : "Text excludes")
          .setValue(settings.excludePNFileName)
          .onChange(async v => {
            if (settings.excludePNFileNameIsRegex && v !== "" && !isValidRegex(v)) {
              text.inputEl.addClasses(["opn_error"]);

            } else {
              settings.excludePNFileName = v;
              text.inputEl.removeClasses(["opn_error"]);
              await this.plugin.saveSettings();
              new Notice("Saved");
            }
          })
      })
      .addToggle(toggle => {
        toggle.setTooltip("Use Regex expression")
          .setValue(settings.excludePNFileNameIsRegex)
          .onChange(async v => {
            settings.excludePNFileNameIsRegex = v;
            await this.plugin.saveSettings();
          }) // todo check text
      })
  }
}


// https://stackoverflow.com/questions/17250815/how-to-check-if-the-input-string-is-a-valid-regular-expression
function isValidRegex(s: string) {
  try {
    const m = s.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
    return m ? !!new RegExp(m[2], m[3])
      : false;
  } catch (e) {
    return false
  }
}