import { App, FuzzySuggestModal, Notice, Plugin, PluginManifest, SuggestModal, TFile, TFolder, getAllTags } from 'obsidian';
import { DEFAULT_NOTE_FILTER_SET, DEFAULT_FOLDER_FILTER_SET, DEFAULT_SETTINGS, FNOSettingTab, SettingsFNO, createFolderFilterSetInputs, createNoteFilterSetInputs, createSettingsFolderFilterSets, createSettingsNoteFilterSets, makeNewFilterSet, validateFilterSetName } from './settings';
import { NotePicker, PickerName, pickers } from "./pickers"
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

	pickers: NotePicker[] = [...pickers];

	api_getNote: () => Promise<TFile>
	api_getFolder: () => Promise<TFolder>;
	api_makeNewNoteFilterSet: () => Promise<void | String>;
	api_makeNewFolderFilterSet: () => Promise<void | String>;
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
	api_exposeSettingsNoteFilterSets: (
		containerEl: HTMLElement,
		refreshDisplay: () => void,
	) => void;
	api_exposeNoteFilterSetInputs: (
		containerEl: HTMLElement,
		filterSet: string,
		description: string,
		deletable: boolean,
		renamable: boolean,
		refreshDisplay: () => void,
	) => void;
	api_exposeSettingsFolderFilterSets: (
		containerEl: HTMLElement,
		refreshDisplay: () => void,
	) => void;
	api_exposeFolderFilterSetInputs: (
		containerEl: HTMLElement,
		filterSet: string,
		description: string,
		deletable: boolean,
		renamable: boolean,
		refreshDisplay: () => void,
	) => void;
	api_getListOfNoteFilterSets: () => NoteFilterSet[];
	api_getListOfFolderFilterSets: () => FolderFilterSet[];

	async onload() {
		await this.loadSettings();
		this.api_getNote = this.getNote,
		this.api_getFolder = this.getFolder,
		this.api_makeNewNoteFilterSet = this.makeNewNoteFilterSet,
		this.api_makeNewFolderFilterSet = this.makeNewFolderFilterSet,
		
		this.api_createSettingsNoteFilterSets = createSettingsNoteFilterSets;
		this.api_createNoteFilterSetInputs = createNoteFilterSetInputs;
		this.api_createSettingsFolderFilterSets = createSettingsFolderFilterSets;
		this.api_createFolderFilterSetInputs = createFolderFilterSetInputs;

		this.api_exposeSettingsNoteFilterSets = this.exposeSettingsNoteFilterSets;
		this.api_exposeNoteFilterSetInputs = this.exposeNoteFilterSetInputs;
		this.api_exposeSettingsFolderFilterSets = this.exposeSettingsFolderFilterSets;
		this.api_exposeFolderFilterSetInputs = this.exposeFolderFilterSetInputs;

		this.api_getListOfNoteFilterSets = (() => this.settings.noteFilterSets);
		this.api_getListOfFolderFilterSets = (() => this.settings.folderFilterSets);

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'pick-note',
			name: 'Pick note',
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
			name: 'Pick folder',
			callback: async () => {
				if (this.settings.folderFilterSets.length == 0){
					new Notice("Error: no folder filter sets defined");
					return;
				}

				const folderFilterSet = this.settings.folderFilterSets.length === 1 
					? this.settings.folderFilterSets[0] 
					: await choseFilterSet(this.settings.folderFilterSets)

				const folder = await this.getFolder(folderFilterSet);
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

	public getNote(noteFilterSet: string | NoteFilterSet = DEFAULT_NOTE_FILTER_SET, pickerName: PickerName=""): Promise<TFile> {
		return new Promise((resolve, reject) => {
			// Get filter set name or default
			const filterSetName = typeof noteFilterSet === "string" 
				? noteFilterSet || DEFAULT_NOTE_FILTER_SET.name
				: noteFilterSet.name || DEFAULT_NOTE_FILTER_SET.name

			// Lookup filter set by name
			const filterSetList = [ ...this.settings.noteFilterSets, DEFAULT_NOTE_FILTER_SET ];
			const filterSetFromSettings = Object.assign({}, filterSetList.find(set => set.name === filterSetName) );
			if ( !filterSetFromSettings ) {
				new Notice(`Error: Note Filter Set "${filterSetName}" does not exist`);
				return reject(null);
			}
			
			// Apply values passed alongside filter set name
			if (typeof noteFilterSet === "object"){
				let inputFilterSetHasAdditionalProps = false;

				for (const key of Object.keys( filterSetFromSettings ) as (keyof NoteFilterSet)[]) {
					if ( noteFilterSet[ key ] ){
						filterSetFromSettings[ key ] = noteFilterSet[ key ];

						inputFilterSetHasAdditionalProps = key !== "name";
					}
				}

				if (inputFilterSetHasAdditionalProps)
					filterSetFromSettings.name += "+"
			}
			
			const filteredNotes: TFile[] = filterNoteList(filterSetFromSettings, this.app.vault.getFiles());
			if (filteredNotes.length === 0) {
				new Notice(`Error: No notes match filter set "${filterSetFromSettings.name}"`);
				return reject(`No notes match filter set "${filterSetFromSettings.name}"`);
			}
			
			if (filteredNotes.length === 1){
				return resolve(filteredNotes[0]);
			}

			const nearestNotesInSet = getNearestNotesInSet(this.app.workspace.getActiveFile()?.parent || null, filterSetFromSettings);
			
			for (let note of nearestNotesInSet){
				filteredNotes.remove(note);
				filteredNotes.unshift(note);
			}

						
			const selectedPicker = this.pickers.find(picker => picker.name === pickerName)
				|| this.pickers[this.settings.pickerIndex];

			selectedPicker.pick(this.app, filteredNotes,file => resolve(file));

		});
	}

	public getFolder(folderFilterSet: string | FolderFilterSet = DEFAULT_FOLDER_FILTER_SET, pickerName:PickerName=""): Promise<TFolder> {
		return new Promise((resolve, reject) => {

			// Get filter set name or default
			const filterSetName = typeof folderFilterSet === "string" 
				? folderFilterSet || DEFAULT_FOLDER_FILTER_SET.name
				: folderFilterSet.name || DEFAULT_FOLDER_FILTER_SET.name

			// Lookup filter set by name
			const filterSetList = [ ...this.settings.folderFilterSets, DEFAULT_FOLDER_FILTER_SET ];
			const filterSetFromSettings = Object.assign({}, filterSetList.find(set => set.name === filterSetName) );
			if ( !filterSetFromSettings ) {
				new Notice(`Error: Folder Filter Set "${filterSetName}" does not exist`);
				return reject(null);
			}

			// Apply values passed alongside filter set name
			if (typeof folderFilterSet === "object"){
				let inputFilterSetHasAdditionalProps = false;

				for (const key of Object.keys( filterSetFromSettings ) as (keyof FolderFilterSet)[]) {
					if ( folderFilterSet[ key ] ){
						(filterSetFromSettings as any)[ key ] = (folderFilterSet as any)[ key ];

						inputFilterSetHasAdditionalProps = key !== "name";
					}
				}

				if (inputFilterSetHasAdditionalProps)
					filterSetFromSettings.name += "+"
			}
			

			const {includeParents, depth, rootFolder} = filterSetFromSettings;

			// Get list of folders at a depth
			let folders: TFolder[] = [];
			function appendFoldersStartingFrom(folder: TFolder, currentDepth: number) {
				if (includeParents || currentDepth === depth)
					folders.push(folder);

				// continue traverse if not leaf
				if (currentDepth <= depth) {
					folder.children.flatMap(f => f instanceof TFolder 
						? appendFoldersStartingFrom(f, currentDepth + 1) 
						: []
					);
				}
			}

			const rootFolderInstance = this.app.vault.getAbstractFileByPath(rootFolder)
			if (!(rootFolderInstance instanceof TFolder)){
				throw new Error(`Root folder ${rootFolder} does not exist`);
			}

			appendFoldersStartingFrom(rootFolderInstance, 0);

			const filteredFolders = filterFolderList(filterSetFromSettings, folders);

			if (filteredFolders.length === 0) {
				new Notice(`Error: No folders match filter set "${filterSetFromSettings.name}"`);
				return reject(`No folders match filter set "${filterSetFromSettings.name}"`);
			}

			if (filteredFolders.length === 1) {
				return resolve(filteredFolders[0]);
			}
			
			const selectedPicker = this.pickers.find(picker => picker.name === pickerName)
				|| this.pickers[this.settings.pickerIndex];

			selectedPicker.pick(this.app, filteredFolders, folder => resolve(folder));
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

	async makeNewNoteFilterSet(){
		return await makeNewFilterSet(
			app,
			DEFAULT_NOTE_FILTER_SET,
			this.settings.noteFilterSets,
			async sets => {
				this.settings.noteFilterSets = sets;
				await this.saveSettings();
			});
		}

	async makeNewFolderFilterSet(){
		return await makeNewFilterSet(
			app,
			DEFAULT_FOLDER_FILTER_SET,
			this.settings.folderFilterSets,
			async sets => {
				this.settings.folderFilterSets = sets;
				await this.saveSettings();
			} );	
		}

	
	exposeSettingsNoteFilterSets(
		containerEl: HTMLElement,
		refreshDisplay: () => void,
	){
		createSettingsNoteFilterSets(
			containerEl,
			this.settings.noteFilterSets,
			(sets) => {
				this.settings.noteFilterSets = sets;
				this.saveSettings();
			},
			refreshDisplay
		)
	}

	exposeNoteFilterSetInputs(
		containerEl: HTMLElement,
		filterSetName: string,
		description: string,
		deletable: boolean,
		renamable: boolean,
		refreshDisplay: () => void,
	){
		const filterSets = this.settings.noteFilterSets;
		const filterSetIndex = filterSets.findIndex((s) => s.name === filterSetName);
		const filterSet = filterSetIndex !== -1 ? filterSets[filterSetIndex] : DEFAULT_NOTE_FILTER_SET;

		createNoteFilterSetInputs(
			containerEl,
			filterSet,
			description,
			deletable,
			renamable,
			(name:string, notify:boolean) => validateFilterSetName(name, filterSetName, this.settings.noteFilterSets, notify),
			(set) => {
				if (!set) {
        filterSets.splice(filterSetIndex, 1);
        this.settings.noteFilterSets = filterSets;
				this.saveSettings();
      } else {
        filterSets[filterSetIndex] = set;
        this.settings.noteFilterSets = filterSets;
				this.saveSettings();
      }
			},
			refreshDisplay,
		)
	}

	exposeSettingsFolderFilterSets(
		containerEl: HTMLElement,
		refreshDisplay: () => void,
	){
		createSettingsFolderFilterSets(
			containerEl,
			this.settings.folderFilterSets,
			(sets) => {
				this.settings.folderFilterSets = sets;
				this.saveSettings();
			},
			refreshDisplay
		)
	}

	exposeFolderFilterSetInputs(
		containerEl: HTMLElement,
		filterSetName: string,
		description: string,
		deletable: boolean,
		renamable: boolean,
		refreshDisplay: () => void,
	){
		const filterSets = this.settings.folderFilterSets;
		const filterSetIndex = filterSets.findIndex((s) => s.name === filterSetName);
		const filterSet = filterSetIndex !== -1 ? filterSets[filterSetIndex] : DEFAULT_FOLDER_FILTER_SET;

		createFolderFilterSetInputs(
			containerEl,
			filterSet,
			description,
			deletable,
			renamable,
			(name:string, notify:boolean) => validateFilterSetName(name, filterSetName, this.settings.noteFilterSets, notify),
			(set) => {
				if (!set) {
        filterSets.splice(filterSetIndex, 1);
        this.settings.folderFilterSets = filterSets;
				this.saveSettings();
      } else {
        filterSets[filterSetIndex] = set;
        this.settings.folderFilterSets = filterSets;
				this.saveSettings();
      }
			},
			refreshDisplay,
		)
	}

}

function getNearestNotesInSet(parent:TFolder|null, noteFilterSet:NoteFilterSet ): TFile[] {
	if (!parent) return [];

	const siblings = parent.children;
	if (siblings && siblings[0]) {
		const filteredSiblings = filterNoteList(noteFilterSet, siblings.flatMap(f => f instanceof TFile ? [f] : []));
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

	if (settings.includeTags){
		const includeTagRegExp = getRegexIfValid(settings.includeTags);
		if (includeTagRegExp){
			list = list.filter(f => {
				const fCache = app.metadataCache.getFileCache(f);
				if (!fCache) return false;

				return getAllTags(fCache)?.some( t => t.match(includeTagRegExp) );
			})
		} else {
			const includeTags = settings.includeTags.split(/\s*,\s*/);
			
			list = list.filter(f => {
				const fCache = app.metadataCache.getFileCache(f);
				if (!fCache) return false;
				
				const fTags = getAllTags(fCache);
				if (!fTags) return false;

				return includeTags.every(it => fTags.some(t => t.startsWith(it)));
			})
		}
	}

	if (settings.excludeTags){
		const excludeTagRegExp = getRegexIfValid(settings.excludeTags);
		if (excludeTagRegExp){
			list = list.filter(f => {
				const fCache = app.metadataCache.getFileCache(f);
				if (!fCache) return true;

				return !getAllTags(fCache)?.some( t => t.match(excludeTagRegExp) );
			})
		} else {
			const excludeTags = settings.excludeTags.split(/\s*,\s*/);
			
			list = list.filter(f => {
				const fCache = app.metadataCache.getFileCache(f);
				if (!fCache) return true;
				
				const fTags = getAllTags(fCache);
				if (!fTags) return true;

				return !excludeTags.some( et => fTags.some( t => t.startsWith(et)) );
			})
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