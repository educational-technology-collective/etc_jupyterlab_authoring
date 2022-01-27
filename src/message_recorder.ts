import { INotebookTracker, Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell, Cell, ICellModel } from '@jupyterlab/cells';
import { Editor } from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import * as nbformat from '@jupyterlab/nbformat';
import { EventMessage } from './types';
import { AudioInputSelector, VideoInputSelector } from './av_input_selectors';
import { AuthoringStatus } from './authoring_status';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { KeyBindings } from './key_bindings';
import { MediaControls, AdvanceLineColorPicker, RecordVideoCheckbox, ExecuteOnLastLineAdvance, PositionAdvanceLine, AuthoringToolbarStatus } from './components';
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
    private _authoringStatus: AuthoringStatus;
    private _audioInputSelector: AudioInputSelector;
    private _videoInputSelector: VideoInputSelector;
    private _keyBindings: KeyBindings;
    private _advanceLineColor: string;
    private _recordVideoCheckbox: RecordVideoCheckbox;
    private _executeOnLastLineAdvance: ExecuteOnLastLineAdvance;
    private _positionAdvanceLine: PositionAdvanceLine;
    private _authoringToolbarStatus: AuthoringToolbarStatus;

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
        positionAdvanceLine,
        authoringStatus,
        authoringToolbarStatus
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
            positionAdvanceLine: PositionAdvanceLine,
            authoringStatus: AuthoringStatus,
            authoringToolbarStatus: AuthoringToolbarStatus
        }) {

        this._app = app;
        this._notebookPanel = notebookPanel;
        this._cellIndex = null;
        this._authoringStatus = authoringStatus;
        this._audioInputSelector = audioInputSelector;
        this._videoInputSelector = videoInputSelector;
        this._keyBindings = keyBindings;
        this._advanceLineColor = advanceLineColorPicker.color;
        this._recordVideoCheckbox = recordVideoCheckbox;
        this._executeOnLastLineAdvance = executeOnLastLineAdvance;
        this._positionAdvanceLine = positionAdvanceLine;
        this._authoringToolbarStatus = authoringToolbarStatus;

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

            if (e instanceof Error) {

                console.error(e.message);
            }

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

            this._authoringToolbarStatus.setStatus('Awaiting Media Recorder...');

            await this.startMediaRecorder();

            this._authoringToolbarStatus.setStatus('Recording...');

            this.isRecording = true;

            this._authoringStatus.setState(this._notebookPanel, 'record');

            this._authoringStatus.setTime(this._notebookPanel, 0);

            this._eventMessages = [];

            this.aggregateMessage({
                event: "record_started",
                notebook_id: this._notebookPanel.content.id
            });

            this._notebookPanel.content.widgets[0].editorWidget.editor.focus()

            document.querySelectorAll('.CodeMirror-cursor').forEach((value: Node) => (value as HTMLElement).classList.add('etc-jupyterlab-authoring-no-cursor'));

            // (this._notebookPanel.content.widgets[0].editorWidget.editor as CodeMirrorEditor).editor.getWrapperElement().focus();
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

        this._audioRecording = new Promise((r, j) => {

            let recordings: Array<Blob> = [];

            let seconds = 0;

            this._mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {

                recordings.push(event.data);

                seconds = seconds + 1;

                this._authoringStatus.setTime(this._notebookPanel, seconds);
            });

            this._mediaRecorder.addEventListener('stop', () => {

                r(new Blob(recordings, { 'type': mimeType }));
            });

            this._mediaRecorder.addEventListener('error', j);
        });

        this._audioRecording.catch(null);

        await new Promise((r, j) => setTimeout(r, 2000));
        //  Sometimes there is a delay is getting the media stream hooked up to the MediaRecorder; hence, wait 2 seconds.

        await new Promise((r, j) => {

            this._mediaRecorder.addEventListener('start', r, { once: true });

            this._mediaRecorder.start(1000);

        });
    }

    public async stop() {

        if (this.isRecording) {

            this._authoringToolbarStatus.setStatus('Stopping...');

            this._keyBindings.detachAdvanceKeyBinding();

            if (this._editor) {
                //  The MessageRecorder may or may not have an editor when it stops; hence handle these cases separately.

                let lineElement = (this._editor?.getWrapperElement().querySelectorAll('.CodeMirror-line')[this._lineIndex] as HTMLElement);

                lineElement.style.backgroundColor = null;

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

            this._authoringStatus.setState(this._notebookPanel, 'stop');

            this._authoringToolbarStatus.setStatus('Stopped.');

            document.querySelectorAll('.CodeMirror-cursor').forEach((value: Node) => (value as HTMLElement).classList.add('etc-jupyterlab-authoring-auto-cursor'));
        }
    }

    public async save() {

        if (!this.isRecording) {

            this._authoringToolbarStatus.setStatus('Saving...');

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

            this._authoringToolbarStatus.setStatus('Saved.');
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
            //  The background color needs to advance with the cursor; hence, remove the background color from the current line before advancing.

            let lineElement = (this._editor?.getWrapperElement().querySelectorAll('.CodeMirror-line')[this._lineIndex] as HTMLElement);

            lineElement.style.backgroundColor = null;
        }

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

        if (this._editor) {

            let lineElement = (this._editor?.getWrapperElement().querySelectorAll('.CodeMirror-line')[this._lineIndex] as HTMLElement);
            //  The new line has been set; hence, set the background color.

            lineElement.style.backgroundColor = this._advanceLineColor;

            let node;

            for (node = lineElement; !node.parentElement.classList.contains('CodeMirror-code'); node = node.parentElement);

            let scrollTo = this._cell.node.offsetTop + node.offsetTop - this._notebookPanel.content.node.offsetHeight * (this._positionAdvanceLine.value / 100);

            this._notebookPanel.content.node.scrollTop = scrollTo;
            //  We want to position the advance line for the user; hence, scroll to specified position of the Notebook window.
        
            document.querySelectorAll('.CodeMirror-cursor').forEach((value: Node) => (value as HTMLElement).classList.add('etc-jupyterlab-authoring-no-cursor'));
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