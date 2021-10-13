import { Widget, Panel } from "@lumino/widgets";

import { Signal, ISignal } from "@lumino/signaling";

import { UUID } from '@lumino/coreutils';

import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

import {
    stopStatus,
    playStatus,
    recordStatus,
    rightPanelIcon
} from './icons'

import { caretDownEmptyIcon } from '@jupyterlab/ui-components';

export class ExecutionCheckbox extends Widget {

    private _changed: Signal<ExecutionCheckbox, boolean> = new Signal<ExecutionCheckbox, boolean>(this);
    private _input: HTMLInputElement;

    constructor() {

        super();

        this.onChange = this.onChange.bind(this);

        this.addClass('jp-ExecutionCheckBox');

        this.node.innerHTML = '<p>Execute Cells during Playback</p>';

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'execution');

        input.classList.add('jp-mod-styled');

        input.addEventListener('change', this.onChange);

        let label = document.createElement('label');

        label.setAttribute('for', 'execution');

        label.innerHTML = 'Enable';

        this.node.appendChild(input);

        this.node.appendChild(label);

        this._input = input;
    }

    private onChange(event: Event) {

        this._changed.emit(this._input.checked);
    }

    get changed(): ISignal<ExecutionCheckbox, boolean> {

        return this._changed;
    }
}

export class AudioInputSelector extends Widget {

    private _deviceSelected: Signal<AudioInputSelector, string> = new Signal<AudioInputSelector, string>(this);
    public deviceId: string;
    private _select: HTMLSelectElement;

    constructor() {

        super({ node: document.createElement('label') });

        this.onDeviceChanged = this.onDeviceChanged.bind(this);
        this.onChange = this.onChange.bind(this);

        this.id = 'etc_jupyterlab_authoring:plugin:authoring_selector_widget';

        this.addClass('jp-AudioSelectorWidget');

        this.node.innerHTML = 'Audio Input';

        let div = document.createElement('div');

        div.classList.add('jp-select-wrapper');

        this._select = document.createElement('select');

        this._select.classList.add('jp-mod-styled');

        let span = document.createElement('span');

        span.classList.add('f1st5hdn');

        span.innerHTML = caretDownEmptyIcon.svgstr;

        this.node.appendChild(div).append(this._select, span);

        this._select.addEventListener('change', this.onChange);

        this.deviceId = null;

        navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChanged);

        (async () => {

            await navigator.mediaDevices.getUserMedia({ audio: true });

            navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
        })();
    }

    private async onDeviceChanged(event: Event) {

        try {

            let devices = await navigator.mediaDevices.enumerateDevices();

            let deviceIds = devices.map((value: MediaDeviceInfo) => value.deviceId);

            let optionDeviceIds = ([...this._select.children] as Array<HTMLOptionElement>).map(
                (value: HTMLOptionElement) => value.value
            );

            optionDeviceIds.forEach((value: string, index: number) => {

                if (!deviceIds.includes(value)) {

                    this._select.remove(index);
                }
            });

            devices.forEach((device: MediaDeviceInfo) => {

                if (device.kind == 'audioinput' && !optionDeviceIds.includes(device.deviceId)) {

                    let option = document.createElement('option');

                    option.setAttribute('value', device.deviceId);

                    option.setAttribute('label', device.label);

                    this._select.appendChild(option);
                }
            });

            this.deviceId = this._select.value;

            this._deviceSelected.emit(this.deviceId);
        }
        catch (e) {

            console.error(e);
        }
    }

    private onChange(event: Event) {

        this.deviceId = (event.target as HTMLSelectElement).value;

        this._deviceSelected.emit(this.deviceId);
    }

    get deviceSelected(): ISignal<AudioInputSelector, string> {

        return this._deviceSelected;
    }
}

export class AuthoringSidePanel extends Panel {

    constructor() {
        super();

        this.id = this.id = `jp-authoring-side-panel-${UUID.uuid4()}`;

        this.addClass('jp-AuthoringSidePanel');

        this.node.style.backgroundColor = '#fff';
        this.node.style.padding = '10px';

        this.title.icon = rightPanelIcon;
    }
}

export class RecordButton extends Widget {

    private _pressed: Signal<RecordButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super();

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        this._notebookPanel = notebookPanel;

        window.addEventListener("keydown", this.onKeydown, true);

        this.node.addEventListener('click', this.onPressed);

        this._notebookPanel.disposed.connect(this.onDisposed, this);

