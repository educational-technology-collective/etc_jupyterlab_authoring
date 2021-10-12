import { Widget, Panel, GridLayout, PanelLayout} from "@lumino/widgets";

import { Signal, ISignal } from "@lumino/signaling";

import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";

import { UUID } from '@lumino/coreutils';

import { 
    stopStatus, 
    playStatus, 
    recordStatus, 
    recordOffButton, 
    recordOnButton, 
    stopButton, 
    playButton, 
    ejectButton, 
    pauseButton, 
    playDisabledButton, 
    recordOffDisabledButton, 
    ejectDisabledButton,
    rightPanelIcon
} from './icons'

import {caretDownEmptyIcon} from '@jupyterlab/ui-components';


export class NotebookPanelWidget extends Widget {

    protected _notebookPanel: NotebookPanel;

    constructor({ notebookPanel, options }: { notebookPanel: NotebookPanel, options: Widget.IOptions }) {
        super({ node: document.createElement('div') });
        this._notebookPanel = notebookPanel;
    }

    get notebookPanel() {
        return this._notebookPanel;
    }
}

export class AudioInputSelectorWidget extends Widget {

    private _deviceSelected: Signal<AudioInputSelectorWidget, string> = new Signal<AudioInputSelectorWidget, string>(this);
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

    get deviceSelected(): ISignal<AudioInputSelectorWidget, string> {

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