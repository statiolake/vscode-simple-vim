import type { Action } from '../action_types';
import { getCustomBindings } from '../custom_bindings';
import { actions } from './actions';
import { motions } from './motions';
import { operators } from './operators';

export function buildActions(): Action[] {
    // Custom bindings are checked first to allow overriding default bindings
    return [...getCustomBindings(), ...actions, ...operators, ...motions];
}
