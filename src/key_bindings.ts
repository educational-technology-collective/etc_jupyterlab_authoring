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
import { ISignal, Signal } from '@lumino/signaling';

export class KeyBindings {

    public resetPressed: ISignal<CommandRegistry, any>;
    public recordPressed: ISignal<CommandRegistry, any>;
    public stopPressed: ISignal<CommandRegistry, any>;
    public playPressed: ISignal<CommandRegistry, any>;
    public pausePressed: ISignal<CommandRegistry, any>;
    public savePressed: ISignal<CommandRegistry, any>;
    public advancePressed: ISignal<CommandRegistry, any>;

    private _keyBindingDisposables: Array<IDisposable> = [];
    private _advanceKeyBindingDisposable: IDisposable;

    private _commandRegistry: CommandRegistry;
    private _settings: ISettingRegistry.ISettings;

    constructor({
        commandRegistry,
        settings
    }: {
        commandRegistry: CommandRegistry,
        settings: ISettingRegistry.ISettings
    }) {

        this._commandRegistry = commandRegistry;
        this._settings = settings;

        this.resetPressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:reset`
            });
      
        this.recordPressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:record`
            });
      
        this.stopPressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:stop`
            });
      
        this.playPressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:play`
            });
      
        this.pausePressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:pause`
            });
      
        this.savePressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:save`
            });
      
       this.advancePressed = new CommandSignal(
            {
                commandRegistry: commandRegistry,
                id: `${PLUGIN_ID}:advance`
            });

        settings.changed.connect(this.updateKeyBindings, this);

        this.updateKeyBindings(settings);
    }

    public dispose() {
        this._keyBindingDisposables.forEach((value: IDisposable) => value.dispose());
    }

    private updateKeyBindings(settings: ISettingRegistry.ISettings) {

        this._keyBindingDisposables.forEach((value: IDisposable) => value.dispose());

        this._keyBindingDisposables = [];

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:reset`,
            args: { process: 'reset' },
            keys: [settings.get('reset').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:record`,
            args: { process: 'record' },
            keys: [settings.get('record').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:stop`,
            args: { process: 'stop' },
            keys: [settings.get('stop').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:play`,
            args: { process: 'play' },
            keys: [settings.get('play').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:pause`,
            args: { process: 'pause' },
            keys: [settings.get('pause').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:save`,
            args: { process: 'save' },
            keys: [settings.get('save').composite as string],
            selector: '.jp-Notebook'
        }));
    }

    public attachAdvanceKeyBinding() {

        this._advanceKeyBindingDisposable = this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:advance`,
            args: {},
            keys: [this._settings.get('advance').composite as string],
            selector: '.jp-Notebook'
        });
    }

    public detachAdvanceKeyBinding() {
        this._advanceKeyBindingDisposable.dispose();
    }
}