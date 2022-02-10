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
import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";
import { VideoInputSelector } from "./av_input_selectors";

export class PositionPlaybackCell {

    public widget: Widget;

    private _inputChanged: Signal<PositionPlaybackCell, number> = new Signal(this);
    private _input: HTMLInputElement;

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-PositionPlaybackCell');

        this.widget.addClass('component');

        this._input = document.createElement('input');

        this._input.setAttribute('type', 'text');

        this._input.setAttribute('name', 'pal');

        this._input.setAttribute('value', '80');

        this._input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'pal');

        label.innerHTML = '% Position scroll to cell.';

        this.widget.node.appendChild(this._input);

        this.widget.node.appendChild(label);

        this._input.addEventListener('change', this);
    }

    public handleEvent(event: Event) {

        let number = parseFloat(this._input.value)

        if (number) {

            this._inputChanged.emit(number);
        }
    }

    get value(): number {

        let number = parseFloat(this._input.value)

        if (number) {

            return number;
        }
        else {
            return parseFloat(this._input.defaultValue);
        }
    }

    get inputChanged(): ISignal<PositionPlaybackCell, number> {

        return this._inputChanged;
    }
}

export class PositionAdvanceLine {

    public widget: Widget;

    private _inputChanged: Signal<PositionAdvanceLine, number> = new Signal(this);
    private _input: HTMLInputElement;

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-PositionAdvanceLine');

        this.widget.addClass('component');

        this._input = document.createElement('input');

        this._input.setAttribute('type', 'text');

        this._input.setAttribute('name', 'pal');

        this._input.setAttribute('value', '66');

        this._input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'pal');

        label.innerHTML = '% Position advance line.';

        this.widget.node.appendChild(this._input);

        this.widget.node.appendChild(label);

        this._input.addEventListener('change', this);
    }

    public handleEvent(event: Event) {

        let number = parseFloat(this._input.value)

        if (number) {

            this._inputChanged.emit(number);
        }
    }

    get value(): number {

        let number = parseFloat(this._input.value)

        if (number) {

            return number;
        }
        else {
            return parseFloat(this._input.defaultValue);
        }
    }

    get inputChanged(): ISignal<PositionAdvanceLine, number> {

        return this._inputChanged;
    }
}


export class ExecuteOnLastLineAdvance {

    public widget: Widget;

    private _checkboxChanged: Signal<ExecuteOnLastLineAdvance, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-ExecuteOnLastLineAdvance');

        this.widget.addClass('component');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'save');

        input.classList.add('jp-mod-styled');

        input.setAttribute('checked', 'true');

        let label = document.createElement('label');

        label.setAttribute('for', 'save');

        label.innerHTML = 'Execute on advance.';

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

    get checkboxChanged(): ISignal<ExecuteOnLastLineAdvance, boolean> {

        return this._checkboxChanged;
    }
}


export class RecordVideoCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<RecordVideoCheckbox, boolean> = new Signal(this);
    private _videoInputSelector: VideoInputSelector;

    constructor({ videoInputSelector }: { videoInputSelector: VideoInputSelector }) {

        this._videoInputSelector = videoInputSelector;

        this.widget = new Widget();

        this.widget.addClass('jp-RecordVideoCheckbox');

        this.widget.addClass('component');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'video');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'record');

        label.innerHTML = 'Record video.';

        this.widget.node.appendChild(input);

        this.widget.node.appendChild(label);

        input.addEventListener('click', this);

        this._videoInputSelector.disable();
    }

    public handleEvent(event: Event) {

        let checked = (event.target as HTMLInputElement).checked;

        this._checkboxChanged.emit(checked);

        if (checked) {

            this._videoInputSelector.enable();
        }
        else {

            this._videoInputSelector.disable();
        }
    }

    get checked(): boolean {

        return this.widget.node.querySelector('input').checked
    }

    get checkboxChanged(): ISignal<RecordVideoCheckbox, boolean> {

        return this._checkboxChanged;
    }
}

export class SaveDisplayRecordingCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<SaveDisplayRecordingCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-SaveDisplayRecordingCheckbox');

        this.widget.addClass('component');

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

        this.widget.addClass('component');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'scroll');

        input.classList.add('jp-mod-styled');

        input.setAttribute('checked', 'true');

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

