import { LabIcon } from "@jupyterlab/ui-components";

import recordOnButtonSVG from "../icons/record_on.svg";
import recordOffButtonSVG from "../icons/record_off.svg";
import recordOffDisabledButtonSVG from "../icons/record_off_disabled.svg";
import stopButtonSVG from "../icons/stop.svg";
import playButtonSVG from "../icons/play.svg";
import playDisabledButtonSVG from "../icons/play_disabled.svg";
import pauseButtonSVG from "../icons/pause.svg";
import ejectButtonSVG from "../icons/eject.svg";
import ejectDisabledButtonSVG from "../icons/eject_disabled.svg";
import recordStatusSVG from "../icons/record_status.svg";
import stopStatusSVG from "../icons/stop_status.svg";
import playStatusSVG from "../icons/play_status.svg";
import rightPanelIconSVG from '../icons/GS-pen.svg';

export const rightPanelIcon = new LabIcon({
    name: 'etc_jupyterlab_authoring:right_panel_icon',
    svgstr: rightPanelIconSVG
});

export const recordOnButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:record_on',
    svgstr: recordOnButtonSVG
});

export const recordOffButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:record_off',
    svgstr: recordOffButtonSVG
});

export const recordOffDisabledButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:record_off_disabled',
    svgstr: recordOffDisabledButtonSVG
});

export const stopButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:stop',
    svgstr: stopButtonSVG
});

export const playButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:play',
    svgstr: playButtonSVG
});

export const playDisabledButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:play-disabled',
    svgstr: playDisabledButtonSVG
});

export const pauseButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:pause',
    svgstr: pauseButtonSVG
});

export const ejectButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:eject',
    svgstr: ejectButtonSVG
});

export const ejectDisabledButton = new LabIcon({
    name: 'etc_jupyterlab_authoring:eject_disabled',
    svgstr: ejectDisabledButtonSVG
});

export const recordStatus = new LabIcon({
    name: 'etc_jupyterlab_authoring:record_status',
    svgstr: recordStatusSVG
});

export const stopStatus = new LabIcon({
    name: 'etc_jupyterlab_authoring:stop_status',
    svgstr: stopStatusSVG
});

export const playStatus = new LabIcon({
    name: 'etc_jupyterlab_authoring:play_status',
    svgstr: playStatusSVG
});