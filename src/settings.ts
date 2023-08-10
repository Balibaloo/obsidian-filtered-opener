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

    const fileNameIncludesSetting = new Setting(containerEl)
      .setName("File name includes")
    this.createRegexText(fileNameIncludesSetting, {
      getValue: () => settings.includePNFileName, 
      setValue: v => { settings.includePNFileName = v },
      getIsRegex: () => settings.includePNFileNameIsRegex, 
      setIsRegex: v => { settings.includePNFileNameIsRegex = v }
    }
    )

    const fileNameExcludesSetting = new Setting(containerEl)
      .setName("File name excludes")
    this.createRegexText(fileNameExcludesSetting, {
      getValue: () => settings.excludePNFileName, 
      setValue: v => { settings.excludePNFileName = v },
      getIsRegex: () => settings.excludePNFileNameIsRegex, 
      setIsRegex: v => { settings.excludePNFileNameIsRegex = v }
    }
    )

    const pathIncludesSetting = new Setting(containerEl)
      .setName("Path includes")
    this.createRegexText(pathIncludesSetting, {
      getValue: () => settings.includePNPath, 
      setValue: v => { settings.includePNPath = v },
      getIsRegex: () => settings.includePNPathIsRegex, 
      setIsRegex: v => { settings.includePNPathIsRegex = v }
    }
    )

    const pathExcludesSetting = new Setting(containerEl)
      .setName("Path excludes")  
    this.createRegexText(pathExcludesSetting, {
      getValue: () => settings.excludePNPath, 
      setValue: v => { settings.excludePNPath = v },
      getIsRegex: () => settings.excludePNPathIsRegex, 
      setIsRegex: v => { settings.excludePNPathIsRegex = v }
    }
    )
  }

  // {value:, isRegex:settings.excludePNFileNameIsRegex}
  createRegexText(textC: Setting,
    values: { getValue(): string, setValue(v: string): void, getIsRegex(): boolean, setIsRegex(b: boolean): void }) {
    textC.addText(text => {
      text.setValue(values.getValue())
        .setPlaceholder(values.getIsRegex() ? "regex" : "Text excludes")
        .setValue(values.getValue())
        .onChange(async v => {
          if (values.getIsRegex() && v !== "" && !isValidRegex(v)) {
            text.inputEl.addClasses(["opn_error"]);

          } else {
            values.setValue(v);
            text.inputEl.removeClasses(["opn_error"]);
            await this.plugin.saveSettings();
            new Notice("Saved");
          }
        })
    })
      .addToggle(toggle => {
        toggle.setTooltip("Use Regex expression")
        .setValue(values.getIsRegex())
        .onChange(async v => {
          values.setIsRegex(v);
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