import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from "@jupyterlab/notebook";

import {
  VideoInputSelectorContainer,
  AudioInputSelectorContainer,
  StatusIndicatorContainer,
  AuthoringPanel,
  ExecutionCheckbox,
  ScrollCheckbox,
  SaveDisplayRecordingCheckbox,
  ShowMediaControlsCheckbox,
  MediaControls,
} from './components';

import {
  StatusIndicator
} from './status_indicator';

import { IStatusBar } from "@jupyterlab/statusbar";
import { MessageRecorder } from './message_recorder';
import { MessagePlayer } from './message_player';
import { AudioInputSelector, VideoInputSelector } from "./av_input_selectors";

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { KeyBindings } from "./key_bindings";

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

    // app.commands.commandExecuted.connect((sender: any, args: any) => { console.log(args) });

    let keyBindings = new KeyBindings({ commandRegistry: app.commands, settings: settings });

    let authoringPanel = new AuthoringPanel();

    let audioInputSelectorContainer = new AudioInputSelectorContainer();
    let videoInputSelectorContainer = new VideoInputSelectorContainer();
    let executionCheckbox = new ExecutionCheckbox();
    let scrollCheckbox = new ScrollCheckbox();
    let saveDisplayRecordingCheckbox = new SaveDisplayRecordingCheckbox();
    let showMediaControlsCheckbox = new ShowMediaControlsCheckbox();

    authoringPanel.addWidget(audioInputSelectorContainer.widget);
    authoringPanel.addWidget(videoInputSelectorContainer.widget);
    authoringPanel.addWidget(executionCheckbox.widget);
    authoringPanel.addWidget(scrollCheckbox.widget);
    authoringPanel.addWidget(saveDisplayRecordingCheckbox.widget);
    authoringPanel.addWidget(showMediaControlsCheckbox.widget);

    labShell.add(authoringPanel, 'right');

    let statusIndicatorContainer = new StatusIndicatorContainer();
    let statusIndicator = new StatusIndicator({ widget: statusIndicatorContainer });

    let audioInputSelector = new AudioInputSelector({ node: audioInputSelectorContainer.widget.node });
    let videoInputSelector = new VideoInputSelector({ node: videoInputSelectorContainer.widget.node });

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:statusIndicator', {
      item: statusIndicatorContainer,
      align: "left",
      rank: -100
    });

    notebookTracker.currentChanged.connect(statusIndicator.onCurrentChanged, statusIndicator);
    //  There is one status indicator for all Notebooks; hence notify the status indicator whenever the user changes Notebooks.

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      try {

        await notebookPanel.revealed;
        await notebookPanel.sessionContext.ready;

        let mediaControls = new MediaControls({ notebookPanel, settings, showMediaControlsCheckbox });

        if (notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

          let messagePlayer = new MessagePlayer({
            notebookPanel,
            mediaControls,
            keyBindings,
            saveDisplayRecordingCheckbox,
            executionCheckbox,
            scrollCheckbox,
            statusIndicator
          });
        }
        else {

          let messageRecorder = new MessageRecorder({
            app,
            notebookTracker,
            notebookPanel,
            mediaControls,
            keyBindings,
            audioInputSelector,
            videoInputSelector,
            statusIndicator
          });
        }

        notebookPanel.toolbar.insertAfter(
          'cellType',
          `${PLUGIN_ID}:button_controls_widget`,
          mediaControls.panel
        );
      }
      catch (e) {

        console.error(e);
      }
    });
  }
}

export default extension;
