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
		if (notes.length === 0) return;
		if (notes.length === 1) return callback(notes[0]);

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
		if (notes.length === 0) return;
		if (notes.length === 1) return callback(notes[0]);

		let folders, depth = 1;
		do {
			folders = [ ...new Set(notes.map(n =>n.path.split("/").slice(0,depth).join("/"))) ];
			depth ++;
		} while ( folders.length === 1 );
		
		if (depth === 1){
			new FlatSuggestModal(app, notes, (f:TFile)=>{
				callback(f);
			} ).open();

		} else {
			new RecurSuggestModal(app, folders, (p:string)=>{
				const folderNotes = notes.filter(n => n.path.startsWith(p))
				recursivePicker.pick(app, folderNotes, callback)
			} ).open();
		}
	}
}

class RecurSuggestModal extends FuzzySuggestModal<string> {
	constructor(app: App, items:string[], callback:(item:string)=>void) {
		super(app);
		this.items = items;
		this.callback=callback;
	}
	
	items:string[];
	callback:(item:string)=>void;

	getItems(): string[] {
		return this.items;
	}

	getItemText(item: string): string {
		return item
	};

	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		this.callback(item);
	}
}

export const pickers:NotePicker[] = [flatPicker, recursivePicker];