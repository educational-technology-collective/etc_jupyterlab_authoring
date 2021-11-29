import { Widget, Panel } from "@lumino/widgets";

import { UUID } from '@lumino/coreutils';

import {
    rightPanelIcon,
    recordOffButton,
    stopButton,
    playButton,
    pauseButton,
    ejectButton,
    saveButton
} from './icons'

import { caretDownEmptyIcon } from '@jupyterlab/ui-components';

export class SaveDisplayRecordingCheckboxWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-SaveDisplayRecordingCheckboxWidget');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'save');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'save');

        label.innerHTML = 'Save playback.';

        this.node.appendChild(input);

        this.node.appendChild(label);
    }
}

export class ButtonControlsWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-ButtonControlsWidget');

        this.node.appendChild(recordOffButton.element());
        this.node.appendChild(stopButton.element());
        this.node.appendChild(playButton.element());
        this.node.appendChild(pauseButton.element());
        this.node.appendChild(ejectButton.element());
        this.node.appendChild(saveButton.element());
    }
}


export class ScrollCheckboxWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-ScrollCheckBoxWidget');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'scroll');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'scroll');

        label.innerHTML = 'Scroll to cell during playback.';

        this.node.appendChild(input);

        this.node.appendChild(label);
    }
}

export class ExecutionCheckboxWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-ExecutionCheckBoxWidget');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'execution');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'execution');

        label.innerHTML = 'Execute cells during playback.';

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
