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
import playOn from "./icons/play_on.svg";
import playOff from "./icons/play_off.svg";

import { Editor } from "codemirror";

import { consoleIcon } from "@jupyterlab/ui-components";

interface EventMessage {
    event: string;
    notebook_id: string;
    cell_id?: string;
    line?: number;
    input?: string;
    output?: string;
    timestamp: number;
    start_timestamp?: number;
    stop_timestamp?: number;
    duration?: number;
}

export class MessageReceivedEvent {

    private _notebookPanel: NotebookPanel;
    private _eventMessage: EventMessage;
    private _eventMessages: Array<EventMessage> = [];

    constructor(
        { notebookPanel }:
            { notebookPanel: NotebookPanel }
    ) {
        this._notebookPanel = notebookPanel;

        this._eventMessage = {
            event: "",
            notebook_id: "",
            timestamp: 0
        };

        this._notebookPanel.disposed.connect(this.dispose, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
    }

    onReceiveMessage(sender: any, message: EventMessage) {
        console.log(message);

        switch (message.event) {
            case "capture_started":
            case "capture_stopped":
            case "execution_finished":
                message.start_timestamp = this._eventMessage.timestamp;
                message.stop_timestamp = message.timestamp;
                message.duration = message.stop_timestamp - message.start_timestamp;
            default: ;
        }

        this._eventMessage = message;

        this._eventMessages.push(message);
    }
}

export class NotebookMenuToggleButton extends Widget {

    private _buttonEnabled: Signal<NotebookMenuToggleButton, EventMessage> = new Signal(this);
    private _buttonDisabled: Signal<NotebookMenuToggleButton, EventMessage> = new Signal(this);

    private _on: boolean = false;
    private _notebookPanel: NotebookPanel;
    private _keyBinding: string;
    private _eventName: string;
    private _htmlOff: string;
    private _htmlOn: string;

    constructor({ altName, eventName, className, htmlOn, htmlOff, position, keyBinding, notebookPanel }:
        { altName: string, eventName: string, className: string, htmlOn: string, htmlOff: string, keyBinding: string, position: number, notebookPanel: NotebookPanel }) {
        super({ tag: "button" });

        this.onToggle = this.onToggle.bind(this);
        this.keydown = this.keydown.bind(this);

        this._htmlOff = htmlOff;
        this._htmlOn = htmlOn;

        this._keyBinding = keyBinding;
        this._eventName = eventName;

        this._notebookPanel = notebookPanel;

        this.addClass(className);

        notebookPanel.toolbar.insertItem(position, altName, this);

        this.node.innerHTML = htmlOff;

        this.node.addEventListener("click", this.onToggle);
        document.addEventListener("keydown", this.keydown)
    }

    public dispose() {
        this.node.removeEventListener("click", this.onToggle);
        document.removeEventListener("keydown", this.keydown);
        Signal.disconnectAll(this);
        super.dispose();
    }

    private keydown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key == this._keyBinding) {
            if (this._notebookPanel.isVisible) {
                this.onToggle();
            }
        }
    }

    public onOff(sender?: any, args?: any) {
        if (this._on) {
            this._on = false;
            this.node.blur();
            this.node.innerHTML = this._htmlOff;
            this._buttonDisabled.emit({
                event: this._eventName + "_off",
                notebook_id: this._notebookPanel.content.id,
                timestamp: Date.now()
            });
        }
    }

    public onOn(sender?: any, args?: any) {
        if (!this._on) {
            this._on = true;
            this.node.blur();
            this.node.innerHTML = this._htmlOn;
            this._buttonEnabled.emit({
                event: this._eventName + "_on",
                notebook_id: this._notebookPanel.content.id,
                timestamp: Date.now()
            });
        }
    }

    public onToggle(sender?: any, args?: any) {
        if (this._on) {
            this.onOff();
        }
        else {
            this.onOn();
        }
    }

    get buttonEnabled(): ISignal<NotebookMenuToggleButton, any> {
        return this._buttonEnabled;
    }

    get buttonDisabled(): ISignal<NotebookMenuToggleButton, any> {
        return this._buttonDisabled;
    }
}

export class RecordButton extends NotebookMenuToggleButton {
    constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({
            altName: "Record Button",
            eventName: "record",
            className: "etc-jupyterlab-authoring-button",
            htmlOn: recordOn,
            htmlOff: recordOff,
            position: 10,
            keyBinding: "F9",
            notebookPanel: notebookPanel
        })
    }
}

export class PlayButton extends NotebookMenuToggleButton {
    constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({
            altName: "Play Button",
            eventName: "play",
            className: "etc-jupyterlab-authoring-button",
            htmlOn: playOn,
            htmlOff: playOff,
            position: 11,
            keyBinding: "F10",
            notebookPanel: notebookPanel
        })
    }
}


export class ExecutionEvent {

