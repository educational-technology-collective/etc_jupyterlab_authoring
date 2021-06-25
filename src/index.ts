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
import { MessageAggregator, RecordButton, PlayButton, StatusIndicator, SaveButton, StopButton, MessagePlayer } from "./authoring";
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


    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let messageAggregator = new MessageAggregator({ app });

      let recordButton = new RecordButton({ notebookPanel, messageAggregator, statusIndicator });
      let saveButton = new SaveButton({ notebookPanel, messageAggregator });
      let playButton = new PlayButton({ notebookPanel, messageAggregator, statusIndicator });
      let stopButton = new StopButton({ notebookPanel, messageAggregator, statusIndicator });

      recordButton.enabled.connect(playButton.off, playButton);
      playButton.enabled.connect(recordButton.off, recordButton);
      saveButton.pressed.connect(recordButton.off, recordButton);
      saveButton.pressed.connect(playButton.off, playButton);
      stopButton.pressed.connect(recordButton.off, recordButton);
      stopButton.pressed.connect(playButton.off, playButton);
    
      notebookPanel.toolbar.insertItem(10, "etc_jupyterlab_authoring:record", recordButton);
      notebookPanel.toolbar.insertAfter("etc_jupyterlab_authoring:record", "etc_jupyterlab_authoring:play", playButton);
      notebookPanel.toolbar.insertAfter("etc_jupyterlab_authoring:play", "etc_jupyterlab_authoring:stop", stopButton);
      notebookPanel.toolbar.insertAfter("etc_jupyterlab_authoring:stop", "etc_jupyterlab_authoring:save", saveButton);

      if (notebookPanel.content.model.metadata.has("etc_jupyterlab_authoring")) {
        console.log('has("etc_jupyterlab_authoring")');
        let messagePlayer = new MessagePlayer({ notebookPanel });
        playButton.enabled.connect(messagePlayer.playMessage, messagePlayer);
      }

      let cellsEvent = new CellsEvent({ app, notebookPanel, messageAggregator, recordButton, playButton, saveButton });

    });
  }
}

export default extension;
