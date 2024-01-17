import { App, FuzzySuggestModal, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { DEFAULT_NOTE_FILTER_SET, DEFAULT_FOLDER_FILTER_SET, DEFAULT_SETTINGS, FNOSettingTab, SettingsFNO, createFolderFilterSetInputs, createNoteFilterSetInputs, createSettingsFolderFilterSets, createSettingsNoteFilterSets } from './settings';
import { NotePicker, pickers } from "./pickers"
import { FolderFilterSet, NoteFilterSet, FilterSet } from 'src';

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
	api_getFolder: () => Promise<TFolder>;
	api_createSettingsNoteFilterSets: (
		containerEl: HTMLElement,
		filterSets: NoteFilterSet[],
		saveFilterSets: (sets: NoteFilterSet[]) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;
	api_createNoteFilterSetInputs: (
		containerEl: HTMLElement,
		filterSet: NoteFilterSet,
		description: string,
		deletable: boolean,
		renamable: boolean,
		validateSetName: (name: string, notify: boolean) => boolean,
		saveSet: (set: NoteFilterSet|null) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;
	api_createSettingsFolderFilterSets: (
		containerEl: HTMLElement,
		filterSets: FolderFilterSet[],
		saveFilterSets: (sets: FolderFilterSet[]) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;
	api_createFolderFilterSetInputs: (
		containerEl: HTMLElement,
		filterSet: FolderFilterSet,
		description: string,
		deletable: boolean,
		renamable: boolean,
		validateSetName: (name: string, notify: boolean) => boolean,
		saveSet: (set: FolderFilterSet|null) => Promise<void> | void,
		refreshDisplay: () => void,
	) => void;

	async onload() {
		await this.loadSettings();
		this.api_getNote = this.getNote,
			this.api_getFolder = this.getFolder,
		this.api_createSettingsNoteFilterSets = createSettingsNoteFilterSets;
		this.api_createNoteFilterSetInputs = createNoteFilterSetInputs;
		this.api_createSettingsFolderFilterSets = createSettingsFolderFilterSets;
		this.api_createFolderFilterSetInputs = createFolderFilterSetInputs;

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'pick-note',
			name: 'Pick Note',
			callback: async () => {
				if (this.settings.noteFilterSets.length == 0){
					new Notice("Error: no note filter sets defined");
					return;
				}

				const noteFilterSet = this.settings.noteFilterSets.length === 1 
					? this.settings.noteFilterSets[0] 
					: await choseFilterSet(this.settings.noteFilterSets)

				const note = await this.getNote(noteFilterSet);
				this.app.workspace.getLeaf(true).openFile(note);
			},
		});

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'pick-folder',
			name: 'Pick Folder',
			callback: async () => {
				const folder = await this.getFolder();
				console.log(folder);
			},
		});

		this.createFilterSetCommands();

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

	public getNote(noteFilterSet: string | NoteFilterSet = DEFAULT_NOTE_FILTER_SET): Promise<TFile> {
		return new Promise((resolve, reject) => {

			if (typeof noteFilterSet === "string") {
				const noteFilterSetOfName = this.settings.noteFilterSets.find(set => set.name === noteFilterSet);
				if (!noteFilterSetOfName) {
					new Notice(`Error: Note Filter Set "${noteFilterSet}" does not exist`);
					return reject(null);
				}
				noteFilterSet = noteFilterSetOfName;
			}

			const filteredNotes: TFile[] = filterNoteList(noteFilterSet, this.app.vault.getFiles());
			if (filteredNotes.length === 0) {
				new Notice(`Error: No notes match filter set "${noteFilterSet.name}"`);
				return reject(`No notes match filter set "${noteFilterSet.name}"`);
			}
			
			if (filteredNotes.length === 1){
				return resolve(filteredNotes[0]);
			}

			const nearestNotesInSet = getNearestNotesInSet(this.app.workspace.getActiveFile()?.parent || null, noteFilterSet);
			
			for (let note of nearestNotesInSet){
				filteredNotes.remove(note);
				filteredNotes.unshift(note);
			}

			this.pickers[this.settings.pickerIndex].pick(this.app, filteredNotes,
				file => resolve(file));

		});
	}

	public getFolder(rootFolder="/", depth=this.settings.folderSearchDepth, includeRoots=false, 
		folderFilterSet: string | FolderFilterSet = DEFAULT_FOLDER_FILTER_SET): Promise<TFolder> {
		return new Promise((resolve, reject) => {

			if (typeof folderFilterSet === "string") {
				const folderFilterSetOfName = this.settings.folderFilterSets.find(set => set.name === folderFilterSet);
				if (!folderFilterSetOfName) {
					new Notice(`Error: Folder Filter Set "${folderFilterSet}" does not exist`);
					return reject(null);
				}
				folderFilterSet = folderFilterSetOfName;
			}

			// Get list of folders at a depth
			let folders: TFolder[] = [];
			function appendFoldersStartingFrom(folder: TFolder, currentDepth: number) {
				if (includeRoots || currentDepth === depth)
					folders.push(folder);

				// continue traverse if not leaf
				if (currentDepth <= depth) {
					(folder.children.filter(f => f instanceof TFolder) as TFolder[])
						.flatMap(child => appendFoldersStartingFrom(child, currentDepth + 1));
				}
			}

			const rootFolderInstance = this.app.vault.getAbstractFileByPath(rootFolder)
			if (!(rootFolderInstance instanceof TFolder)){
				throw new Error(`Root folder ${rootFolder} does not exist`);
			}

			appendFoldersStartingFrom(rootFolderInstance, 0);

			const filteredFolders = filterFolderList(folderFilterSet, folders);

			if (filteredFolders.length === 0) {
				new Notice(`Error: No folders match filter set "${folderFilterSet.name}"`);
				return reject(`No folders match filter set "${folderFilterSet.name}"`);
			}

			if (filteredFolders.length === 1) {
				return resolve(filteredFolders[0]);
			}

			this.pickers[this.settings.pickerIndex]
				.pick(this.app, filteredFolders, folder => resolve(folder));
		})
	}

	createFilterSetCommands() {
		for (let noteSet of this.settings.noteFilterSets){
			const normalizedSetName = noteSet.name.toLowerCase()
          .replaceAll(/[^\w\s]/g,"").replace(/\s+/g,' ').replace(/\s/g,'-');

			this.addCommand({
				id: `open-${normalizedSetName}-note`,
				name: `Open ${noteSet.name} Note`,
				callback: async () => {
					const note = await this.getNote(noteSet);
					this.openNote(note);
				}
			})
		}
	}

	openNote(note:TFile){
		if (!note) return;
		this.app.workspace.getLeaf(true).openFile(note);
	}

}

