export interface CustomBindingCommand {
    command: string;
    args?: unknown;
}

export interface CustomBinding {
    keys: string[];
    modes?: string[];
    commands: CustomBindingCommand[];
}
