import { Reducer } from "react";
import { ActionTypes, TodoActions } from "../actions/common";

export const selectedTagsReducer: Reducer<string[], TodoActions> = (state: string[], action: TodoActions): string[] => {
    switch (action.type) {
        case ActionTypes.SELECT_TAGS:
            state = [...action.payload];
            break;
        case ActionTypes.DELETE_TAG:
            state = [...state.filter(tagId => tagId !== action.payload)];
            break;
    }

    return state;
}