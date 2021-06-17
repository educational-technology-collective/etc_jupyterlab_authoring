import {
    JupyterFrontEnd
} from "@jupyterlab/application";

import {
    NotebookPanel,
    Notebook,
    NotebookActions
} from "@jupyterlab/notebook";

import {
    Cell,
    CodeCell,
    ICellModel,
    MarkdownCell
} from "@jupyterlab/cells";

import {
    IObservableList
} from "@jupyterlab/observables";

import { Widget } from "@lumino/widgets";

import { ISignal, Signal } from "@lumino/signaling";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import recordOn from "./icons/record_on.svg";
import recordOff from "./icons/record_off.svg";

import { CommandRegistry } from "@lumino/commands";
import { Editor } from "codemirror";

export class MessageReceivedEvent {

    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }:
            { notebookPanel: NotebookPanel }
    ) {
        this._notebookPanel = notebookPanel;

        this._notebookPanel.disposed.connect(this.dispose, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
    }

    onReceiveMessage(sender: any, args: any) {
        console.log(args);
    }
}

export class ExecutionEvent {

    private _executionStarted: Signal<ExecutionEvent, any> = new Signal(this);
    private _executionFinished: Signal<ExecutionEvent, any> = new Signal(this);
    private _app: JupyterFrontEnd;
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _runButton: Element | null;

    constructor(
        { app, notebookPanel, cell }:
            {
                app: JupyterFrontEnd,
                notebookPanel: NotebookPanel,
                cell: Cell<ICellModel>
            }
    ) {
        this._app = app;
        this._cell = cell;
        this._notebookPanel = notebookPanel;

        for (
            this._runButton = notebookPanel.toolbar.node.querySelector("[data-icon='ui-components:run']");
            this._runButton?.tagName !== "DIV";
            this._runButton = (this._runButton as Element).parentElement
        );
        //  The only thing that uniquely identifies the run button in the DOM is the data-icon attr; hence, use it.
        //  The Button Widgets don"t have unique class names; hence, climb the tree in order to get to the first DIV.

        notebookPanel.disposed.connect(this.dispose, this);
        cell.disposed.connect(this.dispose, this);
    }

    public dispose() {
        Signal.disconnectAll(this);
        if (this._runButton) {
            this._runButton.removeEventListener("click", this.onClickRun, { capture: false });
        }
    }

    public enable(sender: RecordButton, args: any) {
        this._runButton.addEventListener("click", this.onClickRun, { capture: false });

        this._app.commands.commandExecuted.connect(this.onCommandExecuted, this);

        NotebookActions.executed.connect(this.onFinishExecution, this);
    }

    public disable(sender: RecordButton, args: any) {
        this._runButton.removeEventListener("click", this.onClickRun, { capture: false });

        this._app.commands.commandExecuted.disconnect(this.onCommandExecuted, this);

        NotebookActions.executed.disconnect(this.onFinishExecution, this);
    }

    private onCommandExecuted(sender: CommandRegistry, args: CommandRegistry.ICommandExecutedArgs) {
        if (
            this._notebookPanel.isVisible &&
            this._notebookPanel.content.activeCell == this._cell &&
            args.id == "notebook:run-cell-and-select-next") {
            this._executionStarted.emit({
                event: "execution_started",
                id: this._cell.model.id
            });
        }
    }

    private onClickRun() {
        if (
            this._notebookPanel.isVisible &&
            this._notebookPanel.content.activeCell == this._cell) {
            this._executionStarted.emit({
                event: "execution_started",
                id: this._cell.model.id
            });
        }
    }

    public onFinishExecution(sender: any, args: {
        notebook: Notebook;
        cell: Cell<ICellModel>;
    }) {

        if (args.cell == this._cell) {

            let output = "";

            if (args.cell.model.type == "code") {
                output = JSON.stringify((this._cell as CodeCell).model.outputs.get(0));
            }

            this._executionFinished.emit({
                event: "execution_finished",
                id: this._cell.model.id,
                output: output
            });
        }
    }

    get executionStarted(): ISignal<ExecutionEvent, any> {
        return this._executionStarted;
    }

    get executionFinished(): ISignal<ExecutionEvent, any> {
        return this._executionFinished;
    }
}

export class RecordButton extends Widget {

    private _recordButtonEnabled: Signal<RecordButton, any> = new Signal(this);
    private _recordButtonDisabled: Signal<RecordButton, any> = new Signal(this);

    private _on: boolean = false;
    private _notebookPanel: NotebookPanel;

    constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

        super({ tag: "button" });

        this._notebookPanel = notebookPanel;

