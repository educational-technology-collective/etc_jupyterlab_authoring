import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import {
  CellsEvent
} from "./events"

import { Signal } from "@lumino/signaling";
import { MessageAggregator, RecordButton, PlayButton, StatusIndicator, SaveButton } from "./authoring";
import { IStatusBar } from "@jupyterlab/statusbar";
import { CommandRegistry } from "@lumino/commands";

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

    // app.commands.commandExecuted.connect((sender: CommandRegistry, args: CommandRegistry.ICommandExecutedArgs) => {
    //   console.log(args);
    // });

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

    let statusIndicator = new StatusIndicator();

    statusBar.registerStatusItem("etc_jupyterlab_authoring:plugin:status", {
      item: statusIndicator,
      align: "left",
      rank: -100
    });

    let messageAggregator = new MessageAggregator({ app, notebookTracker });

    let saveButton = new SaveButton({ notebookTracker, messageAggregator });
    let playButton = new PlayButton({ notebookTracker, messageAggregator, statusIndicator });
    let recordButton = new RecordButton({ notebookTracker, messageAggregator, statusIndicator });
    recordButton.enabled.connect(playButton.off, playButton);
    playButton.enabled.connect(recordButton.off, recordButton);
    playButton.enabled.connect(messageAggregator.play, messageAggregator);
    saveButton.pressed.connect(recordButton.off, recordButton);
    saveButton.pressed.connect(playButton.off, playButton);

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let cellsEvent = new CellsEvent({ app, notebookPanel, messageAggregator, recordButton, playButton, saveButton });

    });
  }
}

export default extension;
