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

import { AuthoringSidePanel, AdvanceButton, RecordButton, StopButton, PlayButton, PauseButton, SaveButton, StatusIndicator, AudioInputSelector, ExecutionCheckbox, ResetButton } from "./components";

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
    statusBar: IStatusBar
  ) => {
    console.log("JupyterLab extension etc_jupyterlab_authoring is activated!");

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    });

    let authoringSidePanel = new AuthoringSidePanel();

    let audioInputSelector = new AudioInputSelector();

    let executionCheckbox = new ExecutionCheckbox()

    authoringSidePanel.addWidget(audioInputSelector);

    authoringSidePanel.addWidget(executionCheckbox);

    labShell.add(authoringSidePanel, 'right');

    let statusIndicator = new StatusIndicator();

    statusBar.registerStatusItem('etc_jupyterlab_authoring:plugin:statusIndicator', {
      item: statusIndicator,
      align: "left",
      rank: -100
    });

    notebookTracker.currentChanged.connect(statusIndicator.onCurrentChanged, statusIndicator);
    //  There is one status indicator for all Notebooks; hence update the status indicator whenever the user changes Notebooks.

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      try {

        await notebookPanel.revealed;
        await notebookPanel.sessionContext.ready;

        let recordButton = new RecordButton({ notebookPanel });
        let stopButton = new StopButton({ notebookPanel });
        let playButton = new PlayButton({ notebookPanel });
        let pauseButton = new PauseButton({ notebookPanel });
        let resetButton = new ResetButton({ notebookPanel });
        let saveButton = new SaveButton({ notebookPanel });
        let advanceButton = new AdvanceButton({ notebookPanel });

        let messageRecorder = new MessageRecorder({ app, notebookPanel, audioInputSelector });

        let messagePlayer = new MessagePlayer({ notebookPanel });

        audioInputSelector.deviceSelected.connect(messageRecorder.onDeviceSelected, messageRecorder);

        executionCheckbox.changed.connect(messagePlayer.onExecutionCheckboxChanged, messagePlayer);

        playButton.pressed.connect(messagePlayer.onPlayPressed, messagePlayer);
        stopButton.pressed.connect(messagePlayer.onStopPressed, messagePlayer);
        resetButton.pressed.connect(messagePlayer.onResetPressed, messagePlayer);
        //  Connect the player to its controls.

        recordButton.pressed.connect(messageRecorder.onRecordPressed, messageRecorder);
        stopButton.pressed.connect(messageRecorder.onStopPressed, messageRecorder);
        saveButton.pressed.connect(messageRecorder.onSavePressed, messageRecorder);
        advanceButton.pressed.connect(messageRecorder.onAdvancePressed, messageRecorder);
        NotebookActions.executionScheduled.connect(messageRecorder.onExecutionScheduled, messageRecorder);
        NotebookActions.executed.connect(messageRecorder.onExecuted, messageRecorder);
        //  Connect the recorder to it's controls and Signals.

        messageRecorder.recorderStarted.connect(messagePlayer.onRecorderStarted, messagePlayer);
        messageRecorder.recorderStopped.connect(messagePlayer.onRecorderStopped, messagePlayer);
        messagePlayer.playerStarted.connect(messageRecorder.onPlayerStarted, messageRecorder);
        messagePlayer.playerStopped.connect(messageRecorder.onPlayerStopped, messageRecorder);
        //  The Recorder and the Player need to be informed of eachother's states;
        //  hence connect Signals in order to provide notification of state.

        messageRecorder.recorderStarted.connect(statusIndicator.onRecorderStarted, statusIndicator);
        messageRecorder.recorderStopped.connect(statusIndicator.onRecorderStopped, statusIndicator);
        messagePlayer.playerStarted.connect(statusIndicator.onPlayerStarted, statusIndicator);
        messagePlayer.playerStopped.connect(statusIndicator.onPlayerStopped, statusIndicator);
        //  Connect the player and the recorder to the status indicator.
      }
      catch (e) {

        console.error(e);
      }
    });
  }
}

export default extension;
