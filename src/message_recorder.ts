/// <reference types="@types/dom-mediacapture-record" />

import { Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { MessageAggregator, MessagePlayer } from './message_player';
import { AudioSelectorWidget, AdvanceButton, PauseButton, PlayButton, RecordButton, SaveButton, StopButton } from './components';
import { CodeCell, Cell, ICellModel, MarkdownCell, RawCell } from '@jupyterlab/cells';
import { Editor } from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { EventMessage } from './types';
import { Signal } from '@lumino/signaling';

export class MessageRecorder {

    private _app: JupyterFrontEnd;
    private _messageAggregator: MessageAggregator;
    private _notebookPanel: NotebookPanel;
    private _cellIndex: number | null;
    private _lineIndex: number;
    private _isRecording: boolean = false;
    private _editor: Editor;
    private _cell: Cell<ICellModel>;
    private _recording: Promise<Blob>;
    private _mediaStream: Promise<MediaStream>;
    private _mediaRecorder: MediaRecorder;
    public _eventMessages: Array<EventMessage> = [];
    private _lastMessageTimeStamp: number | null;

    constructor({
        app,
        notebookPanel
    }:
        {
            app: JupyterFrontEnd,
            notebookPanel: NotebookPanel,
        }) {

        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cellIndex = null;

        this._notebookPanel.disposed.connect(this.dispose, this);
        this._lastMessageTimeStamp = null;
    }

    dispose() {

        Signal.disconnectAll(this);
    }

    public async onDeviceSelected(sender: AudioSelectorWidget, deviceId: string) {

        this._mediaStream = navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
    }

    public async startAudioCapture() {

        try {

            this._mediaRecorder = new MediaRecorder(await this._mediaStream);

            this._recording = new Promise<Blob>((r, j) => {

                let recordings: Array<Blob> = [];

                this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
                    recordings.push(event.data);
                });

                this._mediaRecorder.addEventListener('stop', () => {

                    r(new Blob(recordings, { 'type': 'audio/ogg; codecs=opus' }));
                });

                this._mediaRecorder.addEventListener('error', j);
            });

            this._mediaRecorder.start()
        }
        catch (e) {
            console.error(e);
        }
    }

    public stopAudioCapture() {
        this._mediaRecorder.stop();
    }

    public async onRecordPressed(sender: RecordButton, event: Event) {

        if (
            !this._isRecording &&
            this._notebookPanel.isVisible &&
            !this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")
        ) {

            if (!this._messageAggregator) {
                this._messageAggregator = new MessageAggregator();
            }

            this._isRecording = true;

            this._messageAggregator.aggregate({
                event: "record_started",
                notebook_id: this._notebookPanel.content.id,
                timestamp: Date.now()
            });

            this._notebookPanel.content.node.focus();

            if (this._editor) {
                this._editor.focus();
            }

            await this.startAudioCapture();
        }
    }

    public async onStopPressed(sender: StopButton, event: Event) {

        if (this._isRecording && this._notebookPanel.isVisible) {

            event.stopImmediatePropagation();
            event.preventDefault();

            this.stopAudioCapture();

            let line = this._editor.getLine(this._lineIndex);

            this._messageAggregator.aggregate({
                event: 'record_stopped',
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._cellIndex,
                cell_type: this._cell.model.type,
                line_index: this._lineIndex,
                input: line,
                timestamp: Date.now(),
                recording: this._recording
            });

            this._isRecording = false;
        }
    }

    public async onAdvancePressed(sender: AdvanceButton, event: Event) {

        if (this._isRecording && this._notebookPanel.isVisible) {

            event.stopImmediatePropagation();
            event.preventDefault();

            this._authoringRecorder.stop();

            if (this._cellIndex === null) {

                this.advanceCursor();

                this._messageAggregator.aggregate({
                    event: 'cell_started',
                    notebook_id: this._notebookPanel.content.id,
                    timestamp: Date.now(),
                    recording: this._authoringRecorder.recording
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
                    timestamp: Date.now(),
                    recording: this._authoringRecorder.recording
                });

                this.advanceCursor();

            }

            await this._authoringRecorder.start();
        }
    }

    public async onExecutionScheduled(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this._isRecording && this._notebookPanel.content == args.notebook) {

            this._authoringRecorder.stop();

            let line = this._editor.getLine(this._lineIndex);

            this._messageAggregator.aggregate({
                event: 'line_finished',
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._cellIndex,
                cell_type: this._cell.model.type,
                line_index: this._lineIndex,
                input: line,
                timestamp: Date.now(),
                recording: this._authoringRecorder.recording
            });

            await this._authoringRecorder.start();
        }
    }

    public async onExecuted(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this._isRecording && this._notebookPanel.content == args.notebook) {

            this._authoringRecorder.stop();

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
                timestamp: Date.now(),
                recording: this._authoringRecorder.recording
            });

            this.advanceCursor();

            await this._authoringRecorder.start();
        }
    }

    private advanceCursor() {

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

    public async onSavePressed(sender: SaveButton, event: Event) {

        this._isRecording = false;

        if (this._messageAggregator && this._notebookPanel.isVisible) {

            try {

                this._notebookPanel = await this._app.commands.execute("notebook:create-new", {
                    kernelName: "python3", cwd: ""
                });

                await this._notebookPanel.revealed;

                await this._notebookPanel.sessionContext.ready;

                this._messageAggregator._eventMessages.forEach(async (message: EventMessage) => {

                    if (message.recording) {

                        let recording = await message.recording;

                        let fileReader = new FileReader();

                        let prEvent = await new Promise<ProgressEvent<FileReader>>((r, j) => {

                            try {

                                fileReader.addEventListener('load', r);

                                fileReader.readAsDataURL(recording as Blob);
                            }
                            catch (e) {

                                console.error(e);
                            }
                        });

                        message.recordingDataURL = (prEvent.target.result as string);

                        delete message.recording;
                    }
                });

                this._notebookPanel.content.model.metadata.set(
                    "etc_jupyterlab_authoring",
                    this._eventMessages as any
                );

                await this._notebookPanel.context.saveAs();
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    public aggregateMessage(message: EventMessage) {

        switch (message.event) {
            case 'cell_started':
            case 'line_finished':
            case 'execution_finished':
            case 'record_stopped':

                message.start_timestamp = this._lastMessageTimeStamp === null ? message.timestamp : this._lastMessageTimeStamp;
                this._lastMessageTimeStamp = message.stop_timestamp = message.timestamp;
                message.duration = message.stop_timestamp - message.start_timestamp;
            //  The message must have a duration; hence, calculate a duration based on the timestamp of the previous message.
            case 'record_started':
            default: ;
        }

        this._eventMessages.push(message);

        console.log(message.input, message);
    }
}