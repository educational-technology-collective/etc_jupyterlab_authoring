import { Widget, Panel, GridLayout, PanelLayout } from "@lumino/widgets";

import { Signal, ISignal } from "@lumino/signaling";

import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

import { stopStatus, playStatus, recordStatus, recordOffButton, recordOnButton, stopButton, playButton, ejectButton, pauseButton, playDisabledButton, recordOffDisabledButton, ejectDisabledButton } from './icons'

export class NotebookPanelWidget extends Widget {

    protected _notebookPanel: NotebookPanel;

    constructor({ notebookPanel, options }: { notebookPanel: NotebookPanel, options: Widget.IOptions }) {
        super({node:document.createElement('div')});
        this._notebookPanel = notebookPanel;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class AudioSelectorWidget extends Widget {

    private _deviceSelected: Signal<AudioSelectorWidget, string> = new Signal<AudioSelectorWidget, string>(this);
    private _deviceId: string;

    constructor() {

        super({ node: document.createElement('select') });

        this.id = 'etc_jupyterlab_authoring:plugin:authoring_selector_widget';

        this.addClass('jp-AudioSelectorWidget');

        this.onChange = this.onChange.bind(this);

        this.node.style.width = '100%';

        this.node.addEventListener('change', this.onChange);

        this._deviceId = 'default';

        (async () => {

            await navigator.mediaDevices.getUserMedia({ audio: true });

            let devices = await navigator.mediaDevices.enumerateDevices();

            devices.forEach((device: MediaDeviceInfo) => {

                if (device.kind == 'audioinput') {

                    let option = document.createElement('option');

                    option.setAttribute('value', device.deviceId);

                    option.setAttribute('label', device.label);

                    if (device.deviceId == 'default') {

                        option.setAttribute('selected', '');
                    }

                    this.node.appendChild(option);
                }
            });

            this._deviceSelected.emit(this._deviceId);
        })();
    }

    private onChange(event: Event) {
        this._deviceId = (event.target as HTMLSelectElement).value;
        this._deviceSelected.emit(this._deviceId);
    }

    get deviceSelected(): ISignal<AudioSelectorWidget, string> {
        return this._deviceSelected;
    }
}

export class AuthoringSidePanel extends Panel {

    layout: PanelLayout;

    constructor() {
        super();

        this.id = 'etc_jupyterlab_authoring:plugin:authoring_side_panel';

        this.addClass('jp-AuthoringSidePanel');
    }
}

export class RecordButton extends NotebookPanelWidget {

    private _pressed: Signal<RecordButton, Event> = new Signal(this);

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({ notebookPanel, options: null });


        this.dispose = this.dispose.bind(this);
        this.off = this.off.bind(this);
        this.on = this.on.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        if (!this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")) {

            window.addEventListener("keydown", this.onKeydown, true);

            this.node.addEventListener('click', this.onPressed);

            this.off();
        }
        else {

            recordOffDisabledButton.element({
                container: this.node,
                stylesheet: 'toolbarButton',
                alignSelf: 'normal',
                height: '24px'
            });
        }

        this._notebookPanel.disposed.connect(this.dispose, this);

        this.addClass("etc-jupyterlab-authoring-button");
    }

    public dispose() {

        window.removeEventListener("keydown", this.onKeydown, true);

        this.node.removeEventListener("click", this.onPressed, false);
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

    public off() {

        recordOffButton.element({
            container: this.node,
            stylesheet: 'toolbarButton',
            alignSelf: 'normal',
            height: '24px'
        });
    }

    public on() {

        recordOnButton.element({
            container: this.node,
            stylesheet: 'toolbarButton',
            alignSelf: 'normal',
            height: '24px'
        });
    }

    get pressed(): ISignal<RecordButton, Event> {
        return this._pressed;
    }
}

export class StopButton extends NotebookPanelWidget {

    private _pressed: Signal<StopButton, Event> = new Signal(this);

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({ notebookPanel, options: null });

        this._notebookPanel = notebookPanel;

        this.dispose = this.dispose.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        stopButton.element({
            container: this.node,
            stylesheet: 'toolbarButton',
            alignSelf: 'normal',
            height: '24px'
        });

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.dispose, this);

        window.addEventListener("keydown", this.onKeydown, true);

        this.node.addEventListener('click', this.onPressed, true);
    }

