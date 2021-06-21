export interface EventMessage {
    event: string;
    notebook_id: string;
    cell_id?: string;
    cell_index?: number,
    line?: number;
    input?: string;
    output?: string;
    timestamp: number;
    start_timestamp?: number;
    stop_timestamp?: number;
    duration?: number;
}