function getNearestNotesInSet(parent:TFolder|null, noteFilterSet:NoteFilterSet ): TFile[] {
	if (!parent) return [];

	const siblings = parent.children;
	if (siblings && siblings[0]) {
		const filteredSiblings = filterNoteList(noteFilterSet, siblings.filter(f => f instanceof TFile) as TFile[]);
		if (filteredSiblings.length > 0) {
			filteredSiblings.reverse();
			return filteredSiblings;
		}

		return getNearestNotesInSet(parent.parent, noteFilterSet);
	}

	return [];
}


function getRegexIfValid(str:string): null | RegExp {
		const regexPattern = /^\/(.*)\/([gimuy]*)$/;
		const match = str.match(regexPattern);
	
		if (!match) {
			return null;
		}
	
		const [, pattern, flags] = match;
	
		try {
			return new RegExp(pattern, flags);
		} catch(e) {
			return null;
		}
	}

function filterNoteList(settings:NoteFilterSet, list:TFile[]):TFile[]{
	if (settings.includePathName){
		const includePathNameRegExp = getRegexIfValid(settings.includePathName);
		if (includePathNameRegExp){
			list = list.filter(f => f.path.match(includePathNameRegExp))
		} else {
			list = list.filter(f => f.path.includes(settings.includePathName))
		}
	}
	
	if (settings.includeNoteName){
		const includeNoteNameRegExp = getRegexIfValid(settings.includeNoteName);
		console.log(settings.includeNoteName, includeNoteNameRegExp)
		if (includeNoteNameRegExp){
			list = list.filter(f => f.name.match(includeNoteNameRegExp))
		} else {
			list = list.filter(f => f.name.includes(settings.includeNoteName))
		}
	}

	if (settings.excludePathName){
		const excludePathNameRegExp = getRegexIfValid(settings.excludePathName);
		if (excludePathNameRegExp){
			list = list.filter(f => !f.path.match(excludePathNameRegExp))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePathName))
		}
	}
	
	if (settings.excludeNoteName){
		const excludeNoteNameRegExp = getRegexIfValid(settings.excludeNoteName);
		if (excludeNoteNameRegExp){
			list = list.filter(f => !f.name.match(settings.excludeNoteName))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeNoteName))
		}
	}

	return list;
}

function filterFolderList(settings: FolderFilterSet, list: TFolder[]): TFolder[] {
	if (settings.includePathName){
		const includePathNameRegExp = getRegexIfValid(settings.includePathName);
		if (includePathNameRegExp){
			list = list.filter(f => f.path.match(includePathNameRegExp))
		} else {
			list = list.filter(f => f.path.includes(settings.includePathName))
		}
	}
	
	if (settings.includeFolderName){
		const includeFolderNameRegExp = getRegexIfValid(settings.includeFolderName);
		if (includeFolderNameRegExp){
			list = list.filter(f => f.name.match(includeFolderNameRegExp))
		} else {
			list = list.filter(f => f.name.includes(settings.includeFolderName))
		}
	}

	if (settings.excludePathName){
		const excludePathNameRegExp = getRegexIfValid(settings.excludePathName);
		if (excludePathNameRegExp){
			list = list.filter(f => !f.path.match(excludePathNameRegExp))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePathName))
		}
	}
	
	if (settings.excludeFolderName){
		const excludeFolderNameRegExp = getRegexIfValid(settings.excludeFolderName);
		if (excludeFolderNameRegExp){
			list = list.filter(f => !f.name.match(excludeFolderNameRegExp))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeFolderName))
		}
	}

	return list;
}