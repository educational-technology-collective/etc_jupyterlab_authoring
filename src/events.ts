import {
    JupyterFrontEnd
} from "@jupyterlab/application";

import {
    NotebookPanel,
    Notebook,
    NotebookActions,
    INotebookTracker,
    NotebookTracker
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
import playOn from "./icons/play_on.svg";
import playOff from "./icons/play_off.svg";

import { Editor, fromTextArea } from "codemirror";

import { consoleIcon } from "@jupyterlab/ui-components";
import { Message } from "@jupyterlab/services/lib/kernel/messages";

import { EventMessage } from "./types";

import { MessageAggregator, PlayButton, RecordButton, SaveButton } from "./authoring"

export class ExecutionEvent {

    private _app: JupyterFrontEnd;
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: Editor;
    private _messageAggregator: MessageAggregator;

    constructor(
        { app, notebookPanel, cell, messageAggregator }:
            {
                app: JupyterFrontEnd,
                notebookPanel: NotebookPanel,
                cell: Cell<ICellModel>,
                messageAggregator: MessageAggregator
            }
    ) {
        this._app = app;
        this._cell = cell;
        this._notebookPanel = notebookPanel;
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor).editor;
        this._messageAggregator = messageAggregator;

        notebookPanel.disposed.connect(this.dispose, this);
        cell.disposed.connect(this.dispose, this);
    }

    public dispose() {
        Signal.disconnectAll(this);
    }

    public enable(sender: any, args: any) {
        NotebookActions.executed.connect(this.onFinishExecution, this);
    }

    public disable(sender: any, args: any) {
        NotebookActions.executed.disconnect(this.onFinishExecution, this);
    }

    public onFinishExecution(sender: any, args: {
        notebook: Notebook;
        cell: Cell<ICellModel>;
    }) {
        console.log("onFinishExecution", this._cell.id, args.cell.id);
        if (args.cell == this._cell) {

            let output = "";

            if (args.cell.model.type == "code") {
                output = JSON.stringify((this._cell as CodeCell).model.outputs.get(0));
            }

            this._messageAggregator.aggregate({
                event: "execution_finished",
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._notebookPanel.content.widgets.indexOf(this._cell),
                output: output,
                timestamp: Date.now()
            });
        }
    }
}

export class EditorEvent {

    static _cell_id: string;
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: Editor;
    private _line: number = -1;
    private _text: string;
    private _isCapturing: boolean = false;
    private _app: JupyterFrontEnd;
    private _keymap: { Space: (instance: Editor) => void };
    private _messageAggregator: MessageAggregator;

    constructor(
        { app, notebookPanel, cell, messageAggregator }:
            { app: JupyterFrontEnd, notebookPanel: NotebookPanel, cell: Cell, messageAggregator: MessageAggregator }
    ) {
        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cell = cell;
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor).editor;
        this._messageAggregator = messageAggregator;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onCursorActivity = this.onCursorActivity.bind(this);
        this.onCellStart = this.onCellStart.bind(this);

        this._keymap = {
            Space: this.onKeyDown
        };

