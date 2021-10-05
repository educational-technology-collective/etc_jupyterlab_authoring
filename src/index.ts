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

import { AuthoringRecorder, Listener } from './listener';

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

    statusBar.registerStatusItem("etc_jupyterlab_authoring:plugin:statusIndicator", {
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

      let authoringRecorder = new AuthoringRecorder({ notebookPanel, audioSelectorWidget });

      let listener = new Listener({ app, notebookPanel, authoringRecorder });

      audioSelectorWidget.deviceSelected.connect(authoringRecorder.onDeviceSelected, authoringRecorder);

      recordButton.pressed.connect(statusIndicator.record, statusIndicator);
      playButton.pressed.connect(statusIndicator.play, statusIndicator);
      stopButton.pressed.connect(statusIndicator.stop, statusIndicator);

      recordButton.pressed.connect(listener.onRecordPressed, listener);
      stopButton.pressed.connect(listener.onStopPressed, listener);
      playButton.pressed.connect(listener.onPlayPressed, listener);
      saveButton.pressed.connect(listener.onSavePressed, listener);
      advanceButton.pressed.connect(listener.onAdvancePressed, listener);

      stopButton.pressed.connect(recordButton.off, recordButton);
      saveButton.pressed.connect(recordButton.off, recordButton);
      playButton.pressed.connect(recordButton.off, recordButton);

      recordButton.pressed.connect(listener.onRecordPressed, listener);
      stopButton.pressed.connect(listener.onStopPressed, listener);
      playButton.pressed.connect(listener.onPlayPressed, listener);
      saveButton.pressed.connect(listener.onSavePressed, listener);
      advanceButton.pressed.connect(listener.onAdvancePressed, listener);

      NotebookActions.executionScheduled.connect(listener.onExecutionScheduled, listener);
      NotebookActions.executed.connect(listener.onExecuted, listener);

    });
  }
}

export default extension;
