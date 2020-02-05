export const ADDSCENEOBJECT = 'ADDSCENEOBJECT';
export const REMOVEALLSCENEOBJECT = 'REMOVEALLSCENEOBJECT';

interface AddSceneObjectActionI {
  type: typeof ADDSCENEOBJECT;
  payload: {
  };
}

export const addSceneObject = (): AddSceneObjectActionI => ({
  type: ADDSCENEOBJECT,
  payload: {
  },
});

interface RemoveAllSceneObjectActionI {
  type: typeof REMOVEALLSCENEOBJECT;
  payload: {
  };
}

export const removeAllSceneObject = (): RemoveAllSceneObjectActionI => ({
  type: REMOVEALLSCENEOBJECT,
  payload: {
  },
});

export type sceneObjectActionTypes = AddSceneObjectActionI | RemoveAllSceneObjectActionI;
