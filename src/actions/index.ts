import type { Action } from '../action_types';
import { actions as subActions } from './actions';
import { motions } from './motions';
import { operators } from './operators';

export const actions: Action[] = subActions.concat(operators, motions);
