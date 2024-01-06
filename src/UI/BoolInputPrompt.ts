import type { App} from "obsidian";
import { ButtonComponent, Modal, TextComponent } from "obsidian";

// Modified from QuickAdd by chhoumann
// https://github.com/chhoumann/quickadd/blob/master/src/gui/GenericInputPrompt/GenericInputPrompt.ts#L6

export default class BoolInputPrompt extends Modal {
	public waitForClose: Promise<boolean>;

	private resolvePromise: (input: boolean) => void;
	private didSubmit = false;

	public static Prompt(
		app: App,
		header: string,
	): Promise<boolean> {
		const newPromptModal = new BoolInputPrompt(
			app,
			header,
		);
		return newPromptModal.waitForClose;
	}

	protected constructor(
		app: App,
		private header: string,
	) {
		super(app);
		
		this.waitForClose = new Promise<boolean>((resolve, reject) => {
			this.resolvePromise = resolve;
		});

		this.display();
		this.open();
	}

	private display() {
		// this.containerEl.addClass("quickAddModal", "qaInputPrompt");
		this.contentEl.empty();
		this.titleEl.textContent = this.header;

		const mainContentContainer: HTMLDivElement = this.contentEl.createDiv();
		this.createButtonBar(mainContentContainer);
	}


	private createButton(
		container: HTMLElement,
		text: string,
		callback: (evt: MouseEvent) => unknown
	) {
		const btn = new ButtonComponent(container);
		btn.setButtonText(text).onClick(callback);

		return btn;
	}

	private createButtonBar(mainContentContainer: HTMLDivElement) {
		const buttonBarContainer: HTMLDivElement =
			mainContentContainer.createDiv();
		this.createButton(
			buttonBarContainer,
			"Ok",
			this.submitClickCallback
		).setCta().buttonEl.style.marginRight = "0";
		this.createButton(
			buttonBarContainer,
			"Cancel",
			this.cancelClickCallback
		);

		buttonBarContainer.style.display = "flex";
		buttonBarContainer.style.flexDirection = "row-reverse";
		buttonBarContainer.style.justifyContent = "flex-start";
		buttonBarContainer.style.marginTop = "1rem";
		buttonBarContainer.style.gap = "0.5rem";
	}

	private submitClickCallback = (evt: MouseEvent) => this.submit();
	private cancelClickCallback = (evt: MouseEvent) => this.cancel();


	private submit() {
		this.didSubmit = true;
		this.close();
	}

	private cancel() {
		this.close();
	}

	onOpen() {
		super.onOpen();
	}

	onClose() {
		super.onClose();
		this.resolvePromise(this.didSubmit);
	}
}