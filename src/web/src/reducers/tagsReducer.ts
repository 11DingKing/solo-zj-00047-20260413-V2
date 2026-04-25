import { Reducer } from "react";
import { ActionTypes, TodoActions } from "../actions/common";
import { Tag } from "../models"

export const tagsReducer: Reducer<Tag[], TodoActions> = (state: Tag[], action: TodoActions): Tag[] => {
    switch (action.type) {
        case ActionTypes.LOAD_TAGS:
            state = [...action.payload];
            break;
        case ActionTypes.SAVE_TAG:
            const existingIndex = state.findIndex(tag => tag.id === action.payload.id);
            if (existingIndex > -1) {
                const newState = [...state];
                newState.splice(existingIndex, 1, action.payload);
                state = newState;
            } else {
                state = [...state, action.payload];
            }
            break;
        case ActionTypes.DELETE_TAG:
            state = [...state.filter(tag => tag.id !== action.payload)]
            break;
    }

    return state;
}