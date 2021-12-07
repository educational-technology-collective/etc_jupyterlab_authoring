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
import { Signal } from "@lumino/signaling";

export class SaveDisplayRecordingCheckbox extends Widget {

    constructor() {
        super();

        this.addClass('jp-SaveDisplayRecordingCheckbox');

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

export class MediaControls extends BoxPanel {

    constructor({ options, settings }: { options: BoxPanel.IOptions, settings: ISettingRegistry.ISettings }) {
        super(options);

        this.addClass('jp-MediaControls');

        let recordOffButtonElement = recordOffButton.element({ className: 'record' });
        let stopButtonElement = stopButton.element({ className: 'stop' });
        let playButtonElement = playButton.element({ className: 'play' });
        let pauseButtonElement = pauseButton.element({ className: 'pause' });
        let saveButtonElement = saveButton.element({ className: 'save' });
        let resetButtonElement = ejectButton.element({ className: 'reset' });

        this.addWidget(new Widget({ node: recordOffButtonElement }));
        this.addWidget(new Widget({ node: stopButtonElement }));
        this.addWidget(new Widget({ node: playButtonElement }));
        this.addWidget(new Widget({ node: pauseButtonElement }));
        this.addWidget(new Widget({ node: resetButtonElement }));
        this.addWidget(new Widget({ node: saveButtonElement }));

        let updateToolTips = (settings: ISettingRegistry.ISettings, args: void) => {

            ['record', 'stop', 'play', 'pause', 'reset', 'save'].forEach((value: string) => {

                let keyBinding = settings.get(value).composite.toString();

                this.node.querySelector(
                    `.${value}`
                ).setAttribute(
                    'title', `${value[0].toUpperCase() + value.slice(1)}: ${keyBinding}`
                );
            });
        }

        settings.changed.connect(updateToolTips, this);

        updateToolTips(settings);
    }

    dispose() {
        super.dispose();

        Signal.disconnectAll(this);
    }
}


export class ScrollCheckbox extends Widget {

    constructor() {
        super();

        this.addClass('jp-ScrollCheckBox');

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

export class ShowMediaControlsCheckbox extends Widget {

    constructor() {
        super();

        this.addClass('jp-ShowMediaControlsCheckbox');

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

export class ExecutionCheckbox extends Widget {

    constructor() {
        super();

        this.addClass('jp-ExecutionCheckBox');

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

export class AudioInputSelectorContainer extends Widget {

    constructor() {
        super();

        this.addClass('jp-AudioSelector');

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

export class StatusIndicatorContainer extends Widget {

    constructor() {
        super();
        this.addClass("jp-StatusIndicatorContainer");
    }
}
