import { App, Notice, PluginSettingTab, Setting, TFolder, TextComponent } from "obsidian";
import FnOPlugin from "./main";
import { DirFilterSet, NoteFilterSet } from "src";
import {BoolInputPrompt, GenericInputPrompt} from "./UI"

export interface SettingsFNO {
  pickerIndex: number;
  dirSearchDepth: number;
  dirSearchIncludeRoots: boolean;
  noteFilterSets: NoteFilterSet[];
  dirFilterSets: DirFilterSet[];
}

export const DEFAULT_NOTE_FILTER_SET: NoteFilterSet = {
  name: "default",
  excludeNoteName: "",
  excludePathName: "",
  includeNoteName: "",
  includePathName: "",
}

export const DEFAULT_FOLDER_FILTER_SET: DirFilterSet = {
  name: "default",
  excludeDirName: "",
  excludePathName: "",
  includeDirName: "",
  includePathName: "",
}

export const DEFAULT_SETTINGS: SettingsFNO = {
  pickerIndex: 0,
  dirSearchDepth: 1,
  dirSearchIncludeRoots: true,
  noteFilterSets: [DEFAULT_NOTE_FILTER_SET],
  dirFilterSets: [],
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
      .setName("Picker Settings")
      .setHeading()

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
      .setName("Note filter sets")
      .setHeading()
      .setDesc(`Add, rename and delete filter sets here`)
    
    createSettingsNoteFilterSets(containerEl, this.plugin.settings.noteFilterSets, async sets => {
      this.plugin.settings.noteFilterSets = sets;
      await this.plugin.saveSettings();
    }, () => {
      this.hide();
      this.display();
    })

    new Setting(containerEl)
      .setName("Folder Settings")
      .setHeading()

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
      .setName("Folder filter sets")
      .setHeading()
      .setDesc(`Add, rename and delete filter sets here`)
    createSettingsDirFilterSets(containerEl, this.plugin.settings.dirFilterSets, async sets => {
      this.plugin.settings.dirFilterSets = sets;
      await this.plugin.saveSettings();
    }, () => {
      this.hide();
      this.display();
    })

  }
}

export function addFilterSetHeader(
  containerEl: HTMLElement,
  header: string,
  description = "",
  deletable = true,
  renamable = true,
  saveName:(newName:string)=>Promise<void>| void,
  deleteSet:()=>Promise<void>| void,
  ){
const filterSetHeader = new Setting(containerEl)
  .setName(header).setHeading()
  .setDesc(description);

if (renamable){
  filterSetHeader.addExtraButton(btn => {
    btn.setIcon("pencil").onClick(async () => {
      const newName = await GenericInputPrompt.Prompt(this.app, "Edit Filter Set Name", undefined, header);
      const newNameFormatted = newName.trim()
      if (!newNameFormatted){
        new Notice("Error: Filter Set Name cannot be blank");
        return;
      }
      // TODO unique filter name check
      
      await saveName(newNameFormatted);
    })
  })
}

if (deletable){
  filterSetHeader.addExtraButton(btn => {
    btn.setIcon("trash-2").onClick(async () => {
      if ( await BoolInputPrompt.Prompt(this.app, `Delete ${header}?`)){
        await deleteSet();
      }
    })
  })
}
}


export function createSettingsNoteFilterSets(
  containerEl: HTMLElement,
  filterSets: NoteFilterSet[],
  saveFilterSets: (sets: NoteFilterSet[]) => Promise<void> | void,
  refreshDisplay: () => void,
) {
  filterSets.forEach((filterSet, i) => {
    createNoteFilterSetInputs(containerEl, filterSet, "", true, true, async set => {
      if (!set) {
        filterSets.splice(i, 1);
        await saveFilterSets(filterSets)
        refreshDisplay();
      } else {
        filterSets[i] = set;
        await saveFilterSets(filterSets)
      }
    }, refreshDisplay)
  })

  new Setting(containerEl)
    .addButton(button => {
      button.setButtonText("Add note filter set");
      button.onClick(async e => {
        await saveFilterSets([...filterSets, DEFAULT_NOTE_FILTER_SET]);
        refreshDisplay();
      })
      })
}

export function createNoteFilterSetInputs(
  containerEl: HTMLElement,
  filterSet: NoteFilterSet,
  description = "",
  deletable = true,
  renamable = true,
  saveSet: (set: NoteFilterSet|null) => Promise<void> | void,
  refreshDisplay: () => void,
) {

  addFilterSetHeader(containerEl, filterSet.name, description, deletable, renamable, async name => {
    filterSet.name = name;
    await saveSet(filterSet);
    refreshDisplay();
  }, () => {saveSet(null)})

  new Setting(containerEl)
    .setName("Include PathName")
    .addText(text => {
      text.setValue(filterSet.includePathName)
        .onChange(async v => {
        filterSet.includePathName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude PathName")
    .addText(text => {
      text.setValue(filterSet.excludePathName)
        .onChange(async v => {
          filterSet.excludePathName = v.trim();
          await saveSet(filterSet);
        })
    })

  new Setting(containerEl)
    .setName("Include note name")
    .addText(text => {
      text.setValue(filterSet.includeNoteName)
        .onChange(async v => {
        filterSet.includeNoteName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude note name")
    .addText(text => {
      text.setValue(filterSet.excludeNoteName)
        .onChange(async v => {
          filterSet.excludeNoteName = v.trim();
          await saveSet(filterSet);
        })
    })
}

export function createSettingsDirFilterSets(
  containerEl: HTMLElement,
  filterSets: DirFilterSet[],
  saveFilterSets: (sets: DirFilterSet[]) => Promise<void> | void,
  refreshDisplay: () => void,
) {
  filterSets.forEach((filterSet, i) => {
    createDirFilterSetInputs(containerEl, filterSet, "", true, true, async set => {
      if (!set) {
        filterSets.splice(i, 1);
        await saveFilterSets(filterSets)
        refreshDisplay();
      } else {
        filterSets[i] = set;
        await saveFilterSets(filterSets)
      }
    }, refreshDisplay)
  })

  new Setting(containerEl)
    .addButton(button => {
      button.setButtonText("Add folder filter set");
      button.onClick(async e => {
        await saveFilterSets([...filterSets, DEFAULT_FOLDER_FILTER_SET]);
        refreshDisplay();
      })
      })
}

export function createDirFilterSetInputs(
  containerEl: HTMLElement,
  filterSet: DirFilterSet,
  description = "",
  deletable = true,
  renamable = true,
  saveSet: (set: DirFilterSet|null) => Promise<void> | void,
  refreshDisplay: () => void,
) {

  addFilterSetHeader(containerEl, filterSet.name, description, deletable, renamable, async name => {
    filterSet.name = name;
    await saveSet(filterSet);
    refreshDisplay();
  }, () => {saveSet(null)})

  new Setting(containerEl)
    .setName("Include Folder Name")
    .addText(text => {
      text.setValue(filterSet.includeDirName)
        .onChange(async v => {
        filterSet.includeDirName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude Folder Name")
    .addText(text => {
      text.setValue(filterSet.excludeDirName)
        .onChange(async v => {
        filterSet.excludeDirName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Include PathName")
    .addText(text => {
      text.setValue(filterSet.includePathName)
        .onChange(async v => {
        filterSet.includePathName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude PathName")
    .addText(text => {
      text.setValue(filterSet.excludePathName)
        .onChange(async v => {
        filterSet.excludePathName = v.trim();
        await saveSet(filterSet);
      })
    })
}