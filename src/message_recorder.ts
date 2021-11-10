/// <reference types="@types/dom-mediacapture-record" />

import { Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell, Cell, ICellModel } from '@jupyterlab/cells';
import { Editor } from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { EventMessage } from './types';
import { MessagePlayer } from './message_player';
import { AudioInputSelector } from './audio_input_selector';
import { StatusIndicator } from './status_indicator';

export class MessageRecorder {

    public messagePlayer: MessagePlayer;
    public isRecording: boolean = false;

    private _notebookPanel: NotebookPanel;
    private _cellIndex: number | null;
    private _lineIndex: number;
    private _editor: Editor;
    private _cell: Cell<ICellModel>;
    private _recording: Promise<Blob>;
    private _mediaStream: Promise<MediaStream>;
    private _mediaRecorder: MediaRecorder;
    private _eventMessages: Array<EventMessage> = [];
    private _lastTimestamp: number;
    private _statusIndicator: StatusIndicator;

    constructor({
        notebookPanel,
        audioInputSelector,
        statusIndicator
    }:
        {
            notebookPanel: NotebookPanel,
            audioInputSelector: AudioInputSelector,
            statusIndicator: StatusIndicator
        }) {

        this._notebookPanel = notebookPanel;
        this._cellIndex = null;
        this._statusIndicator = statusIndicator;

        this._notebookPanel.disposed.connect(this.dispose, this);

        NotebookActions.executionScheduled.connect(this.executionScheduled, this);
        NotebookActions.executed.connect(this.executed, this);

        window.addEventListener("keydown", this.handleKeydown.bind(this), true);

        audioInputSelector.eventTarget.addEventListener('audio_device_change', (event: Event) => this.onAudioDeviceChanged((event as CustomEvent).detail));

        (async () => {
            try {

                await (this._mediaStream = navigator.mediaDevices.getUserMedia({ audio: { deviceId: audioInputSelector.deviceId } }));
            }
            catch (e) {
                console.error(e);
            }
        })();
    }

    public dispose(sender: NotebookPanel, args: any) {

    }

    handleKeydown(event: KeyboardEvent) {

        try {

            if (this._notebookPanel.isVisible) {

                if (event.ctrlKey && event.key == "F8") {

                    if (
                        !this.isRecording &&
                        !this.messagePlayer.isPlaying
                    ) {

                        event.stopImmediatePropagation();
                        event.preventDefault();

                        this.startRecorder();
                    }
                }
                else if (event.ctrlKey && event.key == "F9") {

                    if (this.isRecording) {

                        event.stopImmediatePropagation();
                        event.preventDefault();

                        this.stopRecorder();
                    }
                }
                else if (event.ctrlKey && event.key == "F12") {

                    if (!this.isRecording) {

                        event.stopImmediatePropagation();
                        event.preventDefault();

                        this.saveRecording();
                    }
                }
                else if (event.code == "Space") {

                    if (this.isRecording) {

                        event.stopImmediatePropagation();
                        event.preventDefault();

                        this.advanceLine();
                    }
                }
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public async onAudioDeviceChanged(deviceId: string) {

        try {

            await (this._mediaStream = navigator.mediaDevices.getUserMedia({ audio: { deviceId } }));
        }
        catch (e) {

            console.error(e);
        }
    }

    private async startAudioRecorder() {

        try {

            this._mediaRecorder = new MediaRecorder(await this._mediaStream);

            this._recording = new Promise((r, j) => {

                let recordings: Array<Blob> = [];

                this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {

                    recordings.push(event.data);
                });

                this._mediaRecorder.addEventListener('stop', () => {

                    r(new Blob(recordings, { 'type': 'audio/ogg; codecs=opus' }));
                });

                this._mediaRecorder.addEventListener('error', j);
            });

            this._mediaRecorder.start();

            await this._recording;
        }
        catch (e) {

            console.error(e);
        }
    }

    public startRecorder() {

        try {

            this.startAudioRecorder();

            this._eventMessages = [];

            this.aggregateMessage({
                event: "record_started",
                notebook_id: this._notebookPanel.content.id
            });

            this._notebookPanel.content.node.focus();

            if (this._editor) {

                this._editor.focus();
            }

            this.isRecording = true;

            this._statusIndicator.record(this._notebookPanel);
        }
        catch (e) {

            console.error(e);
        }
    }

    public async stopRecorder() {

        if (this._editor) {
            //  The MessageRecorder may or may not have an editor when it stops; hence handle these cases separately.
            let input = this._editor.getLine(this._lineIndex);

            this.aggregateMessage({
                event: 'record_stopped',
                notebook_id: this._notebookPanel.content.id,
                cell_id: this._cell.model.id,
                cell_index: this._cellIndex,
                cell_type: this._cell.model.type,
                line_index: this._lineIndex,
                input: input
            });
        }
        else {

            this.aggregateMessage({
                event: 'record_stopped',
                notebook_id: this._notebookPanel.content.id
            });
        }

        if (this._mediaRecorder?.state == 'recording') {

            this._mediaRecorder.stop();
        }

        this.messagePlayer.recording = await this._recording;;
        this.messagePlayer.eventMessages = this._eventMessages;

        this.isRecording = false;
        this._cellIndex = null;
        this._editor = null;
        this._notebookPanel.content.widgets[0].editorWidget.editor.focus();
        this._notebookPanel.content.widgets[0].editorWidget.editor.blur();
        this._notebookPanel.content.node.focus();
    }

    public async saveRecording() {

        try {

            if (this.isRecording) {

                this.stopRecorder();
            }

            if (this._eventMessages.length && this._notebookPanel.isVisible) {

                let fileReader = new FileReader();

                fileReader.readAsDataURL(await this._recording);

                let event = await new Promise<ProgressEvent<FileReader>>((r, j) => {

                    fileReader.addEventListener('load', r);

                    fileReader.addEventListener('error', j);
                });

                let value = {
                    eventMessages: this._eventMessages,
                    audio: event.target.result
                }

                this._notebookPanel.content.model.metadata.set(
                    'etc_jupyterlab_authoring',
                    JSON.stringify(value)
                );

                await this._notebookPanel.context.saveAs();
            }
        }

        catch (e) {

            console.error(e);
        }
    }

    public advanceLine() {

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
    }

    public executionScheduled(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this.isRecording && args.notebook.isVisible) {

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
    }

    public executed(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this.isRecording && this._notebookPanel.content == args.notebook) {

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

            this._cell = null;

            this._editor = null;

            this._lineIndex = null;
        }
    }

    private aggregateMessage(message: EventMessage) {

        let now = Date.now();

        switch (message.event) {
            case 'cell_started':
            case 'line_finished':
            case 'execution_finished':
            case 'record_stopped':
                message.start_timestamp = this._lastTimestamp;
                message.stop_timestamp = now;
                message.duration = message.stop_timestamp - message.start_timestamp;
                this._lastTimestamp = now;
                break;
            //  The message must have a duration; hence, calculate a duration based on the timestamp of the previous message.
            case 'record_started':
                this._lastTimestamp = now;
                message.start_timestamp = now;
                message.stop_timestamp = now;
                message.duration = 0;
                break;
            default: ;
        }

        this._eventMessages.push(message);

        console.log(message.input, message);
    }
}