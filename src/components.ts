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

export class AuthoringPanel extends Panel {

    constructor() {
        super();

        this.id = UUID.uuid4();

        this.addClass('jp-AuthoringPanel');

        this.title.icon = rightPanelIcon;
    }
}

export class StatusIndicatorContainer extends Widget {

    constructor() {
        super();
        this.addClass("jp-StatusIndicatorContainer");
    }
}
