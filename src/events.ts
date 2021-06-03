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


export class RecordButton extends Widget {

    private _buttonEvent: Signal<this, string>;
    private _state: boolean = false;
    private _notebookPanel: NotebookPanel;

    constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

        super({ tag: "button" });

        this._buttonEvent = new Signal<this, string>(this);
        this._notebookPanel = notebookPanel;

        this.node.className = ""

        this.addClass("etc-jupyterlab-authoring-record-button");

        this.event = this.event.bind(this);
        this.keydown = this.keydown.bind(this);

        this.node.addEventListener("click", this.event);

        notebookPanel.toolbar.insertItem(10, "RecordButton", this);

        this.node.innerHTML = recordOff + " Record";

        document.addEventListener("keydown", this.keydown)
    }

    dispose() {
        this.node.removeEventListener("click", this.event);
        document.removeEventListener("keydown", this.keydown);
        super.dispose();
        Signal.disconnectSender(this);
    }

    keydown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key == "F9") {
            if (this._notebookPanel.isVisible) {
                this.event();
            }
        }
    }

    event() {
        if (this._state) {
            this._state = false;
            this.node.innerHTML = recordOff + " Record";
            this._buttonEvent.emit("off");
        }
        else {
            this._state = true;
            this.node.innerHTML = recordOn + " Record";
            this._buttonEvent.emit("on");
        }
    }

    get buttonEvent(): ISignal<this, string> {
        return this._buttonEvent;
    }
}

interface EventMessenger {
    signal: ISignal<EventMessenger, any>;
}

interface StartMessage {
    event: string;
    time: number;
}

export class StartEvent implements EventMessenger {

    private _signal: Signal<StartEvent, StartMessage> = new Signal(this);

    constructor(
        { messageReceivedEvent, notebookPanel, recordButton }:
            { messageReceivedEvent: MessageReceivedEvent, notebookPanel: NotebookPanel, recordButton: RecordButton }
    ) {

        messageReceivedEvent.addEvent(this);

        notebookPanel.disposed.connect(this.dispose, this);

        recordButton.buttonEvent.connect(this.buttonEvent, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
    }

    private buttonEvent(sender: RecordButton, args: string) {
        if (args == "on") {
            this._signal.emit({
                event: 'start',
                time: Date.now()
            });
        }
    }

    get signal(): ISignal<StartEvent, StartMessage> {
        return this._signal;
    }
}

interface StopMessage {
    event: string;
    time: number;
}

export class StopEvent implements EventMessenger {

    private _signal: Signal<StopEvent, StopMessage> = new Signal(this);
    private _lastTimestamp: number = Date.now();

    constructor(
        { messageReceivedEvent, notebookPanel, recordButton }:
            { messageReceivedEvent: MessageReceivedEvent, notebookPanel: NotebookPanel, recordButton: RecordButton }
    ) {

        messageReceivedEvent.addEvent(this);

        messageReceivedEvent.signal.connect((sender: MessageReceivedEvent, args: MessageReceivedEventMessage) => {

            this._lastTimestamp = args.time;
        });

        notebookPanel.disposed.connect(this.dispose, this);

        recordButton.buttonEvent.connect(this.buttonEvent, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
    }

    private buttonEvent(sender: RecordButton, args: string) {
        if (args == "off") {
            this._signal.emit({
                event: 'stop',
                time: Date.now() - this._lastTimestamp
            });
        }
    }

    get signal(): ISignal<StopEvent, StopMessage> {
        return this._signal;
    }
}


interface CellSelectedMessage {
    event: string;
    position: number;
    id: string;
    time: number;
}

export class CellSelectedEvent implements EventMessenger {

    private _signal: Signal<CellSelectedEvent, CellSelectedMessage> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _lastTimestamp: number = Date.now();

    constructor(
        { messageReceivedEvent, notebookPanel }:
            {
                messageReceivedEvent: MessageReceivedEvent,
                notebookPanel: NotebookPanel
            }
    ) {

        messageReceivedEvent.addEvent(this);

        messageReceivedEvent.signal.connect((sender: MessageReceivedEvent, args: MessageReceivedEventMessage) => {

            this._lastTimestamp = args.time;
        });

        this._notebookPanel = notebookPanel;

        this._notebookPanel.content.activeCellChanged.connect(this.notebookActiveCellChanged, this);

        notebookPanel.disposed.connect(this.dispose, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
    }

    get signal(): ISignal<CellSelectedEvent, CellSelectedMessage> {
        return this._signal;
    }

    notebookActiveCellChanged(sender: Notebook, args: Cell<ICellModel>) {
        this._signal.emit({
            event: "cell_selected",
            position: this._notebookPanel.content.widgets.indexOf(args),
            id: args.model.id,
            time: Date.now() - this._lastTimestamp
        });
    }
}


export class CellsChangedEvent {

    private _messageReceivedEvent: MessageReceivedEvent;
    private _notebookPanel: NotebookPanel;
    private _app: JupyterFrontEnd;

