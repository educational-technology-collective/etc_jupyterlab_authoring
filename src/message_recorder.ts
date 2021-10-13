/// <reference types="@types/dom-mediacapture-record" />

import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
import { AudioInputSelector, AdvanceButton, RecordButton, SaveButton, StopButton } from './components';
import { CodeCell, Cell, ICellModel } from '@jupyterlab/cells';
import { Editor } from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { EventMessage } from './types';
import { ISignal, Signal } from '@lumino/signaling';

export class MessageRecorder {

    private _recorderStarted: Signal<MessageRecorder, NotebookPanel> = new Signal<MessageRecorder, NotebookPanel>(this);
    private _recorderStopped: Signal<MessageRecorder, NotebookPanel> = new Signal<MessageRecorder, NotebookPanel>(this);

    private _app: JupyterFrontEnd;
    private _notebookPanel: NotebookPanel;
    private _cellIndex: number | null;
    private _lineIndex: number;
    private _isRecording: boolean = false;
    private _isPlaying: boolean = false;
    private _editor: Editor;
    private _cell: Cell<ICellModel>;
    private _recording: Promise<Array<Blob>>;
    private _mediaStream: MediaStream | null = null;
    private _mediaRecorder: MediaRecorder;
    public _eventMessages: Array<EventMessage> = [];
    private _timestamp: number;

