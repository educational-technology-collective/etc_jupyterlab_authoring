import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget, Panel, MenuBar, TabBar, BoxPanel, BoxLayout } from "@lumino/widgets";

import { MediaControls, SaveDisplayRecordingCheckbox, ShowMediaControlsCheckbox } from './widgets';

import { PLUGIN_ID } from './index';
import { MessagePlayer } from './message_player';
import { MessageRecorder } from './message_recorder';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { commands } from 'codemirror';
import { CommandSignal } from './command_signal';
import { Signal } from '@lumino/signaling';
import { KeyBindings } from './key_bindings';

export class Controller {

    private _mediaControls: MediaControls;
    private _showMediaControlsCheckbox: Widget;
    private _notebookPanel: NotebookPanel;
    private _keyBindings: KeyBindings;
    private _messagePlayer: MessagePlayer;
    private _messageRecorder: MessageRecorder;
    private _commandRegistry: CommandRegistry;
    private _settings: ISettingRegistry.ISettings;

    private _resetButton: HTMLElement;
    private _recordButton: HTMLElement;
    private _stopButton: HTMLElement;
    private _playButton: HTMLElement;
    private _pauseButton: HTMLElement;
    private _saveButton: HTMLElement;

    constructor({
        notebookPanel,
        mediaControls,
        commandRegistry,
        keyBindings,
        showMediaControlsCheckbox,
        saveDisplayRecordingCheckbox,
        messageRecorder,
        messagePlayer
    }: {
        notebookPanel: NotebookPanel,
        mediaControls: MediaControls,
        commandRegistry: CommandRegistry,
        keyBindings: KeyBindings,
        showMediaControlsCheckbox: ShowMediaControlsCheckbox,
        saveDisplayRecordingCheckbox: SaveDisplayRecordingCheckbox,
        messageRecorder: MessageRecorder,
        messagePlayer: MessagePlayer
    }) {

        this._notebookPanel = notebookPanel;
        this._mediaControls = mediaControls;
        this._keyBindings = keyBindings;
        this._messageRecorder = messageRecorder;
        this._messagePlayer = messagePlayer;
        this._commandRegistry = commandRegistry;
        this._showMediaControlsCheckbox = showMediaControlsCheckbox;

        this._keyBindings.keyPressed.connect(this.handleKeyPressed, this);

        this._resetButton = mediaControls.node.querySelector('.reset');
        this._recordButton = mediaControls.node.querySelector('.record');
        this._stopButton = mediaControls.node.querySelector('.stop');
        this._playButton = mediaControls.node.querySelector('.play');
        this._pauseButton = mediaControls.node.querySelector('.pause');
        this._saveButton = mediaControls.node.querySelector('.save');

        this._resetButton.addEventListener('click', this, true);
        this._recordButton.addEventListener('click', this, true);
        this._stopButton.addEventListener('click', this, true);
        this._playButton.addEventListener('click', this, true);
        this._pauseButton.addEventListener('click', this, true);
        this._saveButton.addEventListener('click', this, true);

        this._showMediaControlsCheckbox.node.addEventListener('click', this, true);

        this.processShowMediaControls();
    }

    public dispose() {

        this._resetButton.removeEventListener('click', this);
    }

    public async handleEvent(event: Event) {

        try {

            if (event.type == 'click') {

                if (event.currentTarget == this._resetButton) {
                    this.processReset();
                }
                else if (event.currentTarget == this._recordButton) {
                    await this.processRecord();
                }
                else if (event.currentTarget == this._stopButton) {
                    await this.processStop();
                }
                else if (event.currentTarget == this._playButton) {
                    await this.processPlay();
                }
                else if (event.currentTarget == this._pauseButton) {
                    await this.processPause();
                }
                else if (event.currentTarget == this._saveButton) {
                    await this.processSave();
                }
                else if (event.target == this._showMediaControlsCheckbox.node.getElementsByTagName('input')[0]) {
                    this.processShowMediaControls();
                }
            }
        }
        catch(e) {

            console.error(e);
        }
    }

    private async handleKeyPressed(sender: KeyBindings, args: { key: string }) {

        try {

            if (this._notebookPanel.isVisible) {

                switch (args.key) {
    
                    case 'reset':
                        this.processReset();
                        break;
                    case 'record':
                        await this.processRecord();
                        break;
                    case 'stop':
                        await this.processStop();
                        break;
                    case 'play':
                        await this.processPlay();
                        break;
                    case 'pause':
                        await this.processPause();
                        break;
                    case 'save':
                        await this.processSave();
                        break;
                    case 'advance':
                        this.processAdvance();
                        break;
                }
            }
        }
        catch(e) {

            console.error(e);
        }
    }

    public processShowMediaControls() {

        let checkbox = this._showMediaControlsCheckbox.node.getElementsByTagName('input')[0];

        if (checkbox.checked) {

            this._mediaControls.show();
        }
        else {

            this._mediaControls.hide();
        }
    }

    private async processStop() {

        if (this._messageRecorder.isRecording) {

            this._keyBindings.detachAdvanceKeyBinding();

            await this._messageRecorder.stop();
        }
        else if (this._messagePlayer.isPlaying) {

            await this._messagePlayer.stop();

            this._messagePlayer.reset();
        }
    }

    private async processPlay() {

        if (
            !this._messageRecorder.isRecording &&
            (!this._messagePlayer.isPlaying || this._messagePlayer.isPaused) &&
            this._messagePlayer.audioRecording
        ) {

            this._messagePlayer.play()
        }
    }

    private async processPause() {

        if (this._messageRecorder.isRecording && !this._messageRecorder.isPaused) {

            await this._messageRecorder.pause();
        }
        else if (this._messagePlayer.isPlaying && !this._messagePlayer.isPaused) {

            await this._messagePlayer.pause();
        }
    }

    private processReset() {

        if (!this._messagePlayer.isPlaying && !this._messageRecorder.isRecording) {

            this._messagePlayer.reset();
        }
    }

    private async processSave() {

        if (!this._messageRecorder.isRecording) {

            await this._messageRecorder.save();
        }
    }

    private async processRecord() {

        if (!this._messagePlayer.isPlaying) {

            if (this._messageRecorder.isPaused) {

                await this._messageRecorder.resume();
            }
            else if (!this._messageRecorder.isRecording) {

                this._keyBindings.attachAdvanceKeyBinding();

                await this._messageRecorder.record();
            }
        }
    }

    private processAdvance() {

        if (this._messageRecorder.isRecording) {

            this._messageRecorder.advanceLine();
        }
    }
}