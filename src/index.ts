import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import {
  VideoInputSelectorContainer,
  AudioInputSelectorContainer,
  AuthoringPanel,
  ExecutionCheckbox,
  ScrollCheckbox,
  SaveDisplayRecordingCheckbox,
  ShowMediaControlsCheckbox,
  MediaControls,
  RecorderPanel,
  PlayerPanel,
  GeneralPanel,
  AdvanceLineColorPicker,
  RecordVideoCheckbox,
  ExecuteOnLastLineAdvance,
  PositionAdvanceLine,
  AuthoringToolbarStatus,
  PositionPlaybackCell,
  ShowToolbarStatusCheckbox,
  AuthoringVersion
} from './components';

import {
  AuthoringStatus
} from './authoring_status';

import { IStatusBar } from "@jupyterlab/statusbar";
import { MessageRecorder } from './message_recorder';
import { MessagePlayer } from './message_player';
import { AudioInputSelector, VideoInputSelector } from "./av_input_selectors";

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { KeyBindings } from "./key_bindings";
import { Collapse } from '@jupyterlab/apputils';
import { CommandRegistry } from "@lumino/commands";

import pack from './package.json';

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

    console.log(`JupyterLab extension ${PLUGIN_ID} is activated!\nVersion ${pack.version}`);

    app.commands.commandExecuted.connect((sender: CommandRegistry, args: CommandRegistry.ICommandExecutedArgs) => {
      console.log(args);
    });

    let settings = await settingRegistry.load(PLUGIN_ID);

    let keyBindings = new KeyBindings({ commandRegistry: app.commands, settings: settings });

    let generalPanel = new GeneralPanel();
    let recorderPanel = new RecorderPanel();
    let playerPanel = new PlayerPanel();

    let authoringPanel = new AuthoringPanel();

    authoringPanel.addWidget(new Collapse({ widget: generalPanel, collapsed: false }));
    authoringPanel.addWidget(new Collapse({ widget: recorderPanel, collapsed: false }));
    authoringPanel.addWidget(new Collapse({ widget: playerPanel, collapsed: false }));

    let audioInputSelectorContainer = new AudioInputSelectorContainer();
    let videoInputSelectorContainer = new VideoInputSelectorContainer();
    let audioInputSelector = new AudioInputSelector({ node: audioInputSelectorContainer.widget.node });
    let videoInputSelector = new VideoInputSelector({ node: videoInputSelectorContainer.widget.node });

    let recordVideoCheckbox = new RecordVideoCheckbox({ videoInputSelector });
    let executionCheckbox = new ExecutionCheckbox();
    let scrollCheckbox = new ScrollCheckbox();
    let saveDisplayRecordingCheckbox = new SaveDisplayRecordingCheckbox();
    let showMediaControlsCheckbox = new ShowMediaControlsCheckbox();
    let showToolbarStatusCheckbox = new ShowToolbarStatusCheckbox();
    let advanceLineColorPicker = new AdvanceLineColorPicker();
    let executeOnLastLineAdvance = new ExecuteOnLastLineAdvance();
    let positionAdvanceLine = new PositionAdvanceLine();
    let positionPlaybackCell = new PositionPlaybackCell();
    let authoringVersion = new AuthoringVersion({ version: pack.version });

    generalPanel.addWidget(showMediaControlsCheckbox.widget);
    generalPanel.addWidget(showToolbarStatusCheckbox.widget);
    generalPanel.addWidget(recordVideoCheckbox.widget);
    generalPanel.addWidget(authoringVersion.widget);

    recorderPanel.addWidget(audioInputSelectorContainer.widget);
    recorderPanel.addWidget(videoInputSelectorContainer.widget);
    recorderPanel.addWidget(executeOnLastLineAdvance.widget);
    recorderPanel.addWidget(advanceLineColorPicker.widget);
    recorderPanel.addWidget(positionAdvanceLine.widget);

    playerPanel.addWidget(executionCheckbox.widget);
    playerPanel.addWidget(scrollCheckbox.widget);
    playerPanel.addWidget(saveDisplayRecordingCheckbox.widget);
    playerPanel.addWidget(positionPlaybackCell.widget);

    labShell.add(authoringPanel, 'right');

    let authoringStatus = new AuthoringStatus();

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:authoring_status', {
      item: authoringStatus.panel,
      align: "left",
      rank: -100
    });

    notebookTracker.currentChanged.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      authoringStatus.updateCurrentNotebookPanel(notebookPanel);
    });
    //  There is one status indicator for all Notebooks; hence notify the status indicator whenever the user changes Notebooks.

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      try {

        await notebookPanel.revealed;
        await notebookPanel.sessionContext.ready;

        let authoringToolbarStatus = new AuthoringToolbarStatus({ notebookPanel, showToolbarStatusCheckbox, notebookTracker });

        let mediaControls = new MediaControls({ notebookPanel, settings, showMediaControlsCheckbox, notebookTracker });

        if (notebookPanel.content.model.metadata.has('etc_jupyterlab_authoring')) {

          let messagePlayer = new MessagePlayer({
            notebookPanel,
            mediaControls,
            keyBindings,
            saveDisplayRecordingCheckbox,
            executionCheckbox,
            scrollCheckbox,
            positionPlaybackCell,
            authoringStatus,
            authoringToolbarStatus
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
            advanceLineColorPicker,
            recordVideoCheckbox,
            executeOnLastLineAdvance,
            positionAdvanceLine,
            authoringStatus,
            authoringToolbarStatus
          });
        }

        notebookPanel.toolbar.insertAfter(
          'cellType',
          `${PLUGIN_ID}:authoring_toolbar_status`,
          authoringToolbarStatus.panel
        );

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
