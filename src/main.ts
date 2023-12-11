import { Plugin, TFile, TFolder } from 'obsidian';
import { DEFAULT_SETTINGS, FNOSettingTab, SettingsFNO } from './settings';
import { NotePicker, pickers } from "./pickers"

export default class FnOPlugin extends Plugin {
	settings: SettingsFNO;

	pickers: NotePicker[] = pickers;

	api_getNote: () => Promise<TFile>
	api_getDir: () => Promise<TFolder>;

	async onload() {
		await this.loadSettings();
		this.api_getNote = this.getNote,
			this.api_getDir = this.getDir,

		// add a command to trigger the project note opener
		this.addCommand({
			id: 'open-filtered-note-picker',
			name: 'Open Filtered Note Picker',
			callback: async () => {
				const file = await this.getNote();
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

	public getNote(): Promise<TFile> {
		return new Promise((resolve, reject) => {
			const filteredFiles: TFile[] = filterFileList(this.settings, this.app.vault.getFiles());

			const activeFileSiblings = this.app.workspace.getActiveFile()?.parent.children;
			if (activeFileSiblings && activeFileSiblings[0]) {
				const activeProjectNotes = filterFileList(this.settings, activeFileSiblings.filter(f => f instanceof TFile) as TFile[]);

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

	public getDir(rootDir="/", depth=this.settings.dirSearchDepth, includeRoots=false): Promise<TFolder> {
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

			const filteredDirs = filterDirList(this.settings, dirs);

			if (filteredDirs.length === 1) {
				return resolve(filteredDirs[0]);
			}

			this.pickers[this.settings.pickerIndex]
				.pick(this.app, filteredDirs, dir => resolve(dir));
		})
	}
}

function filterFileList(settings:SettingsFNO, list:TFile[]):TFile[]{
	if (settings.includePath){
		if (settings.includePathIsRegex){
			list = list.filter(f => f.path.match(settings.includePath))
		} else {
			list = list.filter(f => f.path.includes(settings.includePath))
		}
	}
	
	if (settings.includeFileName){
		if (settings.includeFileNameIsRegex){
			list = list.filter(f => f.name.match(settings.includeFileName))
		} else {
			list = list.filter(f => f.name.includes(settings.includeFileName))
		}
	}

	if (settings.excludePath){
		if (settings.excludePathIsRegex){
			list = list.filter(f => !f.path.match(settings.excludePath))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludePath))
		}
	}
	
	if (settings.excludeFileName){
		if (settings.excludeFileNameIsRegex){
			list = list.filter(f => !f.name.match(settings.excludeFileName))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeFileName))
		}
	}

	return list;
}

function filterDirList(settings: SettingsFNO, list: TFolder[]): TFolder[] {
	if (settings.includeDirPath) {
		if (settings.includeDirPathIsRegex) {
			list = list.filter(f => f.path.match(settings.includeDirPath))
		} else {
			list = list.filter(f => f.path.includes(settings.includeDirPath))
		}
	}

	if (settings.includeDirName) {
		if (settings.includeDirNameIsRegex) {
			list = list.filter(f => f.name.match(settings.includeDirName))
		} else {
			list = list.filter(f => f.name.includes(settings.includeDirName))
		}
	}

	if (settings.excludeDirPath) {
		if (settings.excludeDirPathIsRegex) {
			list = list.filter(f => !f.path.match(settings.excludeDirPath))
		} else {
			list = list.filter(f => !f.path.includes(settings.excludeDirPath))
		}
	}

	if (settings.excludeDirName) {
		if (settings.excludeDirNameIsRegex) {
			list = list.filter(f => !f.name.match(settings.excludeDirName))
		} else {
			list = list.filter(f => !f.name.includes(settings.excludeDirName))
		}
	}

	return list;
}