import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import { ISignal, Signal } from "@lumino/signaling";

import {
  AudioInputSelectorWidget,
  StatusIndicatorWidget,
  AuthoringPanel,
  ExecutionCheckboxWidget,
  ScrollCheckboxWidget,
  SaveDisplayRecordingCheckboxWidget,
  ShowMediaControlsCheckboxWidget
} from './widgets';

import {
  StatusIndicator
} from './status_indicator';

import { IStatusBar } from "@jupyterlab/statusbar";
import { MessageRecorder } from './message_recorder';
import { MessagePlayer } from './message_player';
import { AudioInputSelector } from "./audio_input_selector";
import { each } from "@lumino/algorithm";
import { MediaControls } from "./media-controls";

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from "@lumino/commands";

export const PLUGIN_ID = '@educational-technology-collective/etc_jupyterlab_authoring:plugin';

/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [
    INotebookTracker,
    ILabShell,
    IStatusBar,
    ISettingRegistry
  ],
  activate: async (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    labShell: ILabShell,
    statusBar: IStatusBar,
    settingRegistry: ISettingRegistry
  ) => {
    console.log(`JupyterLab extension ${PLUGIN_ID} is activated!`);

    let settings = await settingRegistry.load(PLUGIN_ID);

    let authoringPanel = new AuthoringPanel();

    let audioInputSelectorWidget = new AudioInputSelectorWidget();
    let executionCheckboxWidget = new ExecutionCheckboxWidget();
    let scrollCheckboxWidget = new ScrollCheckboxWidget();
    let saveDisplayRecordingCheckboxWidget = new SaveDisplayRecordingCheckboxWidget();
    let showMediaControlsCheckboxWidget = new ShowMediaControlsCheckboxWidget();

    authoringPanel.addWidget(audioInputSelectorWidget);
    authoringPanel.addWidget(executionCheckboxWidget);
    authoringPanel.addWidget(scrollCheckboxWidget);
    authoringPanel.addWidget(saveDisplayRecordingCheckboxWidget);
    authoringPanel.addWidget(showMediaControlsCheckboxWidget);

    labShell.add(authoringPanel, 'right');

    let statusIndicatorWidget = new StatusIndicatorWidget();
    let statusIndicator = new StatusIndicator({ widget: statusIndicatorWidget });

    let audioInputSelector = new AudioInputSelector({ node: audioInputSelectorWidget.node });

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:statusIndicator', {
      item: statusIndicatorWidget,
      align: "left",
      rank: -100
    });

    notebookTracker.currentChanged.connect(statusIndicator.onCurrentChanged, statusIndicator);
    //  There is one status indicator for all Notebooks; hence notify the status indicator whenever the user changes Notebooks.

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      try {

        await notebookPanel.revealed;
        await notebookPanel.sessionContext.ready;

        let messageRecorder = new MessageRecorder({
          notebookPanel,
          audioInputSelector,
          statusIndicator
        });

        let messagePlayer = new MessagePlayer({
          notebookPanel,
          messageRecorder,
          statusIndicator,
          executionCheckbox: executionCheckboxWidget.node,
          scrollCheckbox: scrollCheckboxWidget.node,
          saveDisplayRecordingCheckbox: saveDisplayRecordingCheckboxWidget.node
        });

        let mediaControls = new MediaControls({
          commandRegistry: app.commands,
          settings: settings,
          notebookPanel,
          showMediaControlsCheckboxWidget,
          messageRecorder,
          messagePlayer
        });

      }
      catch (e) {

        console.error(e);
      }
    });
  }
}

export default extension;
