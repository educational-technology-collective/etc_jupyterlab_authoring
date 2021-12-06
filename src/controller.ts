import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget, Panel, MenuBar, TabBar, BoxPanel, BoxLayout } from "@lumino/widgets";

import { MediaControlsPanel, ShowMediaControlsCheckboxWidget } from './widgets';

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

export class Controller {

    private _mediaControlsPanel: MediaControlsPanel;
    private _showMediaControlsCheckbox: HTMLInputElement;
    private _notebookPanel: NotebookPanel;
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
        commandRegistry,
        notebookPanel,
        showMediaControlsCheckboxWidget,
        messageRecorder,
        messagePlayer
    }: {
        commandRegistry: CommandRegistry,
        notebookPanel: NotebookPanel,
        showMediaControlsCheckboxWidget: ShowMediaControlsCheckboxWidget,
        messageRecorder: MessageRecorder,
        messagePlayer: MessagePlayer
    }) {


        this._notebookPanel = notebookPanel;
        this._messageRecorder = messageRecorder;
        this._messagePlayer = messagePlayer;
        this._commandRegistry = commandRegistry;
        this._showMediaControlsCheckbox = showMediaControlsCheckboxWidget.node.getElementsByTagName('input')[0];

        let mediaControlsPanel = this._mediaControlsPanel = new MediaControlsPanel({ direction: 'left-to-right', alignment: 'start' });

        this._notebookPanel.toolbar.insertAfter(
            'cellType',
            `${PLUGIN_ID}:button_controls_widget`,
            mediaControlsPanel
        );

        this._resetButton = mediaControlsPanel.node.querySelector('.reset');
        this._recordButton = mediaControlsPanel.node.querySelector('.record');
        this._stopButton = mediaControlsPanel.node.querySelector('.stop');
        this._playButton = mediaControlsPanel.node.querySelector('.play');
        this._pauseButton = mediaControlsPanel.node.querySelector('.pause');
        this._saveButton = mediaControlsPanel.node.querySelector('.save');

        this._resetButton.addEventListener('click', this, true);
        this._recordButton.addEventListener('click', this, true);
        this._stopButton.addEventListener('click', this, true);
        this._playButton.addEventListener('click', this, true);
        this._pauseButton.addEventListener('click', this, true);
        this._saveButton.addEventListener('click', this, true);

        this._showMediaControlsCheckbox.addEventListener('click', this, true);

        this.processShowMediaControls();
    }

    public dispose() {

        this._resetButton.removeEventListener('click', this);
    }

    public async handleEvent(event: Event) {

        if (event.type == 'click') {

            if (event.currentTarget == this._resetButton) {
                this.processReset();
            }
            else if (event.currentTarget == this._recordButton) {
                this.processRecord();
            }
            else if (event.currentTarget == this._stopButton) {
                this.processStop();
            }
            else if (event.currentTarget == this._playButton) {
                this.processPlay();
            }
            else if (event.currentTarget == this._pauseButton) {
                this.processPause();
            }
            else if (event.currentTarget == this._saveButton) {
                this.processSave();
            }
            else if(event.currentTarget == this._showMediaControlsCheckbox) {
                this.processShowMediaControls();
            }
        }
    }

    private async handleKeyPressed(sender: CommandRegistry, args: { process: string }) {

        switch (args.process) {

            case 'reset':
                this.processReset();
                break;
            case 'record':
                this.processRecord();
                break;
            case 'stop':
                this.processStop();
                break;
            case 'play':
                this.processPlay();
                break;
            case 'pause':
                this.processPause();
                break;
            case 'save':
                this.processSave();
                break;
        }
    }

    public processShowMediaControls() {

        if (this._showMediaControlsCheckbox.checked) {

            this._mediaControlsPanel.show();
        }
        else {

            this._mediaControlsPanel.hide();
        }
    }

    private async processStop() {

        if (this._messageRecorder.isRecording) {

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