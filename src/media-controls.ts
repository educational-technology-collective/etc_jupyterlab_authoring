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

export class MediaControls {

    private _mediaControlsPanel: MediaControlsPanel;
    private _showMediaControlsCheckbox: HTMLInputElement;
    private _notebookPanel: NotebookPanel;
    private _messagePlayer: MessagePlayer;
    private _messageRecorder: MessageRecorder;
    private _commandRegistry: CommandRegistry;
    private _keyBindingDisposables: Array<IDisposable> = [];

    private _resetButton: HTMLElement;
    private _recordButton: HTMLElement;
    private _stopButton: HTMLElement;
    private _playButton: HTMLElement;
    private _pauseButton: HTMLElement;
    private _saveButton: HTMLElement;

    constructor({
        commandRegistry,
        settings,
        notebookPanel,
        showMediaControlsCheckboxWidget,
        messageRecorder,
        messagePlayer
    }: {
        commandRegistry: CommandRegistry,
        settings: ISettingRegistry.ISettings,
        notebookPanel: NotebookPanel,
        showMediaControlsCheckboxWidget: ShowMediaControlsCheckboxWidget,
        messageRecorder: MessageRecorder,
        messagePlayer: MessagePlayer
    }) {

        this.processRecord = this.processRecord.bind(this);

        this._notebookPanel = notebookPanel;
        this._messageRecorder = messageRecorder;
        this._messagePlayer = messagePlayer;
        this._commandRegistry = commandRegistry;
        this._showMediaControlsCheckbox = showMediaControlsCheckboxWidget.node.getElementsByTagName('input')[0];

        this._showMediaControlsCheckbox.addEventListener('click', this);

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

        new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:reset`
            }).connect(this.handleEvent, this);

        new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:record`
            }).connect(this.handleEvent, this);

        new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:stop`
            }).connect(this.handleEvent, this);

        new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:play`
            }).connect(this.handleEvent, this);

        new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:pause`
            }).connect(this.handleEvent, this);

        new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:save`
            }).connect(this.handleEvent, this);

        settings.changed.connect(this.updateKeyBindings, this);

        this.updateKeyBindings(settings);

        this.renderButtons();
    }

    public dispose() {

        this._keyBindingDisposables.forEach((value: IDisposable) => value.dispose());

        this._mediaControlsPanel.node.querySelector('.record').removeEventListener('click', this.processRecord, true);
    }

    public async handleEvent(...args: Array<any>) {

        try {

            let process = '';

            if (args[0] instanceof Event) {

                let event: Event = args[0];

                if (event.type == 'click') {

                    let currentTarget: HTMLElement = (event.currentTarget as HTMLElement);

                    if (currentTarget == this._showMediaControlsCheckbox) {

                        this.renderButtons();
                    }
                    else if (currentTarget == this._resetButton) {
                        process = 'reset';
                    }
                    else if (currentTarget == this._resetButton) {
                        process = 'record';
                    }
                }
            }
            else if (typeof args[1] == 'string') {

                let process = (args[1] as any).process;
            }

            switch(process) {
                case 'reset':
                    this.processReset();
                    break;
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    private updateKeyBindings(settings: ISettingRegistry.ISettings) {

        this._keyBindingDisposables.forEach((value: IDisposable) => value.dispose());

        this._keyBindingDisposables = [];

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:reset`,
            args: {process: 'reset'},
            keys: [settings.get('reset').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:record`,
            args: {},
            keys: [settings.get('record').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:stop`,
            args: {},
            keys: [settings.get('stop').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:play`,
            args: {},
            keys: [settings.get('play').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:pause`,
            args: {},
            keys: [settings.get('pause').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:save`,
            args: {},
            keys: [settings.get('save').composite as string],
            selector: '.jp-Notebook'
        }));
    }

    private renderButtons() {

        if (this._showMediaControlsCheckbox.checked) {

            this._mediaControlsPanel.show();
        }
        else {

            this._mediaControlsPanel.hide();
        }
    }

    private async processStop(...args: Array<any>) {

        if (this._messageRecorder.isRecording) {

            await this._messageRecorder.stop();
        }
        else if (this._messagePlayer.isPlaying) {

            await this._messagePlayer.stop();

            this._messagePlayer.reset();
        }
    }

    private async processPlay(...args: Array<any>) {

        if (
            !this._messageRecorder.isRecording &&
            !this._messagePlayer.isPlaying &&
            this._messagePlayer.audioRecording
        ) {

            this._messagePlayer.play()
        }
    }

    private async processPause(...args: Array<any>) {

        if (this._messageRecorder.isRecording && !this._messageRecorder.isPaused) {

            await this._messageRecorder.pause();
        }
        else if (this._messagePlayer.isPlaying && !this._messagePlayer.isPaused) {

            await this._messagePlayer.pause();
        }
    }

    private processReset(...args: Array<any>) {

        if (this._messagePlayer.isStopped && !this._messageRecorder.isRecording) {

            this._messagePlayer.reset();
        }
    }

    private async processSave(...args: Array<any>) {

        if (!this._messageRecorder.isRecording) {

            await this._messageRecorder.save();
        }
    }

    private async processRecord(...args: Array<any>) {

        console.log('record');

        // if (!this._messagePlayer.isPlaying) {

        //     if (this._messageRecorder.isPaused) {

        //         await this._messageRecorder.resume();
        //     }
        //     else if (!this._messageRecorder.isRecording) {

        //         await this._messageRecorder.record();
        //     }
        // }

        throw new Error();
    }

    private processAdvance(...args: Array<any>) {

        if (this._messageRecorder.isRecording) {

            if (args[0] instanceof Event) {

                let event = args[0];

                event.stopImmediatePropagation();
                event.preventDefault();
            }

            this._messageRecorder.advanceLine();
        }
    }
}