        this.addClass("etc-jupyterlab-authoring-button");
    }

    public onDisposed() {

        window.removeEventListener("keydown", this.onKeydown, true);
    }

    private onKeydown(event: KeyboardEvent) {

        if (event.ctrlKey && event.key == "F8" && this._notebookPanel.isVisible) {

            this.onPressed(event);
        }
    }

    private onPressed(event: Event) {

        event.preventDefault();
        event.stopImmediatePropagation();

        this._pressed.emit(event);
    }

    get pressed(): ISignal<RecordButton, Event> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class StopButton extends Widget {

    private _pressed: Signal<StopButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super();

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.onDisposed, this);

        window.addEventListener("keydown", this.onKeydown, true);
    }

    public onDisposed() {

        window.removeEventListener("keydown", this.onKeydown, true);
    }

    private onKeydown(event: KeyboardEvent) {

        if (event.ctrlKey && event.key == "F9" && this._notebookPanel.isVisible) {

            this.onPressed(event);
        }
    }

    private onPressed(event: Event) {

        event.preventDefault();
        event.stopImmediatePropagation();

        this._pressed.emit(event);
    }

    get pressed(): ISignal<StopButton, Event> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class PlayButton extends Widget {

    private _pressed: Signal<PlayButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super();

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        window.addEventListener("keydown", this.onKeydown, true);

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.onDisposed, this);
    }

    public onDisposed() {

        window.removeEventListener("keydown", this.onKeydown, true);
    }

    private onKeydown(event: KeyboardEvent) {

        if (event.ctrlKey && event.key == "F10" && this._notebookPanel.isVisible) {

            this.onPressed(event);
        }
    }

    private onPressed(event: Event) {

        event.preventDefault();
        event.stopImmediatePropagation();

        this._pressed.emit(event);
    }

    get pressed(): ISignal<PlayButton, Event> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class PauseButton extends Widget {

    private _pressed: Signal<PauseButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super();

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.onDisposed, this);

        window.addEventListener("keydown", this.onKeydown, true);
    }

    public onDisposed() {

        window.removeEventListener("keydown", this.onKeydown, true);
    }

    private onKeydown(event: KeyboardEvent) {
        if (event.ctrlKey && event.key == "F11" && this._notebookPanel.isVisible) {
            this.onPressed(event);
        }
    }

    private onPressed(event: Event) {

        event.preventDefault();
        event.stopImmediatePropagation();
        this._pressed.emit(event);
    }

    get pressed(): ISignal<PauseButton, Event> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class SaveButton extends Widget {

    private _pressed: Signal<SaveButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super();

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        this.addClass("etc-jupyterlab-authoring-button");

        window.addEventListener("keydown", this.onKeydown, true);

        this._notebookPanel.disposed.connect(this.onDisposed, this);
    }

    public onDisposed() {

        window.removeEventListener("keydown", this.onKeydown, true);
    }

    private onKeydown(event: KeyboardEvent) {

        if (event.ctrlKey && event.key == "F12" && this._notebookPanel.isVisible) {

            this.onPressed(event);
        }
    }

    private onPressed(event: Event) {

        event.preventDefault();
        event.stopImmediatePropagation();

        this._pressed.emit(event);
    }

    get pressed(): ISignal<SaveButton, Event> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class AdvanceButton {

    private _notebookPanel: NotebookPanel;
    private _pressed: Signal<AdvanceButton, KeyboardEvent> = new Signal(this);

    constructor(
        { notebookPanel }:
            {
                notebookPanel: NotebookPanel
            }
    ) {
        this.onKeyDown = this.onKeyDown.bind(this);

        this._notebookPanel = notebookPanel;

        this._notebookPanel.node.addEventListener("keydown", this.onKeyDown, true);
    }

    private onKeyDown(event: KeyboardEvent) {

        if (event.code == "Space") {
            this._pressed.emit(event);
        }
    }

    get pressed(): ISignal<AdvanceButton, KeyboardEvent> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class StatusIndicator extends Widget {

    private _map: WeakMap<NotebookPanel, string>;
    private _currentNotebookPanel: NotebookPanel;

    constructor() {
        super();

        this.onStopped = this.onStopped.bind(this);
        this.onRecorderStarted = this.onRecorderStarted.bind(this);
        this.onPlayerStarted = this.onPlayerStarted.bind(this);

        this.addClass("jp-StatusIndicator");

        this._map = new WeakMap<NotebookPanel, string>();
    }

    public get onPlayerStopped() {
        return this.onStopped;
    }

    public get onRecorderStopped() {
        return this.onStopped;
    }

    public onStopped(sender: any, notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'stop');

        this.updateStatus();
    }

    public onPlayerStarted(sender: any, notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'play');

        this.updateStatus();
    }

    public onRecorderStarted(sender: any, notebookPanel: NotebookPanel) {

        this._map.set(notebookPanel, 'record');

        this.updateStatus();
    }

    public onCurrentChanged(sender: INotebookTracker, notebookPanel: NotebookPanel) {

        if (notebookPanel) {
            if (!this._map.has(notebookPanel)) {

                this._map.set(notebookPanel, 'stop');
            }

            this._currentNotebookPanel = notebookPanel;

            this.updateStatus();
        }
    }

    public updateStatus() {

        if (this._currentNotebookPanel.isVisible) {

            switch (this._map.get(this._currentNotebookPanel)) {
                case 'stop':
                    stopStatus.element({
                        container: this.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '24px'
                    });
                    break;
                case 'record':
                    recordStatus.element({
                        container: this.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '24px'
                    });
                    break;
                case 'play':
                    playStatus.element({
                        container: this.node,
                        stylesheet: 'toolbarButton',
                        alignSelf: 'normal',
                        height: '24px'
                    });
                    break;
            }
        }
    }

}
