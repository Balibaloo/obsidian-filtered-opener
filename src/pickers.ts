import { App, FuzzySuggestModal, TFile } from "obsidian";

export type NotePicker = {
	name: string;
	description: String;
	pick(app:App, notes: TFile[], callback:(file:TFile)=>void): void;
}


const flatPicker: NotePicker = {
	name: "flat",
	description: "Display all project notes in the root project folder as \'pathToProjectFolder/projectFolderName\'",
	pick: (app:App, notes: TFile[], callback:(file:TFile)=>void): void => {
		new FlatSuggestModal(app, notes,callback).open();
	}
}

class FlatSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, items:TFile[], callback:(item:TFile)=>void) {
		super(app);
		this.items = items;
		this.callback=callback;
	}
	
	items:TFile[];
	callback:(item:TFile)=>void;

	getItems(): TFile[] {
		return this.items;
	}

	getItemText(item: TFile): string {
		let splitPath = item.path.split(/[\\/]/g);
		return `${splitPath[1]}/ ${splitPath.at(-2)?.replace(/\.md$/gi,'')}`;
	}
	onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): void {
		this.callback(item);
	}
}


const recursivePicker: NotePicker = {
	name: "recursive",
	description: "Chose a top level folder in the root project folder and then between any subfolders (if necessary)",
	pick: (app:App, notes: TFile[],callback:(file:TFile)=>void): void => {
		callback(notes[0]);
	}
}

export const pickers:NotePicker[] = [flatPicker, recursivePicker];