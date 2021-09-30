import { Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { MessageAggregator, MessagePlayer } from './authoring';
import { AudioSelectorWidget, AdvanceButton, PauseButton, PlayButton, RecordButton, SaveButton, StopButton } from './components';
import { CodeCell, Cell, ICellModel, MarkdownCell, RawCell } from '@jupyterlab/cells';
import { Editor } from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { EventMessage } from './types';

export class Listener {

    private _app: JupyterFrontEnd;
    private _messageAggregator: MessageAggregator;
    private _notebookPanel: NotebookPanel;
    private _cellIndex: number | null;
    private _lineIndex: number;
    private _isRecording: boolean = false;
    private _editor: Editor;
    private _cell: Cell<ICellModel>;
    
    constructor({
        app,
        notebookPanel
    }:
        {
            app: JupyterFrontEnd,
            notebookPanel: NotebookPanel
        }) {

        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cellIndex = null;
    }

    onRecordPressed(sender: RecordButton, event: Event) {

        if (!this._isRecording && !this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")) {

            if (!this._messageAggregator) {
                this._messageAggregator = new MessageAggregator();
            }

            this._isRecording = true;

            this._messageAggregator.aggregate({
                event: "record",
                notebook_id: this._notebookPanel.content.id,
                timestamp: Date.now()
            });

            this._notebookPanel.content.node.focus();

            if (this._editor) {
                this._editor.focus();
            }
        }
    }

    onStopPressed(sender: StopButton, event: Event) {

        if (this._isRecording) {

            this._isRecording = false;

            if (this._cell) {
                this._cell.editor.blur();
            }

            if (this._notebookPanel.content.widgets.length) {

                this._cell = null;

                this._editor = null;

                this._cellIndex = null;
            }

            this._messageAggregator.aggregate({
                event: "stop",
                notebook_id: this._notebookPanel.content.id,
                timestamp: Date.now()
            });
        }
    }

    onPlayPressed(sender: PlayButton, event: Event) {

        if (!this._isRecording && this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")) {

            let messages = ((this._notebookPanel.content.model.metadata.get("etc_jupyterlab_authoring") as unknown) as Array<EventMessage>);

            this._notebookPanel.content.model.cells.removeRange(0, this._notebookPanel.content.model.cells.length);

            const cell = this._notebookPanel.content.model.contentFactory.createCell(
                this._notebookPanel.content.notebookConfig.defaultCell,
                {}
            );

            this._notebookPanel.content.model.cells.insert(0, cell);

            let messagePlayer = new MessagePlayer({ notebookPanel: this._notebookPanel, messages });

            messagePlayer.playMessage();
        }
    }

    public async onSavePressed(sender: SaveButton, event: Event) {

        this._isRecording = false;

        if (this._messageAggregator) {

            try {
                this._notebookPanel = await this._app.commands.execute("notebook:create-new", {
                    kernelName: "python3", cwd: ""
                });

                await this._notebookPanel.revealed;
                await this._notebookPanel.sessionContext.ready;

                this._notebookPanel.content.model.metadata.set("etc_jupyterlab_authoring", this._messageAggregator._eventMessages as any);
                await this._notebookPanel.context.saveAs();
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    onAdvancePressed(sender: AdvanceButton, event: Event) {

        if (this._isRecording && this._notebookPanel.isVisible) {

            event.stopImmediatePropagation();
            event.preventDefault();

            if (this._cellIndex === null) {

                this.advanceCursor();

                this._messageAggregator.aggregate({
                    event: 'cell_started',
                    notebook_id: this._notebookPanel.content.id,
                    timestamp: Date.now()
                });
            }
            else {

                let line = this._editor.getLine(this._lineIndex);

                this._messageAggregator.aggregate({
                    event: 'line_finished',
                    notebook_id: this._notebookPanel.content.id,
                    cell_id: this._cell.model.id,
                    cell_index: this._cellIndex,
                    cell_type: this._cell.model.type,
                    line_index: this._lineIndex,
                    input: line,
                    timestamp: Date.now()
                });

                this.advanceCursor();
            }
        }
    }

    onExecutionScheduled(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this._isRecording && this._notebookPanel.content == args.notebook) {

            let line = this._editor.getLine(this._lineIndex);

            this._messageAggregator.aggregate({
                event: 'line_finished',
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._cellIndex,
                cell_type: this._cell.model.type,
                line_index: this._lineIndex,
                input: line,
                timestamp: Date.now()
            });
        }
    }

    onExecuted(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this._isRecording && this._notebookPanel.content == args.notebook) {

            let outputs: Array<nbformat.IOutput> = [];

            if (args.cell.model.type == "code") {
                outputs = (this._cell as CodeCell).model.outputs.toJSON();
            }

            this._messageAggregator.aggregate({
                event: "execution_finished",
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._notebookPanel.content.widgets.indexOf(this._cell),
                cell_type: this._cell.model.type,
                outputs: outputs,
                timestamp: Date.now()
            });

            this.advanceCursor();
        }
    }

    advanceCursor() {

        if (this._cellIndex === null) {

            this._cellIndex = 0;

            this._lineIndex = 0;

            this._cell = this._notebookPanel.content.widgets[this._cellIndex];

            this._editor = (this._cell.editorWidget.editor as CodeMirrorEditor).editor

            this._editor.focus();

            this._editor.setCursor(this._lineIndex, 0);
        }
        else if (this._lineIndex < this._editor.lastLine()) {

            this._lineIndex = this._lineIndex + 1;

            this._editor.setCursor(this._lineIndex, 0);
        }
        else if (
            this._lineIndex === this._editor.lastLine() &&
            this._cellIndex < this._notebookPanel.content.widgets.length - 1
        ) {

            this._cellIndex = this._cellIndex + 1;

            this._cell = this._notebookPanel.content.widgets[this._cellIndex];

            this._editor = (this._cell.editorWidget.editor as CodeMirrorEditor).editor

            this._editor.focus();

            this._lineIndex = 0;

            this._editor.setCursor(this._lineIndex, 0);
        }
        else {

            this._cell.editor.blur();

            this._notebookPanel.content.node.focus();

            this._cellIndex = null;
        }
    }
}