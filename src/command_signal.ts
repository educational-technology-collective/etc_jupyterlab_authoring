import { CommandRegistry } from "@lumino/commands";
import { ISignal, Signal } from "@lumino/signaling";


export class CommandSignal extends Signal<CommandRegistry, any> implements ISignal<CommandRegistry, any> {

    constructor({ commandRegistry, id }: { commandRegistry: CommandRegistry, id: string }) {
      super(commandRegistry);
  
      commandRegistry.addCommand(id, {
        execute: (args:any) => this.emit(args)
      });
    }
  }
  