    constructor({
        app,
        notebookPanel,
        audioInputSelector
    }:
        {
            app: JupyterFrontEnd,
            notebookPanel: NotebookPanel,
            audioInputSelector: AudioInputSelector
        }) {

        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cellIndex = null;
        this._notebookPanel.disposed.connect(this.onDisposed, this);

        (async ()=>{

            this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: audioInputSelector.deviceId } });
        })();
    }

    public onDisposed(sender: NotebookPanel | MessageRecorder, args: any) {

        Signal.disconnectAll(this);
    }

    public onPlayerStarted() {

        this._isPlaying = true;
    }

    public onPlayerStopped() {

        this._isPlaying = false;
    }

    public async onDeviceSelected(sender: AudioInputSelector, deviceId: string) {

        this._mediaStream = null;

        this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
    }

    public onRecordPressed(sender: RecordButton, event: Event) {

        if (
            this._mediaStream &&
            !this._isPlaying &&
            !this._isRecording &&
            this._notebookPanel.isVisible &&
            !this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")
        ) {

            this.aggregateMessage({
                event: "record_started",
                notebook_id: this._notebookPanel.content.id
            });

            this._notebookPanel.content.node.focus();

            if (this._editor) {
                this._editor.focus();
            }

            this.startAudioCapture();

            this._isRecording = true;

            this._recorderStarted.emit(this._notebookPanel);
        }
    }

    public onStopPressed(sender: StopButton | null, event: Event | null) {

        if (this._notebookPanel.isVisible) {

            if (this._isRecording) {

                event.stopImmediatePropagation();
                event.preventDefault();

                if (this._editor) {

                    let line = this._editor.getLine(this._lineIndex);

                    this.aggregateMessage({
                        event: 'record_stopped',
                        notebook_id: this._notebookPanel.content.id,
                        cell_id: this._cell.model.id,
                        cell_index: this._cellIndex,
                        cell_type: this._cell.model.type,
                        line_index: this._lineIndex,
                        input: line
                    });
                }
                else {
                    this.aggregateMessage({
                        event: 'record_stopped',
                        notebook_id: this._notebookPanel.content.id
                    });
                }

                this._recorderStopped.emit(this._notebookPanel);

                this._isRecording = false;
                this._cellIndex = null;
                this._editor = null;
                this._notebookPanel.content.widgets[0].editorWidget.editor.focus();
                this._notebookPanel.content.widgets[0].editorWidget.editor.blur();
                this._notebookPanel.content.node.focus();
            }
        }
    }

    public onAdvancePressed(sender: AdvanceButton, event: Event) {

        if (this._isRecording && this._notebookPanel.isVisible) {

            event.stopImmediatePropagation();
            event.preventDefault();

            if (this._cellIndex === null) {

                this.aggregateMessage({
                    event: 'cell_started',
                    notebook_id: this._notebookPanel.content.id
                });
            }
            else {

                let line = this._editor.getLine(this._lineIndex);

                this.aggregateMessage({
                    event: 'line_finished',
                    notebook_id: this._notebookPanel.content.id,
                    cell_id: this._cell.model.id,
                    cell_index: this._cellIndex,
                    cell_type: this._cell.model.type,
                    line_index: this._lineIndex,
                    input: line
                });

            }

            this.advanceCursor();

            this.startAudioCapture();
        }
    }

    public onExecutionScheduled(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this._isRecording && args.notebook.isVisible) {

            let line = this._editor.getLine(this._lineIndex);

            this.aggregateMessage({
                event: 'line_finished',
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._cellIndex,
                cell_type: this._cell.model.type,
                line_index: this._lineIndex,
                input: line
            });

            this.startAudioCapture();
        }
    }

    public onExecuted(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this._isRecording && this._notebookPanel.content == args.notebook) {

            let outputs: Array<nbformat.IOutput> = [];

            if (args.cell.model.type == "code") {
                outputs = (this._cell as CodeCell).model.outputs.toJSON();
            }

            this.aggregateMessage({
                event: "execution_finished",
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._notebookPanel.content.widgets.indexOf(this._cell),
                cell_type: this._cell.model.type,
                outputs: outputs
            });

            this.advanceCursor();

            this.startAudioCapture();
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

        if (this._isRecording) {

            this.onStopPressed(null, null);
        }

        this._isRecording = false;

        if (this._eventMessages.length && this._notebookPanel.isVisible) {

            try {

                this._notebookPanel = await this._app.commands.execute("notebook:create-new", {
                    kernelName: "python3", cwd: ""
                });

                await this._notebookPanel.revealed;

                await this._notebookPanel.sessionContext.ready;

                for (let message of this._eventMessages) {

                    if (message.recording) {

                        let recording = await message.recording;

                        let fileReader = new FileReader();

                        let event = await new Promise<ProgressEvent<FileReader>>((r, j) => {

                            try {

                                fileReader.addEventListener('load', r);

                                fileReader.addEventListener('error', j);

                                fileReader.readAsDataURL(new Blob(recording,  { 'type': 'audio/ogg; codecs=opus' }) as Blob);
                            }
                            catch (e) {

                                console.error(e);
                            }
                        });

                        message.recordingDataURL = (event.target.result as string);

                        delete message.recording;
                    }
                }

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

        let now = Date.now();

        this.stopAudioCapture();

        switch (message.event) {
            case 'cell_started':
            case 'line_finished':
            case 'execution_finished':
            case 'record_stopped':
                message.start_timestamp = this._timestamp;
                message.stop_timestamp = now;
                message.duration = message.stop_timestamp - message.start_timestamp;
                message.recording = this._recording;
                this._timestamp = now;
                break;
            //  The message must have a duration; hence, calculate a duration based on the timestamp of the previous message.
            case 'record_started':
                this._timestamp = now;
                message.start_timestamp = now;
                message.stop_timestamp = now;
                message.duration = 0;
                break;
            default: ;
        }

        this._eventMessages.push(message);

        console.log(message.input, message);
    }

    public startAudioCapture() {

        try {

            this._mediaRecorder = new MediaRecorder(this._mediaStream);

            this._recording = new Promise<Array<Blob>>((r, j) => {

                let recordings: Array<Blob> = [];

                this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {

                    recordings.push(event.data);
                });

                this._mediaRecorder.addEventListener('stop', () => {

                    r(recordings);
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

        if (this._mediaRecorder?.state == 'recording') {

            this._mediaRecorder.stop();
        }
    }

    get recorderStarted(): ISignal<MessageRecorder, NotebookPanel> {
        return this._recorderStarted;
    }

    get recorderStopped(): ISignal<MessageRecorder, NotebookPanel> {
        return this._recorderStopped;
    }
}