        this.node.className = ""

        this.addClass("etc-jupyterlab-authoring-record-button");

        this.onPress = this.onPress.bind(this);
        this.keydown = this.keydown.bind(this);

        notebookPanel.toolbar.insertItem(10, "RecordButton", this);

        this.node.innerHTML = recordOff + " Record";

        this.node.addEventListener("click", this.onPress);
        document.addEventListener("keydown", this.keydown)
    }

    public dispose() {
        this.node.removeEventListener("click", this.onPress);
        document.removeEventListener("keydown", this.keydown);
        Signal.disconnectAll(this);
        super.dispose();
    }

    private keydown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key == "F9") {
            if (this._notebookPanel.isVisible) {
                this.onPress();
            }
        }
    }

    public onPress() {
        if (this._on) {
            this._on = false;
            this.node.innerHTML = recordOff + " Record";
            this._recordButtonDisabled.emit({ event: "record_off" });
        }
        else {
            this._on = true;
            this.node.innerHTML = recordOn + " Record";
            this._recordButtonEnabled.emit({ event: "record_on" });
        }
    }

    get recordButtonEnabled(): ISignal<RecordButton, any> {
        return this._recordButtonEnabled;
    }

    get recordButtonDisabled(): ISignal<RecordButton, any> {
        return this._recordButtonDisabled;
    }
}

export class EditorEvent {

    static _id: string = "";
    static _line: number = -1;

    private _cursorChanged: Signal<EditorEvent, any> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: CodeMirrorEditor;
    private _line: number = -1;

    constructor({ notebookPanel, cell }: { notebookPanel: NotebookPanel, cell: Cell }) {

        this.onEditorEvent = this.onEditorEvent.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.dispose = this.dispose.bind(this);

        this._notebookPanel = notebookPanel;
        this._cell = cell;
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor);

        cell.disposed.connect(this.dispose);
    }

    public dispose() {
        Signal.disconnectAll(this);
        this._editor.editor.off("focus", this.onEditorEvent);
        this._editor.editor.off("cursorActivity", this.onEditorEvent);
    }

    public enable(sender: RecordButton, args: any) {
        this._editor.editor.on("focus", this.onFocus);
        this._editor.editor.on("blur", this.onBlur);
    }

    public disable(sender: RecordButton, args: any) {
        this._editor.editor.off("focus", this.onEditorEvent);
        this._editor.editor.off("cursorActivity", this.onEditorEvent);
    }

    private onFocus(instance: Editor) {
        setTimeout(() => {
            this.onEditorEvent(instance);
            this._editor.editor.on("cursorActivity", this.onEditorEvent);
        }, 0)
    }

    private onBlur(instance: Editor) {
        setTimeout(() => {
            if (this._notebookPanel.content.activeCell !== this._cell) {
                this._editor.editor.off("cursorActivity", this.onEditorEvent);
                this._line = -1;
            }
        }, 0)
    }

    private onEditorEvent(instance: Editor) {

        let line = instance.getCursor().line;
        let text = instance.getLine(line);

        if (line !== this._line) {
            this._cursorChanged.emit({
                id: this._cell.model.id,
                event: 'line_changed',
                line: line,
                text: text
            });

            this._line = line;
        }
        // if (this._cell.model.id !== EditorEvent._id || line !== EditorEvent._line) {

        //     this._cursorChanged.emit({
        //         id: this._cell.model.id,
        //         event: 'line_changed',
        //         line: line,
        //         text: text
        //     });

        //     EditorEvent._id = this._cell.model.id;
        //     EditorEvent._line = line;
        // }

    }

    get cursorChanged(): ISignal<EditorEvent, any> {
        return this._cursorChanged;
    }
}

export class ProgressEvent {

    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: CodeMirrorEditor;

    constructor({ notebookPanel, cell }: { notebookPanel: NotebookPanel, cell: Cell }) {
        this._notebookPanel = notebookPanel;
        this._cell = cell;
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor);

        this.onEditorKeydown = this.onEditorKeydown.bind(this);
        this.onNotebookPanelKeydown = this.onNotebookPanelKeydown.bind(this);

