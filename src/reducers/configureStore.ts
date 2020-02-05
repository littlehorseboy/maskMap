import {
  createStore,
  combineReducers,
  applyMiddleware,
  Middleware,
} from 'redux';
import logger from 'redux-logger';
import sceneObjectReducer from './sceneObject/sceneObject';

const rootReducer = combineReducers({
  sceneObjectReducer,
});

let middlewares: Middleware[] = [];

if (process.env.NODE_ENV === 'development') {
  middlewares = [
    ...middlewares,
    logger,
  ];
}

const store = createStore(
  rootReducer,
  applyMiddleware(...middlewares),
);

export default store;
