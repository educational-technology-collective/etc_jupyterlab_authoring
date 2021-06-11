import {
    ILayoutRestorer,
    JupyterFrontEnd,
    JupyterFrontEndPlugin,
    JupyterLab
} from "@jupyterlab/application";

import {
    IDocumentManager
} from "@jupyterlab/docmanager";

import {
    INotebookTracker,
    NotebookPanel,
    INotebookModel,
    Notebook,
    NotebookActions
} from "@jupyterlab/notebook";

import {
    Cell,
    CodeCell,
    ICellModel
} from "@jupyterlab/cells";

import {
    IObservableList,
    IObservableUndoableList,
    IObservableString
} from "@jupyterlab/observables";

import { IOutputAreaModel } from "@jupyterlab/outputarea";

import { INotebookContent } from "@jupyterlab/nbformat";

import {
    DocumentRegistry
} from "@jupyterlab/docregistry";

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu, Widget } from '@lumino/widgets';

import { ISignal, Signal } from '@lumino/signaling';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { each } from '@lumino/algorithm';

import {
    ICommandPalette,
    MainAreaWidget,
    WidgetTracker,
    ToolbarButton
} from '@jupyterlab/apputils';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import {
    LoggerRegistry,
    LogConsolePanel,
    IHtmlLog,
    ITextLog,
    IOutputLog,
} from '@jupyterlab/logconsole';

import { CodeMirrorEditor } from "@jupyterlab/codemirror";

import { addIcon, clearIcon, listIcon, LabIcon, Button, consoleIcon } from '@jupyterlab/ui-components';

import recordOn from './icons/record_on.svg';
import recordOff from './icons/record_off.svg';

import {
    IDisposable, DisposableDelegate
} from '@lumino/disposable';
import { CommandRegistry } from "@lumino/commands";
import { Time } from "@jupyterlab/coreutils";
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

    receiveMessage(sender: any, args: any) {
        console.log(args);
    }
}

export class ExecutionEvent {

    private _executionStarted: Signal<ExecutionEvent, any> = new Signal(this);
    private _executionFinished: Signal<ExecutionEvent, any> = new Signal(this);
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
        this._cell = cell;
        this._notebookPanel = notebookPanel;


        for (
            this._runButton = notebookPanel.toolbar.node.querySelector("[data-icon='ui-components:run']");
            this._runButton?.tagName !== "DIV";
            this._runButton = (this._runButton as Element).parentElement
        );
        //  The only thing that uniquely identifies the run button in the DOM is the data-icon attr; hence, use it.
        //  The Button Widgets don't have unique class names; hence, climb the tree in order to get to the first DIV.

        this._runButton.addEventListener("click", this.clickRun, { capture: false });

        app.commands.commandExecuted.connect(this.commandExecuted, this);

        NotebookActions.executed.connect(this.finishExecution, this);

        notebookPanel.disposed.connect(this.dispose, this);
        cell.disposed.connect(this.dispose, this);
    }

    public dispose() {
        Signal.disconnectAll(this);
        if (this._runButton) {
            this._runButton.removeEventListener("click", this.clickRun, { capture: false });
        }
    }


    private commandExecuted(sender: CommandRegistry, args: CommandRegistry.ICommandExecutedArgs) {
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

    private clickRun() {
        if (
            this._notebookPanel.isVisible &&
            this._notebookPanel.content.activeCell == this._cell) {
            this._executionStarted.emit({
                event: "execution_started",
                id: this._cell.model.id
            });
        }
    }

    public finishExecution(sender: any, args: {
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

    private _buttonPressed: Signal<RecordButton, any> = new Signal(this);
    private _on: boolean = false;
    private _notebookPanel: NotebookPanel;

    constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

        super({ tag: "button" });

        this._notebookPanel = notebookPanel;

        this.node.className = ""

        this.addClass("etc-jupyterlab-authoring-record-button");

        this.press = this.press.bind(this);
        this.keydown = this.keydown.bind(this);

        notebookPanel.toolbar.insertItem(10, "RecordButton", this);

        this.node.innerHTML = recordOff + " Record";

        this.node.addEventListener("click", this.press);
        document.addEventListener("keydown", this.keydown)
    }

    public dispose() {
        this.node.removeEventListener("click", this.press);
        document.removeEventListener("keydown", this.keydown);
        Signal.disconnectAll(this);
        super.dispose();
    }

    private keydown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key == "F9") {
            if (this._notebookPanel.isVisible) {
                this.press();
            }
        }
    }

    public press() {
        if (this._on) {
            this._on = false;
            this.node.innerHTML = recordOff + " Record";
            this._buttonPressed.emit({ event: "record_off" });
        }
        else {
            this._on = true;
            this.node.innerHTML = recordOn + " Record";
            this._buttonPressed.emit({ event: "record_on" });
        }
    }

    get buttonPressed(): ISignal<RecordButton, any> {
        return this._buttonPressed;
    }
}

export class EditorEvent {

    static _id: string = "";
    static _line: number = -1;

    private _cursorChanged: Signal<EditorEvent, any> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: CodeMirrorEditor;

    constructor({ notebookPanel, cell }: { notebookPanel: NotebookPanel, cell: Cell }) {

        this.editorEvent = this.editorEvent.bind(this);
        this.dispose = this.dispose.bind(this);

        this._notebookPanel = notebookPanel;
        this._cell = cell;
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor);

        this._editor.editor.on('cursorActivity', this.editorEvent);
        this._editor.editor.on('focus', this.editorEvent);
        cell.disposed.connect(this.dispose);
    }

    dispose() {
        Signal.disconnectAll(this);
        this._editor.editor.off('focus', this.editorEvent);
        this._editor.editor.off('cursorActivity', this.editorEvent);
    }

    editorEvent(instance: Editor) {

        let line = instance.getCursor().line;
        let text = instance.getLine(line);

        if (this._cell.model.id !== EditorEvent._id || line !== EditorEvent._line) {

            this._cursorChanged.emit({
                id: this._cell.model.id,
                event: 'line_changed',
                line: line,
                text: text
            });

            EditorEvent._id = this._cell.model.id;
            EditorEvent._line = line;
        }
    }

    get cursorChanged(): ISignal<EditorEvent, any> {
        return this._cursorChanged;
    }
}

export class CellsEvent {

    private _cellChanged: Signal<CellsEvent, any> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _app: JupyterFrontEnd;

    constructor(
        { app, notebookPanel }:
            {
                app: JupyterFrontEnd,
                notebookPanel: NotebookPanel
            }
    ) {
        this._notebookPanel = notebookPanel;
        this._app = app;

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

                    let editorEvent = new EditorEvent({ notebookPanel: this._notebookPanel, cell });
                    editorEvent.cursorChanged.connect(
                        (sender: EditorEvent, args: any) => this._cellChanged.emit(args), this);

                    let executionEvent = new ExecutionEvent({ app: this._app, notebookPanel: this._notebookPanel, cell });
                    executionEvent.executionStarted.connect(
                        (sender: ExecutionEvent, args: any) => this._cellChanged.emit(args), this);
                    executionEvent.executionFinished.connect(
                        (sender: ExecutionEvent, args: any) => this._cellChanged.emit(args), this);
                        
                }
            });
        }
        else {
            console.log("Unhandled cells changed event: ", args);
        }
    }

    get cellChanged(): ISignal<CellsEvent, any> {
        return this._cellChanged;
    }
}