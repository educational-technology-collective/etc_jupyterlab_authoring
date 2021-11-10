export class AudioInputSelector {

    public deviceId: string;
    public eventTarget: EventTarget;
    private _select: HTMLSelectElement;

    constructor({ node }: { node: HTMLElement }) {

        this.eventTarget = new EventTarget();

        node.addEventListener('change', this.handleChange.bind(this));

        this._select = node.querySelector('select');

        this.deviceId = null;

        navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange.bind(this));

        (async () => {
            try {

                await navigator.mediaDevices.getUserMedia({ audio: true });

                this.handleDeviceChange();
            }
            catch (e) {

                console.error(e);
            }
        })();
    }

    private async handleDeviceChange(event?: Event) {

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

            this.eventTarget.dispatchEvent(new CustomEvent('audio_device_change', { detail: this.deviceId }));
        }
        catch (e) {

            console.error(e);
        }
    }

    private handleChange(event: Event) {

        this.deviceId = (event.target as HTMLSelectElement).value;

        this.eventTarget.dispatchEvent(new CustomEvent<string>('audio_device_change', { detail: this.deviceId }));
    }
}