import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget, Panel, MenuBar, TabBar, BoxPanel, BoxLayout } from "@lumino/widgets";

import { ExecutionCheckbox, SaveDisplayRecordingCheckbox, ScrollCheckbox, ShowMediaControlsCheckbox } from './components';

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
import { MediaControls } from './media_controls';

export class Controller {

    private _mediaControls: MediaControls;
    private _showMediaControlsCheckbox: ShowMediaControlsCheckbox;
    private _saveDisplayRecordingCheckbox: SaveDisplayRecordingCheckbox;
    private _executionCheckbox: ExecutionCheckbox;
    private _scrollCheckbox: ScrollCheckbox;
    private _notebookPanel: NotebookPanel;
    private _keyBindings: KeyBindings;
    private _messagePlayer: MessagePlayer;
    private _messageRecorder: MessageRecorder;
    private _commandRegistry: CommandRegistry;
    private _settings: ISettingRegistry.ISettings;

    constructor({
        notebookPanel,
        mediaControls,
        commandRegistry,
        keyBindings,
        showMediaControlsCheckbox,
        saveDisplayRecordingCheckbox,
        executionCheckbox,
        scrollCheckbox,
        messageRecorder,
        messagePlayer
    }: {
        notebookPanel: NotebookPanel,
        mediaControls: MediaControls,
        commandRegistry: CommandRegistry,
        keyBindings: KeyBindings,
        showMediaControlsCheckbox: ShowMediaControlsCheckbox,
        saveDisplayRecordingCheckbox: SaveDisplayRecordingCheckbox,
        executionCheckbox: ExecutionCheckbox,
        scrollCheckbox: ScrollCheckbox,
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
        this._saveDisplayRecordingCheckbox = saveDisplayRecordingCheckbox;
        this._executionCheckbox = executionCheckbox;
        this._scrollCheckbox = scrollCheckbox;

        this._keyBindings.keyPressed.connect(this.processCommand, this);
        this._mediaControls.buttonPressed.connect(this.processCommand, this);
        this._showMediaControlsCheckbox.checkboxChanged.connect(this._mediaControls.updatePanelVisibily);
        saveDisplayRecordingCheckbox.checkboxChanged.connect(
            (sender: SaveDisplayRecordingCheckbox, value: boolean) => this._messagePlayer.enableaveDisplayRecording = value);
        saveDisplayRecordingCheckbox.checkboxChanged.connect(
            (sender: SaveDisplayRecordingCheckbox, value: boolean) => this._messagePlayer.enableSaveDisplayRecording = value);

    }

    public dispose() {

    }

    private async processCommand(sender: KeyBindings | MediaControls, args: { command: string }) {

        try {

            if (this._notebookPanel.isVisible) {

                switch (args.command) {

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
        catch (e) {

            console.error(e);
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