    private _executionFinished: Signal<ExecutionEvent, EventMessage> = new Signal(this);
    private _app: JupyterFrontEnd;
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: Editor;

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
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor).editor;

        notebookPanel.disposed.connect(this.dispose, this);
        cell.disposed.connect(this.dispose, this);
    }

    public dispose() {
        Signal.disconnectAll(this);
    }

    public enable(sender: NotebookMenuToggleButton, args: any) {
        NotebookActions.executed.connect(this.onFinishExecution, this);
    }

    public disable(sender: NotebookMenuToggleButton, args: any) {
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

            this._executionFinished.emit({
                event: "execution_finished",
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                output: output,
                timestamp: Date.now()
            });
        }
    }

    get executionFinished(): ISignal<ExecutionEvent, any> {
        return this._executionFinished;
    }
}

export class EditorEvent {

    static _cell_id: string;
    private _captureStarted: Signal<EditorEvent, EventMessage> = new Signal(this);
    private _captureStopped: Signal<EditorEvent, EventMessage> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _editor: Editor;
    private _line: number = -1;
    private _text: string;
    private _isCapturing: boolean = false;
    private _app: JupyterFrontEnd;
    private _keymap: { Space: (instance: Editor) => void };

    constructor({ app, notebookPanel, cell }: { app: JupyterFrontEnd, notebookPanel: NotebookPanel, cell: Cell }) {
        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cell = cell;
        this._editor = (cell.editorWidget.editor as CodeMirrorEditor).editor;

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

    public enable(sender: NotebookMenuToggleButton, args: any) {
        this._editor.addKeyMap(this._keymap);
        this._editor.on("focus", this.onFocus);
        this._editor.on("blur", this.onBlur);
        this._notebookPanel.content.node.addEventListener("keydown", this.onCellStart, true);
    }

    public disable(sender: NotebookMenuToggleButton, args: any) {
        this._editor.removeKeyMap(this._keymap);
        this._editor.off("focus", this.onFocus);
        this._editor.off("blur", this.onBlur);
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

    private onCellStart(event: Event) {

        if (this._cell == this._notebookPanel.content.activeCell && !this._editor.hasFocus()) {
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

    private onBlur(instance: Editor, event: Event) {
        console.log("onBlur", this._cell.model.id);

        if (this._isCapturing) {
            this.stop();
        }
        this._editor.on("focus", this.onFocus);
        this._editor.off("cursorActivity", this.onCursorActivity);
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
        this._captureStarted.emit({
            event: 'capture_started',
            notebook_id: this._notebookPanel.content.id,
            cell_id: this._cell.model.id,
            line: this._line,
            input: this._text,
            timestamp: Date.now()
        });
    }

    private stop() {
        console.log("captureStopped")
        this._isCapturing = false;
        this._captureStopped.emit({
            event: 'capture_stopped',
            notebook_id: this._notebookPanel.content.id,
            cell_id: this._cell.model.id,
            line: this._line,
            input: this._text,
            timestamp: Date.now()
        });
    }

    get captureStarted(): ISignal<EditorEvent, any> {
        return this._captureStarted;
    }

    get captureStopped(): ISignal<EditorEvent, any> {
        return this._captureStopped;
    }
}

export class CellsEvent {

    private _notebookPanel: NotebookPanel;
    private _app: JupyterFrontEnd;
    private _messageReceivedEvent: MessageReceivedEvent;
    private _recordButton: NotebookMenuToggleButton;

    constructor(
        { app, notebookPanel, messageReceivedEvent, recordButton }:
            {
                app: JupyterFrontEnd,
                notebookPanel: NotebookPanel,
                messageReceivedEvent: MessageReceivedEvent,
                recordButton: NotebookMenuToggleButton
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
                //  All we get is the CellModel; hence, we need to find the Cell in the widgets.

                if (cell !== undefined) {

                    //  EditorEvent
                    let editorEvent = new EditorEvent(
                        { app: this._app, notebookPanel: this._notebookPanel, cell });
                    editorEvent.captureStarted.connect(
                        this._messageReceivedEvent.onReceiveMessage, this._messageReceivedEvent);
                    editorEvent.captureStopped.connect(
                        this._messageReceivedEvent.onReceiveMessage, this._messageReceivedEvent);

                    this._recordButton.buttonEnabled.connect(editorEvent.enable, editorEvent);
                    this._recordButton.buttonDisabled.connect(editorEvent.disable, editorEvent);
                    //  EditorEvent


                    //  ExecutionEvent
                    let executionEvent = new ExecutionEvent(
                        { app: this._app, notebookPanel: this._notebookPanel, cell });
                    executionEvent.executionFinished.connect(
                        this._messageReceivedEvent.onReceiveMessage, this._messageReceivedEvent);

                    this._recordButton.buttonEnabled.connect(executionEvent.enable, executionEvent);
                    this._recordButton.buttonDisabled.connect(executionEvent.disable, executionEvent);
                    //  ExecutionEvent

                }
            });
        }
        else {
            console.log("Unhandled cells changed event: ", args);
        }
    }
}