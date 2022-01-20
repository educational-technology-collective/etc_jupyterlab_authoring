import { INotebookTracker, Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell, Cell, ICellModel } from '@jupyterlab/cells';
import { Editor } from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { EventMessage } from './types';
import { AudioInputSelector, VideoInputSelector } from './av_input_selectors';
import { StatusIndicator } from './status_indicator';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { KeyBindings } from './key_bindings';
import { MediaControls, AdvanceLineColorPicker, RecordVideoCheckbox, ExecuteOnLastLineAdvance } from './components';
import { Signal } from '@lumino/signaling';

export class MessageRecorder {

    public isRecording: boolean = false;
    public isPaused: boolean = false;

    private _app: JupyterFrontEnd;
    private _isExecuting: boolean;
    private _notebookPanel: NotebookPanel;
    private _cellIndex: number | null;
    private _lineIndex: number = 0;
    private _editor: Editor;
    private _cell: Cell<ICellModel>;
    private _audioRecording: Promise<Blob>;
    private _mediaStream: MediaStream;
    private _mediaRecorder: MediaRecorder;
    private _eventMessages: Array<EventMessage> = [];
    private _lastTimestamp: number;
    private _statusIndicator: StatusIndicator;
    private _audioInputSelector: AudioInputSelector;
    private _videoInputSelector: VideoInputSelector;
    private _keyBindings: KeyBindings;
    private _advanceLineColor: string;
    private _recordVideoCheckbox: RecordVideoCheckbox;
    private _executeOnLastLineAdvance: ExecuteOnLastLineAdvance;

    constructor({
        app,
        notebookTracker,
        notebookPanel,
        mediaControls,
        keyBindings,
        audioInputSelector,
        videoInputSelector,
        advanceLineColorPicker,
        recordVideoCheckbox,
        executeOnLastLineAdvance,
        statusIndicator
    }:
        {
            app: JupyterFrontEnd,
            notebookTracker: INotebookTracker,
            notebookPanel: NotebookPanel,
            mediaControls: MediaControls,
            keyBindings: KeyBindings,
            audioInputSelector: AudioInputSelector,
            videoInputSelector: VideoInputSelector,
            advanceLineColorPicker: AdvanceLineColorPicker,
            recordVideoCheckbox: RecordVideoCheckbox,
            executeOnLastLineAdvance: ExecuteOnLastLineAdvance,
            statusIndicator: StatusIndicator
        }) {

        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cellIndex = null;
        this._statusIndicator = statusIndicator;
        this._audioInputSelector = audioInputSelector;
        this._videoInputSelector = videoInputSelector;
        this._keyBindings = keyBindings;
        this._advanceLineColor = advanceLineColorPicker.color;
        this._recordVideoCheckbox = recordVideoCheckbox;
        this._executeOnLastLineAdvance = executeOnLastLineAdvance;

        keyBindings.keyPressed.connect(this.processCommand, this);
        mediaControls.buttonPressed.connect(this.processCommand, this);
        advanceLineColorPicker.colorChanged.connect(this.updateAdvanceLineColor, this);
        this._notebookPanel.disposed.connect(this.dispose, this);

        NotebookActions.executionScheduled.connect(this.executionScheduled, this);
        NotebookActions.executed.connect(this.executed, this);
        notebookTracker.currentChanged.connect(this.updateAdvanceKeyBinding, this);
    }

    public dispose() {

        Signal.disconnectAll(this);
    }

    private async processCommand(sender: KeyBindings | MediaControls, args: { command: string }) {

        try {

            if (this._notebookPanel.isVisible) {

                switch (args.command) {
                    case 'record':
                        this.record();
                        break;
                    case 'stop':
                        await this.stop();
                        break;
                    case 'save':
                        await this.save();
                        break;
                    case 'advance':
                        this.advanceLine();
                        break;
                }
            }
        }
        catch (e) {

            console.error(e);
        }
    }

    public updateAdvanceKeyBinding(sender: INotebookTracker, notebookPanel: NotebookPanel) {

        if (this._notebookPanel == notebookPanel) {

            if (this.isRecording) {

                this._keyBindings.attachAdvanceKeyBinding();
            }
            else {

                this._keyBindings.detachAdvanceKeyBinding();
            }
        }
    }

    public async record() {

        if (!this.isRecording) {

            this._keyBindings.attachAdvanceKeyBinding();

            await this.startMediaRecorder();

            await new Promise((r, j) => setTimeout(r, 2000));

            await new Promise((r, j) => {

                this._mediaRecorder.addEventListener('start', r, { once: true });

                this._mediaRecorder.start();

            });

            this.isRecording = true;

            this._statusIndicator.record(this._notebookPanel);

            this._eventMessages = [];

            this.aggregateMessage({
                event: "record_started",
                notebook_id: this._notebookPanel.content.id
            });

            this._notebookPanel.content.node.focus();

            if (this._editor) {

                this._editor.focus();
            }
        }
    }

