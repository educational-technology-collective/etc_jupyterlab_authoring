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
import { RecordButton, StatusIndicator } from "./authoring";
import { IStatusBar } from "@jupyterlab/statusbar";
import { MessageAggregator } from "./authoring"

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

    let statusIndicator = new StatusIndicator();

    statusBar.registerStatusItem("etc_jupyterlab_authoring:plugin:status", {
      item: statusIndicator,
      align: "left",
      rank: 9999999
    });

    let messageAggregator = new MessageAggregator();


    let recordButton = new RecordButton({ notebookTracker, messageAggregator, statusIndicator });

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let cellsEvent = new CellsEvent({ app, notebookPanel, messageAggregator, recordButton });

    });
  }
}

export default extension;
