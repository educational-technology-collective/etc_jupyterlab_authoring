import { PLUGIN_ID } from './index';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

export class KeyBindings {

    private _keyPressed: Signal<KeyBindings, { command: string }> = new Signal<KeyBindings, { command: string }>(this);
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

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.reset`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.record`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.stop`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.play`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.pause`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.save`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        commandRegistry.addCommand(`${PLUGIN_ID}:key_binding.advance`, {
            execute: (args: any) => this._keyPressed.emit(args)
        });

        settings.changed.connect(this.updateKeyBindings, this);

        this.updateKeyBindings(settings);
    }

    public dispose() {

        Signal.disconnectAll(this);

        this._keyBindingDisposables.forEach((value: IDisposable) => value.dispose());
    }

    private updateKeyBindings(settings: ISettingRegistry.ISettings) {

        this._keyBindingDisposables.forEach((value: IDisposable) => value.dispose());

        this._keyBindingDisposables = [];

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.reset`,
            args: { command: 'reset' },
            keys: [settings.get('key_binding.reset').composite as string],
            selector: 'body'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.record`,
            args: { command: 'record' },
            keys: [settings.get('key_binding.record').composite as string],
            selector: 'body'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.stop`,
            args: { command: 'stop' },
            keys: [settings.get('key_binding.stop').composite as string],
            selector: 'body'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.play`,
            args: { command: 'play' },
            keys: [settings.get('key_binding.play').composite as string],
            selector: 'body'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.pause`,
            args: { command: 'pause' },
            keys: [settings.get('key_binding.pause').composite as string],
            selector: 'body'
        }));

        this._keyBindingDisposables.push(this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.save`,
            args: { command: 'save' },
            keys: [settings.get('key_binding.save').composite as string],
            selector: 'body'
        }));
    }

    public attachAdvanceKeyBinding() {

        this.detachAdvanceKeyBinding();

        this._advanceKeyBindingDisposable = this._commandRegistry.addKeyBinding({
            command: `${PLUGIN_ID}:key_binding.advance`,
            args: { command: 'advance' },
            keys: [this._settings.get('key_binding.advance').composite as string],
            selector: 'body'
        });
    }

    public detachAdvanceKeyBinding() {

        if (this._advanceKeyBindingDisposable) {
            this._advanceKeyBindingDisposable.dispose();
        }
    }

    get keyPressed(): ISignal<KeyBindings, { command: string }> {
        return this._keyPressed;
    }
}