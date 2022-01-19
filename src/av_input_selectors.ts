export class AudioInputSelector {

    public deviceId: string;
    public eventTarget: EventTarget;
    private _select: HTMLSelectElement;

    constructor({ node }: { node: HTMLElement }) {

        this.eventTarget = new EventTarget();

        this._select = node.querySelector('select');

        this.deviceId = 'default';

        let option = document.createElement('option');
        option.setAttribute('value', 'default');
        option.setAttribute('label', 'Default');
        this._select.appendChild(option);

        node.addEventListener('change', this);
        navigator.mediaDevices.addEventListener('devicechange', this);
        node.addEventListener('mousedown', this, true);
    }

    public async handleEvent(event: Event) {

        switch(event.type) {
            case 'mousedown':
                this.populate();
                break;
            case 'change':
                this.setDeviceId((event.target as HTMLSelectElement).value);
                break;
            case 'devicechange':
                this.populate();
                break;
        }
    }

    private async populate() {

        try {

            let mediaSteam = await navigator.mediaDevices.getUserMedia({ audio: true});

            let devices = await navigator.mediaDevices.enumerateDevices();

            mediaSteam.getTracks().forEach((value:MediaStreamTrack)=> value.stop());
            //  The media stream was opened only for the purpose of getting the available devices; hence, shutdown the media stream in order to clear the red indicator in the browser tab.

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

            this.eventTarget.dispatchEvent(new CustomEvent('audio_device_change', { detail: this.deviceId }));
        }
        catch (e) {

            console.error(e);
        }
    }

    private setDeviceId(value: string) {

        this.deviceId = value;

        this.eventTarget.dispatchEvent(new CustomEvent<string>('audio_device_change', { detail: value }));
    }
}

export class VideoInputSelector {

    public deviceId: string;
    public eventTarget: EventTarget;
    private _select: HTMLSelectElement;
    private _enabled: boolean = false;

    constructor({ node }: { node: HTMLElement }) {

        this.eventTarget = new EventTarget();

        this._select = node.querySelector('select');

        this.deviceId = 'default';

        let option = document.createElement('option');

        option.setAttribute('value', 'default');

        option.setAttribute('label', 'Default');
        
        this._select.appendChild(option);

        this._select.addEventListener('mousedown', this, true);
    }

    enable() {

        this._enabled = true;
        this._select.classList.add('enabled');
        this._select.classList.remove('disabled');
        this._select.addEventListener('change', this);
        navigator.mediaDevices.addEventListener('devicechange', this);
    }

    disable() {

        this._enabled = false;
        this._select.classList.add('disabled');
        this._select.classList.remove('enabled');
        this._select.removeEventListener('change', this);
        navigator.mediaDevices.removeEventListener('devicechange', this);
    }

    public async handleEvent(event: Event) {

        switch(event.type) {
            case 'mousedown':
                if (this._enabled) {

                    this.populate();
                }
                else {

                    event.preventDefault();
                }
                break;
            case 'change':
                this.setDeviceId((event.target as HTMLSelectElement).value);
                break;
            case 'devicechange':
                this.populate();
                break;
        }
    }

    private async populate() {

        try {

            let mediaSteam = await navigator.mediaDevices.getUserMedia({ video: true});

            let devices = await navigator.mediaDevices.enumerateDevices();

            mediaSteam.getTracks().forEach((value:MediaStreamTrack)=> value.stop());
            //  The media stream was opened only for the purpose of getting the available devices; hence, shutdown the media stream in order to clear the red indicator in the browser tab.

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

                if (device.kind == 'videoinput' && !optionDeviceIds.includes(device.deviceId)) {

                    let option = document.createElement('option');

                    option.setAttribute('value', device.deviceId);

                    option.setAttribute('label', device.label);

                    this._select.appendChild(option);
                }
            });

            this.deviceId = this._select.value;

            this.eventTarget.dispatchEvent(new CustomEvent('video_device_change', { detail: this.deviceId }));
        }
        catch (e) {

            console.error(e);
        }
    }

    private setDeviceId(value: string) {

        this.deviceId = value;

        this.eventTarget.dispatchEvent(new CustomEvent<string>('video_device_change', { detail: value }));
    }
}