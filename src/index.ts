import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

import {
  INotebookTracker,
  NotebookPanel
} from "@jupyterlab/notebook";

import {
  Cell,
  ICellModel
} from "@jupyterlab/cells";

import {
  CellsEvent,
  MessageReceivedEvent,
  RecordButton,
  ExecutionEvent,
  EditorEvent
} from "./events"

import { Signal } from "@lumino/signaling";


/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc_jupyterlab_authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker
  ],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('JupyterLab extension etc_jupyterlab_authoring is activated!');

    Signal.setExceptionHandler((error: Error) => {
      console.error(error);
    })

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let messageReceivedEvent = new MessageReceivedEvent({ notebookPanel });

      let recordButton = new RecordButton({ notebookPanel });

      let cellsEvent = new CellsEvent({ app, notebookPanel, messageReceivedEvent, recordButton });

    });
  }
}

export default extension;
