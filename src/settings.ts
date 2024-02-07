import { App, Notice, PluginSettingTab, Setting, TFolder, TextComponent } from "obsidian";
import FnOPlugin from "./main";
import { FolderFilterSet, NoteFilterSet } from "src";
import {BoolInputPrompt, GenericInputPrompt} from "./UI"

export interface SettingsFNO {
  pickerIndex: number;
  folderSearchDepth: number;
  folderSearchIncludeRoots: boolean;
  noteFilterSets: NoteFilterSet[];
  folderFilterSets: FolderFilterSet[];
}

export const DEFAULT_NOTE_FILTER_SET: NoteFilterSet = {
  name: "default",
  excludeNoteName: "",
  excludePathName: "",
  includeNoteName: "",
  includePathName: "",
}

export const DEFAULT_FOLDER_FILTER_SET: FolderFilterSet = {
  name: "default",
  excludeFolderName: "",
  excludePathName: "",
  includeFolderName: "",
  includePathName: "",
}

export const DEFAULT_SETTINGS: SettingsFNO = {
  pickerIndex: 0,
  folderSearchDepth: 1,
  folderSearchIncludeRoots: true,
  noteFilterSets: [DEFAULT_NOTE_FILTER_SET],
  folderFilterSets: [DEFAULT_FOLDER_FILTER_SET],
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
      .setName("Picker settings")
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
      this.plugin.createFilterSetCommands();
      this.display();
    })

    new Setting(containerEl)
      .setName("Folder settings")
      .setHeading()

    new Setting(containerEl)
      .setName("Folder picking")
      .setDesc("The depth of folders to search through and if folders at previous depths should be shown")
      .addText(text => {
        text.setValue(this.plugin.settings.folderSearchDepth.toString())
        text.setPlaceholder("depth")
        text.onChange(async v => {
          const depth = parseInt(v);
          if (!depth) {
            new Notice("Error: depth must be an number")
            return;
          }

          this.plugin.settings.folderSearchDepth = depth;
          await this.plugin.saveSettings();
          new Notice("Saved");
        })
      }).addToggle(toggle => {
        toggle.setTooltip("Include folders at previous depths")
        toggle.setValue(this.plugin.settings.folderSearchIncludeRoots)
        toggle.onChange(async v => {
          this.plugin.settings.folderSearchIncludeRoots = v;
          await this.plugin.saveSettings();
        })
      })
    
    new Setting(containerEl)
      .setName("Folder filter sets")
      .setHeading()
      .setDesc(`Add, rename and delete filter sets here`)
    createSettingsFolderFilterSets(containerEl, this.plugin.settings.folderFilterSets, async sets => {
      this.plugin.settings.folderFilterSets = sets;
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
  validateSetName: (name:string, notify:boolean)=>boolean,
  saveName:(newName:string)=>Promise<void>| void,
  deleteSet:()=>Promise<void>| void,
  ){
const filterSetHeader = new Setting(containerEl)
  .setName(header).setHeading()
  .setDesc(description);

if (renamable){
  filterSetHeader.addExtraButton(btn => {
    btn.setIcon("pencil").onClick(async () => {
      const newName = await GenericInputPrompt.Prompt(this.app, "New filter set name", undefined, header, true, validateSetName);

      const newNameFormatted = newName.trim()
      if (!newNameFormatted) {
        new Notice("Error: Filter Set Name cannot be blank");
        return;
      }
      
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
    createNoteFilterSetInputs(containerEl, filterSet, "", true, true, (text, notify) => {
      const nameNotChanged = text === filterSet.name;
      if (nameNotChanged) return true;

      const nameUnique = !filterSets.some(set => set.name === text.trim());
      const nameHasCharacters = text.trim().length > 0;

      if (!nameUnique && notify)
        new Notice("Error: Filter Set Name must be unique");

      if (!nameHasCharacters && notify)
        new Notice("Error: Filter Set Name cannot be blank");

      return nameUnique && nameHasCharacters;
    }, async set => {
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
        const newSetName = await GenericInputPrompt.Prompt(this.app, "New filter set name", undefined, undefined, true, (text, notify) => {
          const nameUnique = !filterSets.some(set => set.name === text.trim());
          if (!nameUnique && notify)
          new Notice("Error: Filter Set Name must be unique");
          
          const nameHasCharacters = text.trim().length > 0;
          if (!nameHasCharacters && notify)
            new Notice("Error: Filter Set Name cannot be blank");

          return nameUnique && nameHasCharacters;
        });

        const newNameFormatted = newSetName.trim()
        if (!newNameFormatted) {
          new Notice("Error: Filter Set Name cannot be blank");
          return;
        }

        const newFilterSet: NoteFilterSet = {
          ...DEFAULT_NOTE_FILTER_SET,
          name: newNameFormatted
        };

        await saveFilterSets([...filterSets, newFilterSet]);
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
  validateSetName: (name:string, notify:boolean)=>boolean,
  saveSet: (set: NoteFilterSet|null) => Promise<void> | void,
  refreshDisplay: () => void,
) {

  addFilterSetHeader(containerEl, filterSet.name, description, deletable, renamable, validateSetName, async name => {
    filterSet.name = name;
    await saveSet(filterSet);
    refreshDisplay();
  }, () => {saveSet(null)})

  new Setting(containerEl)
    .setName("Include path name")
    .addText(text => {
      text.setValue(filterSet.includePathName)
        .onChange(async v => {
        filterSet.includePathName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude path name")
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

export function createSettingsFolderFilterSets(
  containerEl: HTMLElement,
  filterSets: FolderFilterSet[],
  saveFilterSets: (sets: FolderFilterSet[]) => Promise<void> | void,
  refreshDisplay: () => void,
) {
  filterSets.forEach((filterSet, i) => {
    createFolderFilterSetInputs(containerEl, filterSet, "", true, true, (text, notify) => {
      const nameUnique = !filterSets.some(set => set.name === text.trim());
      if (!nameUnique && notify)
        new Notice("Error: Filter Set Name must be unique");
        
      const nameHasCharacters = text.trim().length > 0;
      if (!nameHasCharacters && notify)
        new Notice("Error: Filter Set Name cannot be blank");

      return nameUnique && nameHasCharacters;
    }, async set => {
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
        const newSetName = await GenericInputPrompt.Prompt(this.app, "New filter set name", undefined, undefined, true, (text, notify) => {
          const nameHasCharacters = text.trim().length > 0;
          if (!nameHasCharacters && notify)
            new Notice("Error: Filter Set Name cannot be blank");

          return nameHasCharacters;
        });

        const newNameFormatted = newSetName.trim()
        if (!newNameFormatted) {
          new Notice("Error: Filter Set Name cannot be blank");
          return;
        }

        const newFilterSet: FolderFilterSet = {
          ...DEFAULT_FOLDER_FILTER_SET,
          name: newNameFormatted
        };

        await saveFilterSets([...filterSets, newFilterSet]);
        refreshDisplay();
      })
      })
}

export function createFolderFilterSetInputs(
  containerEl: HTMLElement,
  filterSet: FolderFilterSet,
  description = "",
  deletable = true,
  renamable = true,
  validateSetName: (name:string, notify:boolean)=>boolean,
  saveSet: (set: FolderFilterSet|null) => Promise<void> | void,
  refreshDisplay: () => void,
) {

  addFilterSetHeader(containerEl, filterSet.name, description, deletable, renamable, validateSetName, async name => {
    filterSet.name = name;
    await saveSet(filterSet);
    refreshDisplay();
  }, () => {saveSet(null)})

  new Setting(containerEl)
    .setName("Include folder name")
    .addText(text => {
      text.setValue(filterSet.includeFolderName)
        .onChange(async v => {
        filterSet.includeFolderName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude folder name")
    .addText(text => {
      text.setValue(filterSet.excludeFolderName)
        .onChange(async v => {
        filterSet.excludeFolderName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Include path name")
    .addText(text => {
      text.setValue(filterSet.includePathName)
        .onChange(async v => {
        filterSet.includePathName = v.trim();
        await saveSet(filterSet);
      })
    })

  new Setting(containerEl)
    .setName("Exclude path name")
    .addText(text => {
      text.setValue(filterSet.excludePathName)
        .onChange(async v => {
        filterSet.excludePathName = v.trim();
        await saveSet(filterSet);
      })
    })
}