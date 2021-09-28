import { each } from '@lumino/algorithm';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import { Signal } from "@lumino/signaling";
import { AdvanceButton, RecordButton, StopButton, PlayButton, PauseButton, SaveButton } from "./controls";

import { IStatusBar } from "@jupyterlab/statusbar";
import { Listener } from './listener';
import { MessageAggregator, MessagePlayer } from './authoring';

/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc_jupyterlab_authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker,
    IStatusBar
  ],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    statusBar: IStatusBar,
  ) => {
    console.log("JupyterLab extension etc_jupyterlab_authoring is activated!");

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let cellTypeIndex: number = 0;

      each(notebookPanel.toolbar.names(), (name: string, index: number) => {

        if (name == 'cellType') {
          cellTypeIndex = index;
        }
      });

      let recordButton = new RecordButton({ notebookPanel, cellTypeIndex });
      let stopButton = new StopButton({ notebookPanel, cellTypeIndex });
      let playButton = new PlayButton({ notebookPanel, cellTypeIndex });
      let pauseButton = new PauseButton({ notebookPanel, cellTypeIndex });
      let saveButton = new SaveButton({ notebookPanel, cellTypeIndex });
      let advanceButton = new AdvanceButton({ notebookPanel });

      let listener = new Listener({
        app,
        notebookPanel,
        advanceButton,
        recordButton,
        stopButton,
        playButton,
        pauseButton,
        saveButton
      });
    });
  }
}

export default extension;
