import { App, Notice, PluginSettingTab, Setting, TFolder, TextComponent } from "obsidian";
import FnOPlugin from "./main";

export interface SettingsFNO {
	pickerIndex: number;
  includePath: string;
  includePathIsRegex: boolean;
  includeFileName: string;
  includeFileNameIsRegex: boolean;
  excludePath: string;
  excludePathIsRegex: boolean;
  excludeFileName: string;
  excludeFileNameIsRegex: boolean;
}

export const DEFAULT_SETTINGS: SettingsFNO = {
	pickerIndex: 0,
  includePath: "",
  includePathIsRegex: false,
  includeFileName: "",
  includeFileNameIsRegex: false,
  excludePath: "",
  excludePathIsRegex: false,
  excludeFileName: "",
  excludeFileNameIsRegex: false,
}

export class FNOSettingTab extends PluginSettingTab {
	plugin: FnOPlugin;

	constructor(app: App, plugin: FnOPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
    const { containerEl, plugin: { settings } } = this;


		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Filtered Note Opener.' });


		new Setting(containerEl)
			.setName("Picker mode")
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
      .setName("Note Filters")
      .setDesc("Toggles enable regex matching")
      .setHeading()

    const fileNameIncludesSetting = new Setting(containerEl)
      .setName("File name includes")
    this.createRegexText(fileNameIncludesSetting, {
      getValue: () => settings.includeFileName, 
      setValue: v => { settings.includeFileName = v },
      getIsRegex: () => settings.includeFileNameIsRegex, 
      setIsRegex: v => { settings.includeFileNameIsRegex = v }
    }
    )

    const fileNameExcludesSetting = new Setting(containerEl)
      .setName("File name excludes")
    this.createRegexText(fileNameExcludesSetting, {
      getValue: () => settings.excludeFileName, 
      setValue: v => { settings.excludeFileName = v },
      getIsRegex: () => settings.excludeFileNameIsRegex, 
      setIsRegex: v => { settings.excludeFileNameIsRegex = v }
    }
    )

    const pathIncludesSetting = new Setting(containerEl)
      .setName("Path includes")
    this.createRegexText(pathIncludesSetting, {
      getValue: () => settings.includePath, 
      setValue: v => { settings.includePath = v },
      getIsRegex: () => settings.includePathIsRegex, 
      setIsRegex: v => { settings.includePathIsRegex = v }
    }
    )

    const pathExcludesSetting = new Setting(containerEl)
      .setName("Path excludes")  
    this.createRegexText(pathExcludesSetting, {
      getValue: () => settings.excludePath, 
      setValue: v => { settings.excludePath = v },
      getIsRegex: () => settings.excludePathIsRegex, 
      setIsRegex: v => { settings.excludePathIsRegex = v }
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