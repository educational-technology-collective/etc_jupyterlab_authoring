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

import { AudioSelectorWidget, AuthoringSidePanel, AdvanceButton, RecordButton, StopButton, PlayButton, PauseButton, SaveButton } from "./components";

import { IStatusBar } from "@jupyterlab/statusbar";

import { Listener } from './listener';

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

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let recordButton = new RecordButton({ notebookPanel});
      let stopButton = new StopButton({ notebookPanel });
      let playButton = new PlayButton({ notebookPanel });
      let pauseButton = new PauseButton({ notebookPanel });
      let saveButton = new SaveButton({ notebookPanel });
      let advanceButton = new AdvanceButton({ notebookPanel });

      let listener = new Listener({
        app,
        notebookPanel
      });

      stopButton.pressed.connect(recordButton.off, stopButton);
      saveButton.pressed.connect(recordButton.off, saveButton);
      playButton.pressed.connect(recordButton.off, playButton);

      recordButton.pressed.connect(listener.onRecordPressed, recordButton);
      stopButton.pressed.connect(listener.onStopPressed, stopButton);
      playButton.pressed.connect(listener.onPlayPressed, playButton);
      saveButton.pressed.connect(listener.onSavePressed, saveButton);
      advanceButton.pressed.connect(listener.onAdvancePressed, advanceButton);

      NotebookActions.executionScheduled.connect(listener.onExecutionScheduled, notebookPanel);
      NotebookActions.executed.connect(listener.onExecuted, notebookPanel);
    });
  }
}

export default extension;
