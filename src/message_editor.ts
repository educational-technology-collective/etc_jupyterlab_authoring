import { MessagePlayer } from "./message_player";
import { MessageRecorder } from "./message_recorder";
import { EventMessage } from "./types";

import { Widget, Panel } from "@lumino/widgets";

export class MessageEditor {

    private _eventMessages: Array<EventMessage>;

    constructor() {

    }

    onEventMessagesChanged(sender: MessageRecorder | MessagePlayer, args: Array<EventMessage>) {

        this._eventMessages = args;
    }
}