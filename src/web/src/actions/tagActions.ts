import { Dispatch } from "react";
import { Tag } from "../models";
import { TagService } from "../services/tagService";
import { ActionTypes } from "./common";
import config from "../config"
import { ActionMethod, createPayloadAction, PayloadAction } from "./actionCreators";

export interface TagActions {
    list(): Promise<Tag[]>
    save(tag: Tag): Promise<Tag>
    remove(tag: Tag): Promise<void>
    select(tagIds: string[]): Promise<string[]>
}

export const list = (): ActionMethod<Tag[]> => async (dispatch: Dispatch<LoadTagsAction>) => {
    const tagService = new TagService(config.api.baseUrl, '/tags');
    const tags = await tagService.getList();

    dispatch(loadTagsAction(tags));

    return tags;
}

export const save = (tag: Tag): ActionMethod<Tag> => async (dispatch: Dispatch<SaveTagAction>) => {
    const tagService = new TagService(config.api.baseUrl, '/tags');
    const newTag = await tagService.save(tag);

    dispatch(saveTagAction(newTag));

    return newTag;
}

export const remove = (tag: Tag): ActionMethod<void> => async (dispatch: Dispatch<DeleteTagAction>) => {
    const tagService = new TagService(config.api.baseUrl, '/tags');
    if (tag.id) {
        await tagService.delete(tag.id);
        dispatch(deleteTagAction(tag.id));
    }
}

export const select = (tagIds: string[]): ActionMethod<string[]> => async (dispatch: Dispatch<SelectTagsAction>) => {
    dispatch(selectTagsAction(tagIds));

    return tagIds;
}

export interface LoadTagsAction extends PayloadAction<string, Tag[]> {
    type: ActionTypes.LOAD_TAGS
}

export interface SaveTagAction extends PayloadAction<string, Tag> {
    type: ActionTypes.SAVE_TAG
}

export interface DeleteTagAction extends PayloadAction<string, string> {
    type: ActionTypes.DELETE_TAG
}

export interface SelectTagsAction extends PayloadAction<string, string[]> {
    type: ActionTypes.SELECT_TAGS
}

const loadTagsAction = createPayloadAction<LoadTagsAction>(ActionTypes.LOAD_TAGS);
const saveTagAction = createPayloadAction<SaveTagAction>(ActionTypes.SAVE_TAG);
const deleteTagAction = createPayloadAction<DeleteTagAction>(ActionTypes.DELETE_TAG);
const selectTagsAction = createPayloadAction<SelectTagsAction>(ActionTypes.SELECT_TAGS);