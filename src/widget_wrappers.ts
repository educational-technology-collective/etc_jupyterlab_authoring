import { Widget } from "@lumino/widgets";

import { Signal, ISignal } from "@lumino/signaling";

import { NotebookPanel } from "@jupyterlab/notebook";

export class ExecutionCheckbox {

    private _changed: Signal<ExecutionCheckbox, boolean> = new Signal<ExecutionCheckbox, boolean>(this);

    constructor({ widget }: { widget: Widget }) {

        this.onChange = this.onChange.bind(this);

        let input = widget.node.querySelector('input');

        input.addEventListener('change', this.onChange);
    }

    public onChange(event: Event) {

        this._changed.emit((event.target as HTMLInputElement).checked);
    }

    get changed(): ISignal<ExecutionCheckbox, boolean> {

        return this._changed;
    }
}

export class AudioInputSelector {

    private _deviceSelected: Signal<AudioInputSelector, string> = new Signal<AudioInputSelector, string>(this);
    public deviceId: string;
    private _select: HTMLSelectElement;

    constructor({ widget }: { widget: Widget }) {

        this.onDeviceChanged = this.onDeviceChanged.bind(this);
        this.onChange = this.onChange.bind(this);

        widget.node.addEventListener('change', this.onChange);

        this._select = widget.node.querySelector('select');

        this.deviceId = null;

        navigator.mediaDevices.addEventListener('devicechange', this.onDeviceChanged);

        (async () => {
            try {

                await navigator.mediaDevices.getUserMedia({ audio: true });

                navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
            }
            catch (e) {

                console.error(e);
            }
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


export class ResetButton {

    private _pressed: Signal<ResetButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor({ notebookPanel }: { notebookPanel: NotebookPanel }) {

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        this._notebookPanel = notebookPanel;

        window.addEventListener("keydown", this.onKeydown, true);

        this._notebookPanel.disposed.connect(this.onDisposed, this);
    }

    public onDisposed() {

        window.removeEventListener("keydown", this.onKeydown, true);
    }

    private onKeydown(event: KeyboardEvent) {

        if (event.ctrlKey && event.key == "F6" && this._notebookPanel.isVisible) {

            this.onPressed(event);
        }
    }

    private onPressed(event: Event) {

        event.preventDefault();
        event.stopImmediatePropagation();

        this._pressed.emit(event);
    }

    get pressed(): ISignal<ResetButton, Event> {
        return this._pressed;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class RecordButton {

    private _pressed: Signal<RecordButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        this._notebookPanel = notebookPanel;

        window.addEventListener("keydown", this.onKeydown, true);

        this._notebookPanel.disposed.connect(this.onDisposed, this);
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

export class StopButton {

    private _pressed: Signal<StopButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

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

export class PlayButton {

    private _pressed: Signal<PlayButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        window.addEventListener("keydown", this.onKeydown, true);

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

export class PauseButton {

    private _pressed: Signal<PauseButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

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

export class SaveButton {

    private _pressed: Signal<SaveButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {

        this._notebookPanel = notebookPanel;

        this.onDisposed = this.onDisposed.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

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



