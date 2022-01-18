import { Widget, Panel, BoxPanel } from "@lumino/widgets";

import { UUID } from '@lumino/coreutils';

import {
    rightPanelIcon,
    recordOffButton,
    stopButton,
    playButton,
    pauseButton,
    ejectButton,
    saveButton
} from './icons';

import { caretDownEmptyIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { ISignal, Signal } from "@lumino/signaling";
import { NotebookPanel } from "@jupyterlab/notebook";

export class SaveDisplayRecordingCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<SaveDisplayRecordingCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-SaveDisplayRecordingCheckbox');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'save');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'save');

        label.innerHTML = 'Save playback.';

        this.widget.node.appendChild(input);

        this.widget.node.appendChild(label);

        input.addEventListener('click', this);
    }

    public handleEvent(event: Event) {

        this._checkboxChanged.emit((event.target as HTMLInputElement).checked)
    }

    get checked(): boolean {

        return this.widget.node.querySelector('input').checked
    }

    get checkboxChanged(): ISignal<SaveDisplayRecordingCheckbox, boolean> {
        return this._checkboxChanged;
    }
}

export class ScrollCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<ScrollCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-ScrollCheckBox');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'scroll');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'scroll');

        label.innerHTML = 'Scroll to cell during playback.';

        this.widget.node.appendChild(input);

        this.widget.node.appendChild(label);

        input.addEventListener('click', this);
    }

    public handleEvent(event: Event) {

        this._checkboxChanged.emit((event.target as HTMLInputElement).checked)
    }

    get checked(): boolean {

        return this.widget.node.querySelector('input').checked
    }

    get checkboxChanged(): ISignal<ScrollCheckbox, boolean> {
        return this._checkboxChanged;
    }
}

export class ShowMediaControlsCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<ShowMediaControlsCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-ShowMediaControlsCheckbox');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'execution');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'execution');

        label.innerHTML = 'Show media controls in toolbar.';

        this.widget.node.appendChild(input);

        this.widget.node.appendChild(label);

        input.addEventListener('click', this);
    }

    public handleEvent(event: Event) {

        this._checkboxChanged.emit((event.target as HTMLInputElement).checked)
    }

    get checked(): boolean {

        return this.widget.node.querySelector('input').checked
    }

    get checkboxChanged(): ISignal<ShowMediaControlsCheckbox, boolean> {
        return this._checkboxChanged;
    }
}

export class ExecutionCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<ExecutionCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-ExecutionCheckBox');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'execution');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'execution');

        label.innerHTML = 'Execute cells during playback.';

        this.widget.node.appendChild(input);

        this.widget.node.appendChild(label);

        input.addEventListener('click', this);
    }

    public handleEvent(event: Event) {

        this._checkboxChanged.emit((event.target as HTMLInputElement).checked)
    }

    get checked(): boolean {

        return this.widget.node.querySelector('input').checked
    }

    get checkboxChanged(): ISignal<ExecutionCheckbox, boolean> {
        return this._checkboxChanged;
    }
}

export class AudioInputSelectorContainer {

    public widget: Widget;

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-AudioSelector');

        this.widget.node.innerHTML = 'Audio Input';

        let div = document.createElement('div');

        div.classList.add('jp-select-wrapper');

        let select = document.createElement('select');

        select.classList.add('jp-mod-styled');

        let span = document.createElement('span');

        span.classList.add('f1st5hdn');

        span.innerHTML = caretDownEmptyIcon.svgstr;

        this.widget.node.appendChild(div).append(select, span);
    }
}


export class VideoInputSelectorContainer {

    public widget: Widget;

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-VideoSelector');

        this.widget.node.innerHTML = 'Video Input';

        let div = document.createElement('div');

        div.classList.add('jp-select-wrapper');

        let select = document.createElement('select');

        select.classList.add('jp-mod-styled');

        let span = document.createElement('span');

        span.classList.add('f1st5hdn');

        span.innerHTML = caretDownEmptyIcon.svgstr;

        this.widget.node.appendChild(div).append(select, span);
    }
}

export class AuthoringPanel extends Panel {

    constructor() {
        super();

        this.id = UUID.uuid4();

        this.addClass('jp-AuthoringPanel');

        this.title.icon = rightPanelIcon;
    }
}

export class GeneralPanel extends Panel {

    constructor() {
        super();

        this.id = UUID.uuid4();

        this.addClass('jp-GeneralPanel');

        this.title.label = "General Tools";
    }
}


export class RecorderPanel extends Panel {

    constructor() {
        super();

        this.id = UUID.uuid4();

        this.addClass('jp-RecorderPanel');

        this.title.label = "Recording Tools";
    }
}

export class PlayerPanel extends Panel {

    constructor() {
        super();

        this.id = UUID.uuid4();

        this.addClass('jp-PlayerPanel');

        this.title.label = "Playback Tools";

    }
}

export class MediaControls {

    public panel: BoxPanel;

    private _buttonPressed: Signal<MediaControls, { command: string }> = new Signal<MediaControls, { command: string }>(this);

    private _resetButton: HTMLElement;
    private _recordButton: HTMLElement;
    private _stopButton: HTMLElement;
    private _playButton: HTMLElement;
    private _pauseButton: HTMLElement;
    private _saveButton: HTMLElement;
    private _showMediaControlsCheckbox: ShowMediaControlsCheckbox;

