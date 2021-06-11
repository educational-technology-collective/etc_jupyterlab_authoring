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


/**
 * Initialization data for the etc-jupyterlab-authoring extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'etc-jupyterlab-authoring:plugin',
  autoStart: true,
  requires: [
    INotebookTracker
  ],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log('JupyterLab extension etc-jupyterlab-authoring is activated!');

    notebookTracker.widgetAdded.connect(async (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

      await notebookPanel.revealed;
      await notebookPanel.sessionContext.ready;

      let messageReceivedEvent = new MessageReceivedEvent({ notebookPanel });

      let cellsEvent = new CellsEvent({ app, notebookPanel });
      cellsEvent.cellAdded.connect((sender: CellsEvent, cell: Cell<ICellModel>) => {

        let editorEvent = new EditorEvent({ notebookPanel, cell });
        editorEvent.cursorChanged.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);

        let executionEvent = new ExecutionEvent({ app, notebookPanel, cell });
        executionEvent.executionStarted.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);
        executionEvent.executionFinished.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);

        let recordButton = new RecordButton({ notebookPanel });
        recordButton.buttonPressed.connect(messageReceivedEvent.receiveMessage, messageReceivedEvent);

      });

    });
  }
}

export default extension;
