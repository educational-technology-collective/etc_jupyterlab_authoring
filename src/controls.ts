import { Widget } from "@lumino/widgets";

import { Signal, ISignal } from "@lumino/signaling";

import { NotebookPanel } from "@jupyterlab/notebook";

import { recordOffButton, recordOnButton, stopButton, playButton, ejectButton, pauseButton, playDisabledButton, recordOffDisabledButton, ejectDisabledButton} from './icons'

export class RecordButton extends Widget {

    private _pressed: Signal<RecordButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel, cellTypeIndex }:
            {
                notebookPanel: NotebookPanel,
                cellTypeIndex: number
            }
    ) {
        super();

        this._notebookPanel = notebookPanel;

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

        notebookPanel.toolbar.insertItem(cellTypeIndex + 1, "etc_jupyterlab_authoring:record", this);
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

        this.on();
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

export class StopButton extends Widget {

    private _pressed: Signal<StopButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel, cellTypeIndex }:
            {
                notebookPanel: NotebookPanel,
                cellTypeIndex: number
            }
    ) {
        super();

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

        notebookPanel.toolbar.insertItem(cellTypeIndex + 2, "etc_jupyterlab_authoring:stop", this);

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

export class PlayButton extends Widget {

    private _pressed: Signal<PlayButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel, cellTypeIndex }:
            {
                notebookPanel: NotebookPanel,
                cellTypeIndex: number
            }
    ) {
        super();

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

        notebookPanel.toolbar.insertAfter('etc_jupyterlab_authoring:stop', 'etc_jupyterlab_authoring:play', this);

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

export class PauseButton extends Widget {

    private _pressed: Signal<PauseButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel, cellTypeIndex }:
            {
                notebookPanel: NotebookPanel,
                cellTypeIndex: number
            }
    ) {
        super();

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

        notebookPanel.toolbar.insertAfter('etc_jupyterlab_authoring:play', 'etc_jupyterlab_authoring:pause', this);

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

export class SaveButton extends Widget {

    private _pressed: Signal<SaveButton, Event> = new Signal(this);
    private _notebookPanel: NotebookPanel;

    constructor(
        { notebookPanel, cellTypeIndex }:
            {
                notebookPanel: NotebookPanel,
                cellTypeIndex: number
            }
    ) {
        super();

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

        notebookPanel.toolbar.insertAfter('etc_jupyterlab_authoring:pause', 'etc_jupyterlab_authoring:save', this);

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