    constructor({
        notebookPanel,
        settings,
        showMediaControlsCheckbox
    }: {
        notebookPanel: NotebookPanel,
        settings: ISettingRegistry.ISettings,
        showMediaControlsCheckbox: ShowMediaControlsCheckbox
    }) {

        let mediaControlsBoxPanel = this.panel = new BoxPanel({ direction: 'left-to-right', alignment: 'start' });

        mediaControlsBoxPanel.addClass('jp-MediaControlsBoxPanel');

        let recordOffButtonElement = recordOffButton.element({ className: 'record' });
        recordOffButtonElement.setAttribute('name', 'record');
        recordOffButtonElement.addEventListener('click', this, true);

        let stopButtonElement = stopButton.element({ className: 'stop' });
        stopButtonElement.setAttribute('name', 'stop');
        stopButtonElement.addEventListener('click', this, true);

        let playButtonElement = playButton.element({ className: 'play' });
        playButtonElement.setAttribute('name', 'play');
        playButtonElement.addEventListener('click', this, true);

        let pauseButtonElement = pauseButton.element({ className: 'pause' });
        pauseButtonElement.setAttribute('name', 'pause');
        pauseButtonElement.addEventListener('click', this, true);

        let resetButtonElement = ejectButton.element({ className: 'reset' });
        resetButtonElement.setAttribute('name', 'reset');
        resetButtonElement.addEventListener('click', this, true);

        let saveButtonElement = saveButton.element({ className: 'save' });
        saveButtonElement.setAttribute('name', 'save');
        saveButtonElement.addEventListener('click', this, true);

        mediaControlsBoxPanel.addWidget(new Widget({ node: recordOffButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: stopButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: playButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: pauseButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: resetButtonElement }));
        mediaControlsBoxPanel.addWidget(new Widget({ node: saveButtonElement }));

        settings.changed.connect(this.updateToolTips, this);

        showMediaControlsCheckbox.checkboxChanged.connect(this.updatePanelVisibily, this);

        this.updateToolTips(settings);

        this.updatePanelVisibily(showMediaControlsCheckbox, showMediaControlsCheckbox.checked);
    }

    dispose() {
        Signal.disconnectAll(this);
    }

    public async handleEvent(event: Event) {

        try {

            if (event.type == 'click') {

                let command = (event.currentTarget as HTMLElement).getAttribute('name');

                this._buttonPressed.emit({ command });
            }
        }
        catch (e) {

            console.error(e);
        }
    }

    private updateToolTips(settings: ISettingRegistry.ISettings, args: void) {

        ['record', 'stop', 'play', 'pause', 'reset', 'save'].forEach((value: string) => {

            let keyBinding = settings.get(value).composite.toString();

            this.panel.node.querySelector(
                `.${value}`
            ).setAttribute(
                'title', `${value[0].toUpperCase() + value.slice(1)}: ${keyBinding}`
            );
        });
    }

    private updatePanelVisibily(sender: ShowMediaControlsCheckbox, state: boolean) {

        if (state) {
            this.panel.show();
        }
        else {
            this.panel.hide();
        }
    }

    get buttonPressed(): ISignal<MediaControls, { command: string }> {
        return this._buttonPressed;
    }
}

export class MediaPlayer {

    private _videoElement: HTMLVideoElement;
    private _notebookPanel: NotebookPanel;

    constructor({ notebookPanel, blob }: { notebookPanel: NotebookPanel, blob: Blob }) {

        this._notebookPanel = notebookPanel;

        let videoElement = this._videoElement = document.createElement('video');

        this._videoElement.src = URL.createObjectURL(blob);

        videoElement.style.border = '5px solid white';
        videoElement.style.position = 'absolute';
        videoElement.style.right = '0px';
        videoElement.style.top = '0px';
        videoElement.style.width = '300px';
        videoElement.style.zIndex = '9999';
        videoElement.style.backgroundColor = 'black';
        videoElement.style.opacity = '0';
    }

    updatePosition(element: HTMLElement, lineNumber: number) {

        // let lineHeight = parseInt(element.style.lineHeight);

        this._videoElement.style.top = `${this._notebookPanel.content.node.scrollTop}px`;

        this._notebookPanel.content.node.appendChild(this._videoElement);
    }

    remove() {
        //this._notebookPanel.content.node.removeChild(this._videoElement);
    }

    get mediaElement(): HTMLVideoElement {
        return this._videoElement;
    }
}


export class AdvanceLineColorPicker {

    public widget: Widget;

    private _colorChanged: Signal<AdvanceLineColorPicker, string> = new Signal(this);

    private _opacity = '40';

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-AdvanceLineColorPicker');

        let input = document.createElement('input');

        input.setAttribute('type', 'color');

        input.setAttribute('value', '#FFCB05');

        let label = document.createElement('label');

        label.innerHTML = 'Advance line color.';

        this.widget.node.appendChild(input);

        this.widget.node.appendChild(label);

        input.addEventListener('input', this);
    }

    public handleEvent(event: Event) {

        this._colorChanged.emit((event.target as HTMLInputElement).value + this._opacity)
    }

    get color(): string {

        return this.widget.node.querySelector('input').value + this._opacity;
    }

    get colorChanged(): ISignal<AdvanceLineColorPicker, string> {

        return this._colorChanged;
    }
}