        cell.disposed.connect(this.dispose);
        notebookPanel.disposed.connect(this.dispose);
    }

    public dispose() {
        this._editor.editor.off("keydown", this.onEditorKeydown);
        Signal.disconnectAll(this);
    }

    public enable(sender: RecordButton, args: any) {
        this._editor.editor.on("keydown", this.onEditorKeydown);
        this._notebookPanel.node.addEventListener("keydown", this.onNotebookPanelKeydown);
    }

    public disable(sender: RecordButton, args: any) {
        this._editor.editor.off("keydown", this.onEditorKeydown);
        this._notebookPanel.node.removeEventListener("keydown", this.onNotebookPanelKeydown);
    }

    private onNotebookPanelKeydown(event: KeyboardEvent) {
        // if (this._notebookPanel.content.activeCell == this._cell && !this._editor.hasFocus()) {

        //     if (event.key == "Shift") {
        //         this._editor.focus();
        //         this._editor.setCursorPosition({ line: 0, column: 0 });
        //     }
        // }
    }

    private onEditorKeydown(instance: Editor, event: KeyboardEvent) {

        event.stopPropagation();
        //  It's an event on the Editor; hence, we don't want it to fire the keydown handler on the Notebook when it bubbles.

        if (event.key == "Shift") {
            let cursor = instance.getCursor();
            let lastLine = instance.lastLine();
            if (cursor.line == lastLine) {

                let cell = this._notebookPanel.content.widgets[this._notebookPanel.content.activeCellIndex + 1];

                if (cell) {
                    if (cell.model.type == "markdown") {
                        (cell as MarkdownCell).rendered = false;
                    }
                    cell.editorWidget.editor.setCursorPosition({ line: 0, column: 0 });
                    cell.editorWidget.editor.focus();
                }
            }
            else {
                this._editor.editor.setCursor({ line: cursor.line + 1, ch: cursor.ch });
            }
        }
    }

}

export class CellsEvent {

    private _notebookPanel: NotebookPanel;
    private _app: JupyterFrontEnd;
    private _messageReceivedEvent: MessageReceivedEvent;
    private _recordButton: RecordButton;

    constructor(
        { app, notebookPanel, messageReceivedEvent, recordButton }:
            {
                app: JupyterFrontEnd,
                notebookPanel: NotebookPanel,
                messageReceivedEvent: MessageReceivedEvent,
                recordButton: RecordButton
            }
    ) {
        this._notebookPanel = notebookPanel;
        this._app = app;
        this._messageReceivedEvent = messageReceivedEvent;
        this._recordButton = recordButton;

        notebookPanel.content.widgets.forEach(
            (value: Cell<ICellModel>) =>
                this.cellsChange(this, {
                    type: "add",
                    newValues: [value.model]
                }));
        //  Each new value is given in a list; hence, value.model is in a list.

        notebookPanel.content.model?.cells.changed.connect(this.cellsChange, this);
        notebookPanel.disposed.connect(this.dispose, this);
    }

    public dispose() {
        Signal.disconnectAll(this);
    }

    private cellsChange(sender: any, args: IObservableList.IChangedArgs<ICellModel> | any) {

        if (args.type == "add" || args.type == "set") {

            args.newValues.forEach((cellModel: ICellModel) => {

                let cell = this._notebookPanel.content.widgets.find((cell: Cell<ICellModel>) => cell.model === cellModel);
                //  All we have is the CellModel; hence, we need to find the Cell in the widgets.

                if (cell !== undefined) {

                    //  EditorEvent
                    let editorEvent = new EditorEvent(
                        { notebookPanel: this._notebookPanel, cell });
                    editorEvent.cursorChanged.connect(
                        this._messageReceivedEvent.onReceiveMessage, this._messageReceivedEvent);

                    this._recordButton.recordButtonEnabled.connect(editorEvent.enable, editorEvent);
                    this._recordButton.recordButtonDisabled.connect(editorEvent.disable, editorEvent);
                    //  EditorEvent

                    //  ExecutionEvent
                    let executionEvent = new ExecutionEvent(
                        { app: this._app, notebookPanel: this._notebookPanel, cell });
                    executionEvent.executionStarted.connect(
                        this._messageReceivedEvent.onReceiveMessage, this._messageReceivedEvent);
                    executionEvent.executionFinished.connect(
                        this._messageReceivedEvent.onReceiveMessage, this._messageReceivedEvent);

                    this._recordButton.recordButtonEnabled.connect(executionEvent.enable, executionEvent);
                    this._recordButton.recordButtonDisabled.connect(executionEvent.disable, executionEvent);
                    //  ExecutionEvent

                    //  ProgressEvent
                    let progressEvent = new ProgressEvent(
                        { notebookPanel: this._notebookPanel, cell });

                    this._recordButton.recordButtonEnabled.connect(progressEvent.enable, progressEvent);
                    this._recordButton.recordButtonDisabled.connect(progressEvent.disable, progressEvent);
                    //  ProgressEvent
                }
            });
        }
        else {
            console.log("Unhandled cells changed event: ", args);
        }
    }
}