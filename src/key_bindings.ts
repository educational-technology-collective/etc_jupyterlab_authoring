import { PLUGIN_ID } from './index';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

export class KeyBindings {

    private _keyPressed: Signal<KeyBindings, { key: string }> = new Signal<KeyBindings, { key: string }>(this);
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

        commandRegistry.addCommand(`${PLUGIN_ID}:reset`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:record`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:stop`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:play`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:pause`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:save`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:advance`, {
            execute: (args: any) => this._keyPressed.emit(args)
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
            args: { key: 'reset' },
            keys: [settings.get('reset').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:record`,
            args: { key: 'record' },
            keys: [settings.get('record').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:stop`,
            args: { key: 'stop' },
            keys: [settings.get('stop').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:play`,
            args: { key: 'play' },
            keys: [settings.get('play').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:pause`,
            args: { key: 'pause' },
            keys: [settings.get('pause').composite as string],
            selector: '.jp-Notebook'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:save`,
            args: { key: 'save' },
            keys: [settings.get('save').composite as string],
            selector: '.jp-Notebook'
        }));
    }

    public attachAdvanceKeyBinding() {

        this._advanceKeyBindingDisposable = this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:advance`,
            args: { key: 'advance' },
            keys: [this._settings.get('advance').composite as string],
            selector: '.jp-Notebook'
        });
    }

    public detachAdvanceKeyBinding() {

        this._advanceKeyBindingDisposable.dispose();
    }

    get keyPressed(): ISignal<KeyBindings, { key: string }> {
        return this._keyPressed;
    }
}