    public dispose() {
        window.removeEventListener("keydown", this.onKeydown, true);
        this.node.removeEventListener("click", this.onPressed, true);
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
}

export class PlayButton extends NotebookPanelWidget {

    private _pressed: Signal<PlayButton, Event> = new Signal(this);

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({ notebookPanel, options: null });

        this._notebookPanel = notebookPanel;

        this.dispose = this.dispose.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        if (this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")) {

            playButton.element({
                container: this.node,
                stylesheet: 'toolbarButton',
                alignSelf: 'normal',
                height: '24px'
            });

            window.addEventListener("keydown", this.onKeydown, true);

            this.node.addEventListener('click', this.onPressed, true);
        }
        else {

            playDisabledButton.element({
                container: this.node,
                stylesheet: 'toolbarButton',
                alignSelf: 'normal',
                height: '24px'
            });
        }

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.dispose, this);
    }

    public dispose() {
        window.removeEventListener("keydown", this.onKeydown, true);
        this.node.removeEventListener("click", this.onPressed, true);
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
}

export class PauseButton extends NotebookPanelWidget {

    private _pressed: Signal<PauseButton, Event> = new Signal(this);
    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({ notebookPanel, options: null });

        this._notebookPanel = notebookPanel;

        this.dispose = this.dispose.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        pauseButton.element({
            container: this.node,
            stylesheet: 'toolbarButton',
            alignSelf: 'normal',
            height: '24px'
        });

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.dispose, this);

        window.addEventListener("keydown", this.onKeydown, true);

        this.node.addEventListener('click', this.onPressed, true);
    }

    public dispose() {

        window.removeEventListener("keydown", this.onKeydown, true);
        this.node.removeEventListener("click", this.onPressed, true);
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
}

export class SaveButton extends NotebookPanelWidget {

    private _pressed: Signal<SaveButton, Event> = new Signal(this);

    constructor(
        { notebookPanel }: { notebookPanel: NotebookPanel }) {
        super({ notebookPanel, options: null });

        this._notebookPanel = notebookPanel;

        this.dispose = this.dispose.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
        this.onPressed = this.onPressed.bind(this);

        if (!this._notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")) {

            ejectButton.element({
                container: this.node,
                stylesheet: 'toolbarButton',
                alignSelf: 'normal',
                height: '24px'
            });

            window.addEventListener("keydown", this.onKeydown, true);

            this.node.addEventListener('click', this.onPressed, true);
        }
        else {
            ejectDisabledButton.element({
                container: this.node,
                stylesheet: 'toolbarButton',
                alignSelf: 'normal',
                height: '24px'
            });
        }

        this.addClass("etc-jupyterlab-authoring-button");

        this._notebookPanel.disposed.connect(this.dispose, this);
    }

    public dispose() {
        window.removeEventListener("keydown", this.onKeydown, true);
        this.node.removeEventListener("click", this.onPressed, true);
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
}

export class StatusIndicator extends Widget {

    private _map: WeakMap<NotebookPanel, string>;

    private _currentNotebookPanel: NotebookPanel;

    constructor() {
        super();

        this.stop = this.stop.bind(this);
        this.record = this.record.bind(this);
        this.play = this.play.bind(this);

        this.addClass("jp-StatusIndicator");

        this._map = new WeakMap<NotebookPanel, string>();
    }

    public stop(sender: NotebookPanelWidget, args: any) {

        this._map.set(sender.notebookPanel, 'stop');

        this.updateStatus();
    }

    public play(sender: NotebookPanelWidget, args: any) {

        this._map.set(sender.notebookPanel, 'play');

        this.updateStatus();
    }

    public record(sender: NotebookPanelWidget, args: any) {

        this._map.set(sender.notebookPanel, 'record');

        this.updateStatus();
    }

    public onCurrentChanged(sender: INotebookTracker, notebookPanel: NotebookPanel) {

        if (!this._map.has(notebookPanel)) {

            this._map.set(notebookPanel, 'stop');
        }

        this._currentNotebookPanel = notebookPanel;

        this.updateStatus();
    }

    public updateStatus() {

        if (this._currentNotebookPanel.isVisible) {

            switch(this._map.get(this._currentNotebookPanel)) {
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