    constructor(
        { app, messageReceivedEvent, notebookPanel }:
            {
                app: JupyterFrontEnd,
                messageReceivedEvent: MessageReceivedEvent,
                notebookPanel: NotebookPanel
            }
    ) {
        this._messageReceivedEvent = messageReceivedEvent;
        this._notebookPanel = notebookPanel;
        this._app = app;

        notebookPanel.content.widgets.forEach((cell: Cell<ICellModel>) => {

            new LineDownEvent({ messageReceivedEvent, notebookPanel, cell });
            new EOLEvent({ messageReceivedEvent, notebookPanel, cell });
            new ExecuteCellEvent({ app, messageReceivedEvent, notebookPanel, cell });

        });

        notebookPanel.content.model?.cells.changed.connect(this.cellsChanged, this);
    }

    private cellsChanged(sender: IObservableUndoableList<ICellModel>, args: IObservableList.IChangedArgs<ICellModel>) {

        console.log(args);

        if (args.type == "add" || args.type == "set") {

            args.newValues.forEach((cellModel: ICellModel) => {

                let cell = this._notebookPanel.content.widgets.find((cell: Cell<ICellModel>) => cell.model === cellModel);
                //  All we have is the CellModel; hence, we need to find the Cell in the widgets.

                if (cell !== undefined) {

                    let options = {
                        messageReceivedEvent: this._messageReceivedEvent,
                        notebookPanel: this._notebookPanel,
                        cell: cell
                    }

                    new LineDownEvent(options);
                    new EOLEvent(options);
                    new ExecuteCellEvent({ ...{ app: this._app }, ...options });
                }
            });
        }
        else {
            console.log("Unhandled cells changed event: ", args);
        }
    }
}


interface LineDownMessage {
    event: string;
    cell_position: number;
    id: string;
    cell_type: string;
    time: number;
    from_lastLine: string | undefined;
    to_lastLine: string | undefined;
    eol: boolean;
}

export class LineDownEvent implements EventMessenger {

    private _signal: Signal<LineDownEvent, LineDownMessage> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _lastTimestamp: number = Date.now();
    private _editor: CodeMirrorEditor;
    private _lastLine: number = -1;
    private _cell: Cell<ICellModel>;

    constructor(
        { messageReceivedEvent, notebookPanel, cell }:
            {
                messageReceivedEvent: MessageReceivedEvent,
                notebookPanel: NotebookPanel,
                cell: Cell<ICellModel>
            }
    ) {
        this.cursorActivityOrFocus = this.cursorActivityOrFocus.bind(this);
        this.blur = this.blur.bind(this);
        this.dispose = this.dispose.bind(this);

        this._notebookPanel = notebookPanel;
        this._cell = cell;

        messageReceivedEvent.addEvent(this);

        messageReceivedEvent.signal.connect((sender: MessageReceivedEvent, args: MessageReceivedEventMessage) => {

            this._lastTimestamp = args.time;
        });

        this._editor = (cell.editorWidget.editor as CodeMirrorEditor);

        this._editor.editor.on("cursorActivity", this.cursorActivityOrFocus);
        this._editor.editor.on("focus", this.cursorActivityOrFocus);
        this._editor.editor.on("blur", this.blur);

        cell.disposed.connect(this.dispose, this);
        notebookPanel.disposed.connect(this.dispose, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
        this._editor.editor.off("cursorActivity", this.cursorActivityOrFocus);
        this._editor.editor.off("focus", this.cursorActivityOrFocus);
        this._editor.editor.off("blur", this.blur);
    }

    private cursorActivityOrFocus(instance: Editor) {

        let line = instance.getCursor().line;
        let fromLine = this._editor.getLine(line - 1);
        let toLine = this._editor.getLine(line);

        if (line > this._lastLine) {
            this._lastLine = line;
            this._signal.emit({
                event: "line",
                id: this._cell.model.id,
                cell_position: this._notebookPanel.content.widgets.indexOf(this._cell),
                cell_type: this._cell.model.type,
                time: Date.now() - this._lastTimestamp,
                from_lastLine: fromLine ? fromLine : "",
                to_lastLine: toLine ? toLine : "",
                eol: line === this._editor.lastLine()
            });
        }
    }

    private blur(instance: Editor) {

    }

    get signal(): ISignal<LineDownEvent, LineDownMessage> {
        return this._signal;
    }
}

interface EOLMessage {
    event: string;
    position: number;
    id: string;
    time: number;
}

export class EOLEvent implements EventMessenger {

    private _signal: Signal<EOLEvent, EOLMessage> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _lastTimestamp: number = Date.now();
    private _editor: Editor;
    private _eol: boolean = false;

