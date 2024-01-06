import { App, FuzzySuggestModal, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { DEFAULT_FILE_FILTER_SET, DEFAULT_FOLDER_FILTER_SET, DEFAULT_SETTINGS, FNOSettingTab, SettingsFNO, createDirFilterSetInputs, createFileFilterSetInputs, createSettingsDirFilterSets, createSettingsFileFilterSets } from './settings';
import { NotePicker, pickers } from "./pickers"
import { DirFilterSet, FileFilterSet, FilterSet } from 'src';

class FilterSetSuggestModal<T extends FilterSet> extends FuzzySuggestModal<T> {
	constructor(app: App, items: T[], callback: (item: T) => void) {
		super(app);
		this.items = items;
		this.callback=callback;
	}
	
	items: T[];
	callback: (item: T) => void;

	getItems(): T[] {
		return this.items;
	}

	getItemText(item: T): string {
		return `${item.name}`;
	}
	onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void {
		this.callback(item);
	}
}

export async function choseFilterSet<T extends FilterSet>(FilterSets:T[]):Promise<T> {
  return new Promise((resolve,rejects) => {
    new FilterSetSuggestModal<T>(this.app, FilterSets, resolve).open();
  })
}

export default class FnOPlugin extends Plugin {
	settings: SettingsFNO;

	pickers: NotePicker[] = pickers;

	api_getNote: () => Promise<TFile>
	api_getDir: () => Promise<TFolder>;
	api_createSettingsFileFilterSets: (
		containerEl: HTMLElement,
		filterSets: FileFilterSet[],
		saveFilterSets: (sets: FileFilterSet[]) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;
	api_createFileFilterSetInputs: (
		containerEl: HTMLElement,
		filterSet: FileFilterSet,
		description: string,
		deletable: boolean,
		renamable: boolean,
		saveSet: (set: FileFilterSet|null) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;
	api_createSettingsDirFilterSets: (
		containerEl: HTMLElement,
		filterSets: DirFilterSet[],
		saveFilterSets: (sets: DirFilterSet[]) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;
	api_createDirFilterSetInputs: (
		containerEl: HTMLElement,
		filterSet: DirFilterSet,
		description: string,
		deletable: boolean,
		renamable: boolean,
		saveSet: (set: DirFilterSet|null) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;

	async onload() {
		await this.loadSettings();
		this.api_getNote = this.getNote,
			this.api_getDir = this.getDir,
		this.api_createSettingsFileFilterSets = createSettingsFileFilterSets;
		this.api_createFileFilterSetInputs = createFileFilterSetInputs;
		this.api_createSettingsDirFilterSets = createSettingsDirFilterSets;
		this.api_createDirFilterSetInputs = createDirFilterSetInputs;

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'open-filtered-note-picker',
			name: 'Open Filtered Note Picker',
			callback: async () => {
				if (this.settings.fileFilterSets.length == 0){
					new Notice("Error: no file filter sets defined");
					return;
				}

				const filterSet = this.settings.fileFilterSets.length === 1 
					? this.settings.fileFilterSets[0] 
					: await choseFilterSet(this.settings.fileFilterSets)

				const file = await this.getNote(filterSet);
				this.app.workspace.getLeaf(true).openFile(file);
			},
		});

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'pick-dir',
			name: 'Pick Dir',
			callback: async () => {
				const dir = await this.getDir();
				console.log(dir);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new FNOSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	public getNote(fileFilterSet:FileFilterSet = DEFAULT_FILE_FILTER_SET): Promise<TFile> {
		return new Promise((resolve, reject) => {
			const filteredFiles: TFile[] = filterFileList(fileFilterSet, this.app.vault.getFiles());

			const activeFileSiblings = this.app.workspace.getActiveFile()?.parent.children;
			if (activeFileSiblings && activeFileSiblings[0]) {
				const activeProjectNotes = filterFileList(fileFilterSet, activeFileSiblings.filter(f => f instanceof TFile) as TFile[]);

				if (activeProjectNotes[0]){
					filteredFiles.remove(activeProjectNotes[0]);
					filteredFiles.unshift(activeProjectNotes[0]);
				}
			}

			if (filteredFiles.length === 1){
				return resolve(filteredFiles[0]);
			}

			this.pickers[this.settings.pickerIndex].pick(this.app, filteredFiles,
				file => resolve(file));

		});
	}

	public getDir(rootDir="/", depth=this.settings.dirSearchDepth, includeRoots=false, 
		dirFilterSet:DirFilterSet = DEFAULT_FOLDER_FILTER_SET): Promise<TFolder> {
		return new Promise((resolve, reject) => {

			// Get list of folders at a depth
			let dirs: TFolder[] = [];
			function appendDirsStartingFrom(directory: TFolder, currentDepth: number) {
				if (includeRoots || currentDepth === depth)
					dirs.push(directory);

				// continue traverse if not leaf
				if (currentDepth <= depth) {
					(directory.children.filter(f => f instanceof TFolder) as TFolder[])
						.flatMap(child => appendDirsStartingFrom(child, currentDepth + 1));
				}
			}

			const rootDirInstance = this.app.vault.getAbstractFileByPath(rootDir)
			if (!(rootDirInstance instanceof TFolder))
				return;

			appendDirsStartingFrom(rootDirInstance, 0);

			const filteredDirs = filterDirList(dirFilterSet, dirs);

			if (filteredDirs.length === 1) {
				return resolve(filteredDirs[0]);
			}

			this.pickers[this.settings.pickerIndex]
				.pick(this.app, filteredDirs, dir => resolve(dir));
		})
	}
}

function filterFileList(settings:FileFilterSet, list:TFile[]):TFile[]{
	if (settings.includePathName){
		const includePathNameRegExp = new RegExp(settings.includePathName);
		if (includePathNameRegExp){
			list = list.filter(f => f.path.match(includePathNameRegExp))
		} else {
			list = list.filter(f => f.path.includes(settings.includePathName))
		}
	}
	
	if (settings.includeFileName){
		const includeFileNameRegExp = new RegExp(settings.includeFileName);
		if (includeFileNameRegExp){
			list = list.filter(f => f.name.match(includeFileNameRegExp))
		} else {
			list = list.filter(f => f.name.includes(settings.includeFileName))
		}
	}

	if (settings.excludePathName){
		const excludePathNameRegExp = new RegExp(settings.excludePathName);
		if (excludePathNameRegExp){
			list = list.filter(f => !f.path.match(excludePathNameRegExp))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePathName))
		}
	}
	
	if (settings.excludeFileName){
		const excludeFileNameRegExp = new RegExp(settings.excludeFileName);
		if (excludeFileNameRegExp){
			list = list.filter(f => !f.name.match(settings.excludeFileName))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeFileName))
		}
	}

	return list;
}

function filterDirList(settings: DirFilterSet, list: TFolder[]): TFolder[] {
	if (settings.includePathName){
		const includePathNameRegExp = new RegExp(settings.includePathName);
		if (includePathNameRegExp){
			list = list.filter(f => f.path.match(includePathNameRegExp))
		} else {
			list = list.filter(f => f.path.includes(settings.includePathName))
		}
	}
	
	if (settings.includeDirName){
		const includeDirNameRegExp = new RegExp(settings.includeDirName);
		if (includeDirNameRegExp){
			list = list.filter(f => f.name.match(includeDirNameRegExp))
		} else {
			list = list.filter(f => f.name.includes(settings.includeDirName))
		}
	}

	if (settings.excludePathName){
		const excludePathNameRegExp = new RegExp(settings.excludePathName);
		if (excludePathNameRegExp){
			list = list.filter(f => !f.path.match(excludePathNameRegExp))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePathName))
		}
	}
	
	if (settings.excludeDirName){
		const excludeDirNameRegExp = new RegExp(settings.excludeDirName);
		if (excludeDirNameRegExp){
			list = list.filter(f => !f.name.match(excludeDirNameRegExp))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeDirName))
		}
	}

	return list;
}