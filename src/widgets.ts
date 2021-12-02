import { Widget, Panel, MenuBar, TabBar, BoxPanel } from "@lumino/widgets";

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

export class MediaControlsPanel extends BoxPanel {

    constructor(options: BoxPanel.IOptions) {
        super(options);

        this.addClass('jp-MediaControlsPanel');

        let recordOffButtonElement = recordOffButton.element({className:'record'});
        let stopButtonElement = stopButton.element({className:'stop'});
        let playButtonElement = playButton.element({className:'play'});
        let pauseButtonElement = pauseButton.element({className:'pause'});
        let saveButtonElement = saveButton.element({className:'save'});
        let resetButtonElement = ejectButton.element({className:'reset'});

        this.addWidget(new Widget({ node: recordOffButtonElement }));
        this.addWidget(new Widget({ node: stopButtonElement }));
        this.addWidget(new Widget({ node: playButtonElement }));
        this.addWidget(new Widget({ node: pauseButtonElement }));
        this.addWidget(new Widget({ node: resetButtonElement }));
        this.addWidget(new Widget({ node: saveButtonElement }));

        // recordOffButtonElement.setAttribute('title', 'TEST');
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

export class ShowMediaControlsCheckboxWidget extends Widget {

    constructor() {
        super();

        this.addClass('jp-ShowMediaControlsCheckboxWidget');

        let input = document.createElement('input');

        input.setAttribute('type', 'checkbox');

        input.setAttribute('name', 'execution');

        input.classList.add('jp-mod-styled');

        let label = document.createElement('label');

        label.setAttribute('for', 'execution');

        label.innerHTML = 'Show media controls in toolbar.';

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