    private async startMediaRecorder() {

        let mimeType: string;

        if (this._recordVideoCheckbox.checked) {

            this._mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: this._audioInputSelector.deviceId
                },
                video: {
                    deviceId: this._videoInputSelector.deviceId
                }
            });

            mimeType = 'video/webm; codecs="vp8, opus"';
        }
        else {

            this._mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: this._audioInputSelector.deviceId
                }
            });

            mimeType = 'audio/webm; codecs=opus'
        }


        this._mediaRecorder = new MediaRecorder(this._mediaStream, {
            mimeType: mimeType
        });

        (async () => {

            try {

                this._audioRecording = new Promise((r, j) => {

                    let recordings: Array<Blob> = [];

                    this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {

                        recordings.push(event.data);
                    });

                    this._mediaRecorder.addEventListener('stop', () => {

                        r(new Blob(recordings, { 'type': mimeType }));
                    });

                    this._mediaRecorder.addEventListener('error', j);
                });

                await this._audioRecording;
            }
            catch (e) {

                console.error(e);
            }
        })();
    }

    public async stop() {

        if (this.isRecording) {

            this._keyBindings.detachAdvanceKeyBinding();

            if (this._editor) {
                //  The MessageRecorder may or may not have an editor when it stops; hence handle these cases separately.

                let wrapper = (this._editor?.getWrapperElement().querySelectorAll('.CodeMirror-line')[this._lineIndex] as HTMLElement);

                wrapper.style.backgroundColor = null;

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

                this._mediaRecorder.requestData();

                this._mediaRecorder.stop();

                await this._audioRecording;

                this._mediaStream.getTracks().forEach((track) => {
                    if (track.readyState == 'live') {
                        track.stop();
                    }
                });
            }

            this.isRecording = false;
            this._cellIndex = null;
            this._editor = null;
            this._notebookPanel.content.widgets[0].editorWidget.editor.focus();
            this._notebookPanel.content.widgets[0].editorWidget.editor.blur();
            this._notebookPanel.content.node.focus();

            this._statusIndicator.stop(this._notebookPanel);
        }
    }

    public async save() {

        if (!this.isRecording) {

            let fileReader = new FileReader();

            let audioRecording = await this._audioRecording;

            let event = await new Promise<ProgressEvent<FileReader>>((r, j) => {

                fileReader.addEventListener('load', r);

                fileReader.addEventListener('error', j);

                fileReader.readAsDataURL(audioRecording);
            });

            let value = {
                eventMessages: this._eventMessages,
                media: event.target.result
            }

            let notebookPanel: NotebookPanel = await this._app.commands.execute('notebook:create-new');

            await notebookPanel.context.ready;

            notebookPanel.content.model.metadata.set(
                'etc_jupyterlab_authoring',
                JSON.stringify(value)
            );

            let name = `${notebookPanel.title.label.replace(/\..+$/, '')}_recorded_${Date.now().toString()}.ipynb`;

            await notebookPanel.context.rename(name);

            await notebookPanel.context.saveAs();
        }
    }

    public async advanceLine() {

        if (this.isRecording && !this._isExecuting) {

            if (this._cellIndex === null) {

                this.aggregateMessage({
                    event: 'cell_started',
                    notebook_id: this._notebookPanel.content.id
                });

                this.advanceCursor();
            }
            else if (
                this._executeOnLastLineAdvance.checked &&
                this._cell.model.type == 'code' &&
                this._lineIndex == this._editor.lastLine()
            ) {

                this._isExecuting = true;

                await NotebookActions.runAndAdvance(this._notebookPanel.content, this._notebookPanel.sessionContext);
                
                this._isExecuting = false;
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

                this.advanceCursor();
            }
        }
    }

    private executionScheduled(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

        if (this.isRecording && args.notebook.isVisible) {

            this._isExecuting = true;

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

    private executed(sender: any, args: { notebook: Notebook; cell: Cell<ICellModel> }) {

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

            this._isExecuting = false;

            this.advanceCursor();
        }
    }

    private advanceCursor() {

        if (this._editor) {

            let wrapper = (this._editor?.getWrapperElement().querySelectorAll('.CodeMirror-line')[this._lineIndex] as HTMLElement);

            wrapper.style.backgroundColor = null;
        }

        // this._editor?.removeLineClass(this._lineIndex, 'wrap', 'active-line');

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

        // this._editor?.addLineClass(this._lineIndex, 'wrap', 'active-line');

        if (this._editor) {

            let wrapper = (this._editor?.getWrapperElement().querySelectorAll('.CodeMirror-line')[this._lineIndex] as HTMLElement);

            wrapper.style.backgroundColor = this._advanceLineColor;
        }
    }

    private aggregateMessage(message: EventMessage) {

        console.log(message);

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
    }

    updateAdvanceLineColor(sender: AdvanceLineColorPicker, color: string) {

        this._advanceLineColor = color;
    }
}