        cell.disposed.connect(this.dispose, this);
        notebookPanel.disposed.connect(this.dispose);
    }

    public dispose() {
        Signal.disconnectAll(this);
    }

    public enable(sender: any, args: any) {
        this._editor.addKeyMap(this._keymap);
        this._editor.on("focus", this.onFocus);
        this._editor.on("blur", this.onBlur);
        this._notebookPanel.content.node.addEventListener("keydown", this.onCellStart, true);
    }

    public disable(sender: any, args: any) {
        if (this._isCapturing) {
            this.stop();
        }
        this._editor.removeKeyMap(this._keymap);
        this._editor.off("focus", this.onFocus);
        this._editor.off("blur", this.onBlur);
        this._editor.off("cursorActivity", this.onCursorActivity);
        this._notebookPanel.content.node.removeEventListener("keydown", this.onCellStart, true);
    }

    private onFocus(instance: Editor, event: Event) {
        console.log("onFocus", this._cell.model.id);

        if (EditorEvent._cell_id != this._cell.model.id) {
            //  The focus event is fired at times other than cell transitions; hence, don't start a capture unless it's a cell transition.

            EditorEvent._cell_id = this._cell.model.id;

            setTimeout(() => {
                this.start();
            }, 0);
            //  The cursor is set after the focus event; hence, start the capture after the cursor is set.

            this._editor.off("focus", this.onFocus);
        }
        this._editor.on("cursorActivity", this.onCursorActivity);
    }

    private onBlur(instance: Editor, event: Event) {
        console.log("onBlur", this._cell.model.id);

        if (this._isCapturing) {
            this.stop();
        }
        this._editor.on("focus", this.onFocus);
        this._editor.off("cursorActivity", this.onCursorActivity);
    }

    private onCellStart(event: KeyboardEvent) {

        if (
            this._cell == this._notebookPanel.content.activeCell &&
            !this._editor.hasFocus() &&
            event.code == "Space"
        ) {
            console.log("onCellStart", this._cell.model.id);

            event.stopPropagation();
            event.preventDefault();
            EditorEvent._cell_id = null;
            this._cell.editorWidget.editor.setCursorPosition({ line: 0, column: 0 });
            this._editor.focus();
        }
    }

    private onKeyDown(instance: Editor) {
        console.log("onKeyDown", this._cell.model.id);

        let line = instance.getCursor().line;
        if (line == instance.lastLine()) {
            let cell = this._notebookPanel.content.widgets[this._notebookPanel.content.activeCellIndex + 1];

            if (cell) {
                if (cell.model.type == "markdown") {
                    (cell as MarkdownCell).rendered = false;
                }

                cell.editorWidget.editor.setCursorPosition({ line: 0, column: 0 });
                cell.editorWidget.editor.focus();
            }
            else {
                if (this._isCapturing) {
                    this.stop();
                }
            }
        }
        else {
            this._editor.setCursor({ line: line + 1, ch: 0 });
        }
    }

    private onCursorActivity(instance: Editor) {
        console.log("onCursorActivity", this._cell.model.id);
        let line = this._editor.getCursor().line;
        if (this._line != line) {
            if (this._isCapturing) {
                this.stop();
            }
            this.start();
        }
    }

    private start() {
        console.log("captureStarted")
        this._isCapturing = true;
        this._line = this._editor.getCursor().line;
        this._text = this._editor.getLine(this._line);
        this._messageAggregator.aggregate({
            event: 'capture_started',
            notebook_id: this._notebookPanel.content.id,
            cell_id: this._cell.model.id,
            cell_index: this._notebookPanel.content.widgets.indexOf(this._cell),
            line: this._line,
            input: this._text,
            timestamp: Date.now()
        });
    }

    private stop() {
        console.log("captureStopped")
        this._isCapturing = false;
        this._messageAggregator.aggregate({
            event: 'capture_stopped',
            notebook_id: this._notebookPanel.content.id,
            cell_id: this._cell.model.id,
            cell_index: this._notebookPanel.content.widgets.indexOf(this._cell),
            line: this._line,
            input: this._text,
            timestamp: Date.now()
        });
    }
}

export class CellsEvent {

    private _notebookPanel: NotebookPanel;
    private _app: JupyterFrontEnd;
    private _messageAggregator: MessageAggregator;
    private _recordButton: RecordButton;
    private _playButton: PlayButton;
    private _saveButton: SaveButton;

    constructor(
        { app, notebookPanel, messageAggregator, recordButton, playButton, saveButton }:
            {
                app: JupyterFrontEnd,
                notebookPanel: NotebookPanel,
                messageAggregator: MessageAggregator,
                recordButton: RecordButton,
                playButton: PlayButton,
                saveButton: SaveButton
            }
    ) {
        this._notebookPanel = notebookPanel;
        this._app = app;
        this._messageAggregator = messageAggregator;
        this._recordButton = recordButton;
        this._playButton = playButton;
        this._saveButton = saveButton;

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
                //  All we get is the CellModel; hence, we need to find the Cell in the widgets.

                if (cell !== undefined) {

                    //  EditorEvent
                    let editorEvent = new EditorEvent(
                        {
                            app: this._app,
                            notebookPanel: this._notebookPanel,
                            cell,
                            messageAggregator: this._messageAggregator
                        });

                    this._recordButton.enabled.connect(editorEvent.enable, editorEvent);
                    this._recordButton.disabled.connect(editorEvent.disable, editorEvent);
                    this._playButton.disabled.connect(editorEvent.disable, editorEvent);
                    this._saveButton.pressed.connect(editorEvent.disable, editorEvent);
                    //  EditorEvent


                    //  ExecutionEvent
                    let executionEvent = new ExecutionEvent(
                        {
                            app: this._app,
                            notebookPanel: this._notebookPanel,
                            cell, messageAggregator: this._messageAggregator
                        });

                    this._recordButton.enabled.connect(executionEvent.enable, executionEvent);
                    this._recordButton.disabled.connect(executionEvent.disable, executionEvent);
                    this._playButton.disabled.connect(executionEvent.disable, executionEvent);
                    this._saveButton.pressed.connect(executionEvent.disable, executionEvent);
                    //  ExecutionEvent

                }
            });
        }
        else {
            console.log("Unhandled cells changed event: ", args);
        }
    }
}