    constructor(
        { messageReceivedEvent, notebookPanel, cell }:
            {
                messageReceivedEvent: MessageReceivedEvent,
                notebookPanel: NotebookPanel,
                cell: Cell<ICellModel>
            }
    ) {

        this.keyHandled = this.keyHandled.bind(this);

        this._cell = cell;
        this._notebookPanel = notebookPanel;

        messageReceivedEvent.addEvent(this);

        messageReceivedEvent.signal.connect((sender: MessageReceivedEvent, args: MessageReceivedEventMessage) => {
            this._lastTimestamp = args.time;
        }, this);

        this._editor = (cell.editorWidget.editor as CodeMirrorEditor).editor;

        this._editor.on("keyHandled", this.keyHandled);

        notebookPanel.disposed.connect(this.dispose, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
        this._editor.off("keyHandled", this.keyHandled);
    }

    get signal(): ISignal<EOLEvent, EOLMessage> {
        return this._signal;
    }

    keyHandled(instance: CodeMirror.Editor, name: string, event: KeyboardEvent) {
        if (name == "Down" && this._notebookPanel.content.activeCell !== this._cell) {
            this._signal.emit({
                event: "eol",
                position: this._notebookPanel.content.widgets.indexOf(this._cell),
                id: this._cell.model.id,
                time: Date.now() - this._lastTimestamp
            });
        }
    }
}


interface ExecuteCellMessage {
    event: string;
    position: number;
    id: string;
    time: number;
}

export class ExecuteCellEvent implements EventMessenger {

    private _signal: Signal<ExecuteCellEvent, ExecuteCellMessage> = new Signal(this);
    private _notebookPanel: NotebookPanel;
    private _cell: Cell<ICellModel>;
    private _lastTimestamp: number = Date.now();
    private _editor: Editor;
    private _runButton: Element | null;
    private _app: JupyterFrontEnd;


    constructor(
        { app, messageReceivedEvent, notebookPanel, cell }:
            {
                app: JupyterFrontEnd,
                messageReceivedEvent: MessageReceivedEvent,
                notebookPanel: NotebookPanel,
                cell: Cell<ICellModel>
            }
    ) {

        this.clickRun = this.clickRun.bind(this);

        this._cell = cell;
        this._notebookPanel = notebookPanel;
        this._app = app;

        messageReceivedEvent.addEvent(this);

        messageReceivedEvent.signal.connect((sender: MessageReceivedEvent, args: MessageReceivedEventMessage) => {
            this._lastTimestamp = args.time;
        }, this);

        for (
            this._runButton = notebookPanel.toolbar.node.querySelector("[data-icon='ui-components:run']");
            this._runButton?.tagName !== "DIV";
            this._runButton = (this._runButton as Element).parentElement
        );
        //  The only thing that uniquely identifies the run button in the DOM is the data-icon attr; hence, use it.
        //  The Button Widgets don't have unique class names; hence, climb the tree in order to get to the first DIV.

        this._runButton.addEventListener("click", this.clickRun, { capture: false });

        this._editor = (cell.editorWidget.editor as CodeMirrorEditor).editor;

        app.commands.commandExecuted.connect(this.commandExecuted, this);

        notebookPanel.disposed.connect(this.dispose, this);

        cell.disposed.connect(this.dispose, this);
    }

    private dispose() {
        Signal.disconnectAll(this);
        if (this._runButton) {
            this._runButton.removeEventListener("click", this.clickRun, { capture: false });
        }
    }

    get signal(): ISignal<ExecuteCellEvent, ExecuteCellMessage> {
        return this._signal;
    }

    commandExecuted(sender: CommandRegistry, args: CommandRegistry.ICommandExecutedArgs) {
        if (
            this._notebookPanel.isVisible &&
            this._notebookPanel.content.activeCell == this._cell &&
            args.id == "notebook:run-cell-and-select-next") {
            this._signal.emit({
                event: "execute_cell",
                position: this._notebookPanel.content.widgets.indexOf(this._cell),
                id: this._cell.model.id,
                time: Date.now() - this._lastTimestamp
            });
        }
    }

    clickRun() {
        if (
            this._notebookPanel.isVisible &&
            this._notebookPanel.content.activeCell == this._cell) {
            this._signal.emit({
                event: "execute_cell",
                position: this._notebookPanel.content.widgets.indexOf(this._cell),
                id: this._cell.model.id,
                time: Date.now() - this._lastTimestamp
            });
        }
    }
}


interface MessageReceivedEventMessage {
    time: number;
}

export class MessageReceivedEvent implements EventMessenger {

    private _signal: Signal<MessageReceivedEvent, MessageReceivedEventMessage> = new Signal<MessageReceivedEvent, MessageReceivedEventMessage>(this);
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

    public addEvent(event: EventMessenger) {
        event.signal.connect(this.eventMessengerMessage, this);
    }

    private eventMessengerMessage(sender: EventMessenger, args: any) {

        this._signal.emit({ time: Date.now() });

        console.log("Message: ", args);
    }

    get signal(): ISignal<MessageReceivedEvent, MessageReceivedEventMessage> {
        return this._signal;
    }
}