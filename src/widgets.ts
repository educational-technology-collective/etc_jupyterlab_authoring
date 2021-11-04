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

export class ScrollCheckboxWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-ScrollCheckBoxWidget');

        this.node.innerHTML = '<p>Scroll to cell during Playback</p>';

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'scroll');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'scroll');

        label.innerHTML = 'Enable';

        this.node.appendChild(input);

        this.node.appendChild(label);
    }
}

export class ExecutionCheckboxWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-ExecutionCheckBoxWidget');

        this.node.innerHTML = '<p>Execute Cells during Playback</p>';

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'execution');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'execution');

        label.innerHTML = 'Enable';

        this.node.appendChild(input);

        this.node.appendChild(label);
    }
}

export class AudioInputSelectorWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-AudioSelectorWidget');

        this.node.innerHTML = 'Audio Input';

        let div = document.createElement('div');

        div.classList.add('jp-select-wrapper');

        let select = document.createElement('select');

        select.classList.add('jp-mod-styled');

        let span = document.createElement('span');

        span.classList.add('f1st5hdn');

        span.innerHTML = caretDownEmptyIcon.svgstr;

        this.node.appendChild(div).append(select, span);
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

export class StatusIndicatorWidget extends Widget {

    constructor() {
        super();
        this.addClass("jp-StatusIndicatorWidget");
    }
}
