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
  dirSearchDepth: number;
  dirSearchIncludeRoots: boolean;
  includeDirPath: string;
  includeDirPathIsRegex: boolean;
  includeDirName: string;
  includeDirNameIsRegex: boolean;
  excludeDirPath: string;
  excludeDirPathIsRegex: boolean;
  excludeDirName: string;
  excludeDirNameIsRegex: boolean;
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
  dirSearchDepth: 1,
  dirSearchIncludeRoots: true,
  includeDirPath: "",
  includeDirPathIsRegex: false,
  includeDirName: "",
  includeDirNameIsRegex: false,
  excludeDirPath: "",
  excludeDirPathIsRegex: false,
  excludeDirName: "",
  excludeDirNameIsRegex: false,
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
      .setName("Note filters")
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

    new Setting(containerEl)
      .setName("Folder picking")
      .setDesc("The depth of folders to search through and if folders at previous depths should be shown")
      .addText(text => {
        text.setValue(this.plugin.settings.dirSearchDepth.toString())
        text.setPlaceholder("depth")
        text.onChange(async v => {
          const depth = parseInt(v);
          if (!depth) {
            new Notice("Error: depth must be an number")
            return;
          }

          this.plugin.settings.dirSearchDepth = depth;
          await this.plugin.saveSettings();
          new Notice("Saved");
        })
      }).addToggle(toggle => {
        toggle.setTooltip("Include folders at previous depths")
        toggle.setValue(this.plugin.settings.dirSearchIncludeRoots)
        toggle.onChange(async v => {
          this.plugin.settings.dirSearchIncludeRoots = v;
          await this.plugin.saveSettings();
        })
      })

    new Setting(containerEl)
      .setName("Directory filters")
      .setDesc("Used by the directory picker")
      .setHeading()

    const dirNameIncludesSetting = new Setting(containerEl)
      .setName("Folder name includes")
    this.createRegexText(dirNameIncludesSetting, {
      getValue: () => settings.includeDirName,
      setValue: v => { settings.includeDirName = v },
      getIsRegex: () => settings.includeDirNameIsRegex,
      setIsRegex: v => { settings.includeDirNameIsRegex = v }
    })

    const dirNameExcludesSetting = new Setting(containerEl)
      .setName("Folder name excludes")
    this.createRegexText(dirNameExcludesSetting, {
      getValue: () => settings.excludeDirName,
      setValue: v => { settings.excludeDirName = v },
      getIsRegex: () => settings.excludeDirNameIsRegex,
      setIsRegex: v => { settings.excludeDirNameIsRegex = v }
    })

    const dirPathIncludesSetting = new Setting(containerEl)
      .setName("Folder path includes")
    this.createRegexText(dirPathIncludesSetting, {
      getValue: () => settings.includeDirPath,
      setValue: v => { settings.includeDirPath = v },
      getIsRegex: () => settings.includeDirPathIsRegex,
      setIsRegex: v => { settings.includeDirPathIsRegex = v }
    })

    const dirPathExcludesSetting = new Setting(containerEl)
      .setName("Folder path excludes")
    this.createRegexText(dirPathExcludesSetting, {
      getValue: () => settings.excludeDirPath,
      setValue: v => { settings.excludeDirPath = v },
      getIsRegex: () => settings.excludeDirPathIsRegex,
      setIsRegex: v => { settings.excludeDirPathIsRegex = v }
    })
  }

  // {value:, isRegex:settings.excludePNFileNameIsRegex}
  createRegexText(textC: Setting,
    values: { getValue(): string, setValue(v: string): void, getIsRegex(): boolean, setIsRegex(b: boolean): void }) {
    textC.addText(text => {
      text.setValue(values.getValue())
        .setPlaceholder(values.getIsRegex() ? "regex" : "text")
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