import { each } from '@lumino/algorithm';

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

import { Signal } from "@lumino/signaling";

import { AudioSelectorWidget, AuthoringSidePanel, AdvanceButton, RecordButton, StopButton, PlayButton, PauseButton, SaveButton, StatusIndicator } from "./components";

import { IStatusBar } from "@jupyterlab/statusbar";

import { MessageRecorder } from './message_recorder';
import { MessagePlayer } from './message_player';

/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc_jupyterlab_authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker,
    ILabShell,
    IStatusBar
  ],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    labShell: ILabShell,
    statusBar: IStatusBar,
  ) => {
    console.log("JupyterLab extension etc_jupyterlab_authoring is activated!");

    let authoringSidePanel = new AuthoringSidePanel();

    let audioSelectorWidget = new AudioSelectorWidget();

    labShell.add(authoringSidePanel, 'right');

    authoringSidePanel.addWidget(audioSelectorWidget);

    let statusIndicator = new StatusIndicator();

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:statusIndicator', {
      item: statusIndicator,
      align: "left",
      rank: -100
    });

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

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

      let messageRecorder = new MessageRecorder({ app, notebookPanel, audioSelectorWidget });

      let messagePlayer = new MessagePlayer({ notebookPanel });

      audioSelectorWidget.deviceSelected.connect(messageRecorder.onDeviceSelected);

      recordButton.pressed.connect(statusIndicator.record, statusIndicator);
      playButton.pressed.connect(statusIndicator.play, statusIndicator);
      stopButton.pressed.connect(statusIndicator.stop, statusIndicator);

      playButton.pressed.connect(messagePlayer.onPlayPressed, messagePlayer);


      recordButton.pressed.connect(messageRecorder.onRecordPressed, messageRecorder);
      stopButton.pressed.connect(messageRecorder.onStopPressed, messageRecorder);
      saveButton.pressed.connect(messageRecorder.onSavePressed, messageRecorder);
      advanceButton.pressed.connect(messageRecorder.onAdvancePressed, messageRecorder);

      NotebookActions.executionScheduled.connect(messageRecorder.onExecutionScheduled, messageRecorder);
      NotebookActions.executed.connect(messageRecorder.onExecuted, messageRecorder);
    });
  }
}

export default extension;
