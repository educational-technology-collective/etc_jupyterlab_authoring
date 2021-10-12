import { each } from '@lumino/algorithm';

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  Notebook,
  NotebookActions,
  NotebookPanel,
  NotebookTools
} from "@jupyterlab/notebook";

import { Widget, Panel, GridLayout, PanelLayout } from "@lumino/widgets";

import { Signal } from "@lumino/signaling";

import { AuthoringSidePanel, AdvanceButton, RecordButton, StopButton, PlayButton, PauseButton, SaveButton, StatusIndicator, AudioInputSelectorWidget } from "./components";

import { IStatusBar } from "@jupyterlab/statusbar";

import { MessageRecorder } from './message_recorder';
import { MessagePlayer } from './message_player';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc_jupyterlab_authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker,
    ILabShell,
    IStatusBar,
    INotebookTracker,
    ITranslator
  ],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    labShell: ILabShell,
    statusBar: IStatusBar,
    tracker: INotebookTracker,
    translator: ITranslator
  ) => {
    console.log("JupyterLab extension etc_jupyterlab_authoring is activated!");

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    });

    let authoringSidePanel = new AuthoringSidePanel();

    let audioInputSelectorWidget = new AudioInputSelectorWidget();

    authoringSidePanel.addWidget(audioInputSelectorWidget);

    labShell.add(authoringSidePanel, 'right');

    let statusIndicator = new StatusIndicator();

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:statusIndicator', {
      item: statusIndicator,
      align: "left",
      rank: -100
    });

    notebookTracker.currentChanged.connect(statusIndicator.onCurrentChanged, statusIndicator);

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let recordButton = new RecordButton({ notebookPanel });
      let stopButton = new StopButton({ notebookPanel });
      let playButton = new PlayButton({ notebookPanel });
      let pauseButton = new PauseButton({ notebookPanel });
      let saveButton = new SaveButton({ notebookPanel });
      let advanceButton = new AdvanceButton({ notebookPanel });

      let messageRecorder = new MessageRecorder({ app, notebookPanel, audioInputSelectorWidget });

      let messagePlayer = new MessagePlayer({ notebookPanel });

      audioInputSelectorWidget.deviceSelected.connect(messageRecorder.onDeviceSelected, messageRecorder);

      playButton.pressed.connect(messagePlayer.onPlayPressed, messagePlayer);
      stopButton.pressed.connect(messagePlayer.onStopPressed, messagePlayer);

      recordButton.pressed.connect(messageRecorder.onRecordPressed, messageRecorder);
      stopButton.pressed.connect(messageRecorder.onStopPressed, messageRecorder);
      saveButton.pressed.connect(messageRecorder.onSavePressed, messageRecorder);
      advanceButton.pressed.connect(messageRecorder.onAdvancePressed, messageRecorder);

      messageRecorder.recorderStarted.connect(messagePlayer.onRecorderStarted, messagePlayer);
      messageRecorder.recorderStopped.connect(messagePlayer.onRecorderStopped, messagePlayer);
      messagePlayer.playerStarted.connect(messageRecorder.onPlayerStarted, messageRecorder);
      messagePlayer.playerStopped.connect(messageRecorder.onPlayerStopped, messageRecorder);

      messageRecorder.recorderStarted.connect(statusIndicator.onRecorderStarted, statusIndicator);
      messageRecorder.recorderStopped.connect(statusIndicator.onStopped, statusIndicator);

      messagePlayer.playerStarted.connect(statusIndicator.onPlayerStarted, statusIndicator);
      messagePlayer.playerStopped.connect(statusIndicator.onStopped, statusIndicator);

      NotebookActions.executionScheduled.connect(messageRecorder.onExecutionScheduled, messageRecorder);
      NotebookActions.executed.connect(messageRecorder.onExecuted, messageRecorder);
    });
  }
}

export default extension;