export class ShowToolbarStatusCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<ShowToolbarStatusCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-ShowToolbarStatusCheckbox');

        this.widget.addClass('component');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.classList.add('jp-mod-styled');

        input.setAttribute('checked', 'true');

        let label = document.createElement('label');

        label.innerHTML = 'Show status in toolbar.';

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

    get checkboxChanged(): ISignal<ShowToolbarStatusCheckbox, boolean> {
        return this._checkboxChanged;
    }
}

export class ShowMediaControlsCheckbox {

    public widget: Widget;

    private _checkboxChanged: Signal<ShowMediaControlsCheckbox, boolean> = new Signal(this);

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-ShowMediaControlsCheckbox');

        this.widget.addClass('component');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.classList.add('jp-mod-styled');

        input.setAttribute('checked', 'true');

        let label = document.createElement('label');

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

        this.widget.addClass('component');

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
    private _notebookPanel: NotebookPanel;

    constructor({
        notebookPanel,
        settings,
        showMediaControlsCheckbox,
        notebookTracker
    }: {
        notebookPanel: NotebookPanel,
        settings: ISettingRegistry.ISettings,
        showMediaControlsCheckbox: ShowMediaControlsCheckbox,
        notebookTracker: INotebookTracker
    }) {

        this._notebookPanel = notebookPanel;

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

        showMediaControlsCheckbox.checkboxChanged.connect(this.updatePanelVisbility, this);

        this.updateToolTips(settings);

        this.updatePanelVisbility(showMediaControlsCheckbox, showMediaControlsCheckbox.checked);

        notebookTracker.currentChanged.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

            if (notebookPanel == this._notebookPanel) {

                await notebookPanel.revealed;
                await notebookPanel.sessionContext.ready;

                this.updatePanelVisbility(showMediaControlsCheckbox, showMediaControlsCheckbox.checked);

            }
        });
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

    private updatePanelVisbility(sender: ShowMediaControlsCheckbox, state: boolean) {

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

export class AdvanceLineColorPicker {

    public widget: Widget;

    private _colorChanged: Signal<AdvanceLineColorPicker, string> = new Signal(this);

    private _opacity = '40';

    constructor() {

        this.widget = new Widget();

        this.widget.addClass('jp-AdvanceLineColorPicker');

        this.widget.addClass('component');

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

export class AuthoringToolbarStatus {

    public panel: Panel;
    private content: HTMLElement;
    private notebookPanel: NotebookPanel;

    constructor({
        notebookPanel,
        showToolbarStatusCheckbox,
        notebookTracker
    }: {
        notebookPanel: NotebookPanel,
        showToolbarStatusCheckbox: ShowToolbarStatusCheckbox,
        notebookTracker: INotebookTracker
    }) {

        this.notebookPanel = notebookPanel;

        this.panel = new Panel();

        this.panel.addClass('jp-AuthoringToolbarStatus');

        let leftSpan = document.createElement('span');
        leftSpan.classList.add('left');
        leftSpan.innerHTML = '['

        let rightSpan = document.createElement('span');
        rightSpan.classList.add('right');
        rightSpan.innerHTML = ']'

        this.content = document.createElement('span');
        this.content.classList.add('content');

        this.panel.node.appendChild(leftSpan);
        this.panel.node.appendChild(this.content);
        this.panel.node.appendChild(rightSpan);

        this.reset();

        showToolbarStatusCheckbox.checkboxChanged.connect(this.updatePanelVisbility, this);

        this.updatePanelVisbility(showToolbarStatusCheckbox, showToolbarStatusCheckbox.checked)

        notebookTracker.currentChanged.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

            if (notebookPanel == this.notebookPanel) {

                await notebookPanel.revealed;
                await notebookPanel.sessionContext.ready;

                this.updatePanelVisbility(showToolbarStatusCheckbox, showToolbarStatusCheckbox.checked);
            }
        });
    }

    private updatePanelVisbility(sender: ShowToolbarStatusCheckbox, checked: boolean) {

        if (checked) {

            this.panel.show();
        }
        else {

            this.panel.hide();
        }
    }

    public setStatus(status: string) {

        this.content.innerHTML = status;
    }

    public reset() {

        this.content.innerHTML = '';
    }
}
