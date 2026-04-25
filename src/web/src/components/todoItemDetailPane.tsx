import { Text, DatePicker, Stack, TextField, PrimaryButton, DefaultButton, Dropdown, IDropdownOption, FontIcon, Checkbox, IconButton, IIconProps, MessageBar, MessageBarType, TagPicker, ITag } from '@fluentui/react';
import { useEffect, useState, FC, ReactElement, MouseEvent, FormEvent, useMemo } from 'react';
import { TodoItem, TodoItemState, SubTask, Tag, Priority } from '../models';
import { stackGaps, stackItemMargin, stackItemPadding, titleStackStyles } from '../ux/styles';

interface TodoItemDetailPaneProps {
    item?: TodoItem;
    tags?: Tag[];
    onEdit: (item: TodoItem) => void
    onCancel: () => void
    onCreateSubTask: (itemId: string, subTask: { name: string; completed?: boolean }) => void
    onUpdateSubTask: (itemId: string, subTaskId: string, subTask: { name?: string; completed?: boolean }) => void
    onDeleteSubTask: (itemId: string, subTaskId: string) => void
}

const deleteIconProps: IIconProps = { iconName: 'Delete' };
const addIconProps: IIconProps = { iconName: 'Add' };
const chevronDownProps: IIconProps = { iconName: 'ChevronDown' };
const chevronRightProps: IIconProps = { iconName: 'ChevronRight' };

export const TodoItemDetailPane: FC<TodoItemDetailPaneProps> = (props: TodoItemDetailPaneProps): ReactElement => {
    const [name, setName] = useState(props.item?.name || '');
    const [description, setDescription] = useState(props.item?.description);
    const [dueDate, setDueDate] = useState(props.item?.dueDate);
    const [state, setState] = useState(props.item?.state || TodoItemState.Todo);
    const [priority, setPriority] = useState<Priority | undefined>(props.item?.priority);
    const [tagIds, setTagIds] = useState<string[]>(props.item?.tagIds || []);
    const [isSubTasksExpanded, setIsSubTasksExpanded] = useState(false);
    const [newSubTaskName, setNewSubTaskName] = useState('');
    const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
    const [editingSubTaskName, setEditingSubTaskName] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const tagsMap = useMemo(() => {
        const map: Record<string, Tag> = {};
        (props.tags || []).forEach(tag => {
            if (tag.id) map[tag.id] = tag;
        });
        return map;
    }, [props.tags]);

    const allPickerTags = useMemo((): ITag[] => {
        return (props.tags || []).map(tag => ({
            key: tag.id || '',
            name: tag.name
        }));
    }, [props.tags]);

    const selectedPickerTags = useMemo((): ITag[] => {
        return tagIds
            .map(tagId => {
                const tag = tagsMap[tagId];
                return tag ? { key: tag.id || '', name: tag.name } : null;
            })
            .filter((t): t is ITag => t !== null);
    }, [tagIds, tagsMap]);

    useEffect(() => {
        setName(props.item?.name || '');
        setDescription(props.item?.description);
        setDueDate(props.item?.dueDate ? new Date(props.item?.dueDate) : undefined);
        setState(props.item?.state || TodoItemState.Todo);
        setPriority(props.item?.priority);
        setTagIds(props.item?.tagIds || []);
        setErrorMessage(null);
    }, [props.item]);

    const saveTodoItem = (evt: MouseEvent<HTMLButtonElement>) => {
        evt.preventDefault();

        if (!props.item?.id) {
            return;
        }

        const todoItem: TodoItem = {
            id: props.item.id,
            listId: props.item.listId,
            name: name,
            description: description,
            dueDate: dueDate,
            state: state,
            priority: priority,
            tagIds: tagIds,
        };

        props.onEdit(todoItem);
    };

    const cancelEdit = () => {
        props.onCancel();
    }

    const onStateChange = (_evt: FormEvent<HTMLDivElement>, value?: IDropdownOption) => {
        if (value) {
            setState(value.key as TodoItemState);
        }
    }

    const onPriorityChange = (_evt: FormEvent<HTMLDivElement>, value?: IDropdownOption) => {
        if (value) {
            setPriority(value.key as Priority);
        }
    }

    const onDueDateChange = (date: Date | null | undefined) => {
        setDueDate(date || undefined);
    }

    const onTagPickerChange = (_event: React.FormEvent<HTMLDivElement>, selectedItems?: ITag[]) => {
        const ids = (selectedItems || []).map(t => t.key as string);
        setTagIds(ids);
    }

    const toggleSubTasksExpanded = () => {
        setIsSubTasksExpanded(!isSubTasksExpanded);
    }

    const handleCreateSubTask = () => {
        if (!props.item?.id || !newSubTaskName.trim()) {
            return;
        }

        const subTasks = props.item.subTasks || [];
        if (subTasks.length >= 10) {
            setErrorMessage('Maximum 10 subtasks allowed per todo item');
            return;
        }

        props.onCreateSubTask(props.item.id, { name: newSubTaskName.trim() });
        setNewSubTaskName('');
        setErrorMessage(null);
    }

    const handleToggleSubTaskComplete = (subTaskId: string, completed: boolean) => {
        if (!props.item?.id) {
            return;
        }
        props.onUpdateSubTask(props.item.id, subTaskId, { completed: !completed });
    }

    const handleStartEditSubTask = (subTask: SubTask) => {
        setEditingSubTaskId(subTask.id);
        setEditingSubTaskName(subTask.name);
    }

    const handleSaveEditSubTask = () => {
        if (!props.item?.id || !editingSubTaskId || !editingSubTaskName.trim()) {
            setEditingSubTaskId(null);
            return;
        }
        props.onUpdateSubTask(props.item.id, editingSubTaskId, { name: editingSubTaskName.trim() });
        setEditingSubTaskId(null);
    }

    const handleCancelEditSubTask = () => {
        setEditingSubTaskId(null);
    }

    const handleDeleteSubTask = (subTaskId: string) => {
        if (!props.item?.id) {
            return;
        }
        props.onDeleteSubTask(props.item.id, subTaskId);
    }

    const todoStateOptions: IDropdownOption[] = [
        { key: TodoItemState.Todo, text: 'To Do' },
        { key: TodoItemState.InProgress, text: 'In Progress' },
        { key: TodoItemState.Done, text: 'Done' },
    ];

    const priorityOptions: IDropdownOption[] = [
        { key: Priority.High, text: 'High' },
        { key: Priority.Medium, text: 'Medium' },
        { key: Priority.Low, text: 'Low' },
    ];

    const subTasks = props.item?.subTasks || [];
    const hasSubTasks = subTasks.length > 0;

    return (
        <Stack>
            {props.item &&
                <>
                    <Stack.Item styles={titleStackStyles} tokens={stackItemPadding}>
                        <Text block variant="xLarge">{name}</Text>
                        <Text variant="small">{description}</Text>
                    </Stack.Item>
                    <Stack.Item tokens={stackItemMargin}>
                        <TextField label="Name" placeholder="Item name" required value={name} onChange={(_e, value) => setName(value || '')} />
                        <TextField label="Description" placeholder="Item description" multiline size={20} value={description || ''} onChange={(_e, value) => setDescription(value)} />
                        <Dropdown label="State" options={todoStateOptions} required selectedKey={state} onChange={onStateChange} />
                        <Dropdown label="Priority" options={priorityOptions} selectedKey={priority} onChange={onPriorityChange} placeholder="Select priority" />
                        <DatePicker label="Due Date" placeholder="Due date" value={dueDate} onSelectDate={onDueDateChange} />
                        <TagPicker
                            label="Tags"
                            onResolveSuggestions={() => allPickerTags}
                            selectedItems={selectedPickerTags}
                            onChange={onTagPickerChange}
                            placeholder="Select tags..."
                            inputProps={{ 'aria-label': 'Tag picker' }}
                        />
                    </Stack.Item>

                    <Stack.Item tokens={stackItemMargin}>
                        <Stack horizontal verticalAlign="center" styles={{ root: { cursor: 'pointer', padding: '8px 0' } }} onClick={toggleSubTasksExpanded}>
                            <FontIcon iconName={isSubTasksExpanded ? 'ChevronDown' : 'ChevronRight'} style={{ marginRight: 8 }} />
                            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                                Subtasks ({subTasks.length}/10)
                            </Text>
                        </Stack>

                        <div className={`subtasks-container ${isSubTasksExpanded ? 'expanded' : 'collapsed'}`}>
                            <Stack tokens={{ childrenGap: 8 }} style={{ padding: '8px 0' }}>
                                {errorMessage && (
                                    <MessageBar messageBarType={MessageBarType.error}>
                                        {errorMessage}
                                    </MessageBar>
                                )}

                                <Stack horizontal tokens={{ childrenGap: 8 }}>
                                    <TextField
                                        placeholder="Add a subtask..."
                                        value={newSubTaskName}
                                        onChange={(_e, value) => setNewSubTaskName(value || '')}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCreateSubTask();
                                            }
                                        }}
                                        styles={{ root: { flexGrow: 1 } }}
                                    />
                                    <IconButton
                                        iconProps={addIconProps}
                                        title="Add subtask"
                                        onClick={handleCreateSubTask}
                                        disabled={!newSubTaskName.trim() || subTasks.length >= 10}
                                    />
                                </Stack>

                                {hasSubTasks && subTasks.map((subTask) => (
                                    <Stack
                                        key={subTask.id}
                                        horizontal
                                        verticalAlign="center"
                                        tokens={{ childrenGap: 8 }}
                                        styles={{ root: { padding: '4px 8px', borderRadius: 4 } }}
                                        className="subtask-item"
                                    >
                                        <Checkbox
                                            checked={subTask.completed}
                                            onChange={() => handleToggleSubTaskComplete(subTask.id, subTask.completed)}
                                            styles={{ root: { flexShrink: 0 } }}
                                        />
                                        {editingSubTaskId === subTask.id ? (
                                            <Stack horizontal tokens={{ childrenGap: 4 }} styles={{ root: { flexGrow: 1 } }}>
                                                <TextField
                                                    value={editingSubTaskName}
                                                    onChange={(_e, value) => setEditingSubTaskName(value || '')}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSaveEditSubTask();
                                                        } else if (e.key === 'Escape') {
                                                            handleCancelEditSubTask();
                                                        }
                                                    }}
                                                    styles={{ root: { flexGrow: 1 } }}
                                                    autoFocus
                                                />
                                                <PrimaryButton text="Save" onClick={handleSaveEditSubTask} />
                                                <DefaultButton text="Cancel" onClick={handleCancelEditSubTask} />
                                            </Stack>
                                        ) : (
                                            <>
                                                <Text
                                                    variant="medium"
                                                    styles={{
                                                        root: {
                                                            flexGrow: 1,
                                                            textDecoration: subTask.completed ? 'line-through' : 'none',
                                                            color: subTask.completed ? '#666' : 'inherit'
                                                        }
                                                    }}
                                                    onDoubleClick={() => handleStartEditSubTask(subTask)}
                                                >
                                                    {subTask.name}
                                                </Text>
                                                <IconButton
                                                    iconProps={deleteIconProps}
                                                    title="Delete subtask"
                                                    onClick={() => handleDeleteSubTask(subTask.id)}
                                                    styles={{ root: { flexShrink: 0 } }}
                                                />
                                            </>
                                        )}
                                    </Stack>
                                ))}
                            </Stack>
                        </div>
                    </Stack.Item>

                    <Stack.Item tokens={stackItemMargin}>
                        <Stack horizontal tokens={stackGaps}>
                            <PrimaryButton text="Save" onClick={saveTodoItem} />
                            <DefaultButton text="Cancel" onClick={cancelEdit} />
                        </Stack>
                    </Stack.Item>
                </>
            }
            {!props.item &&
                <Stack.Item tokens={stackItemPadding} style={{ textAlign: "center" }} align="center">
                    <FontIcon iconName="WorkItem" style={{ fontSize: 24, padding: 20 }} />
                    <Text block>Select an item to edit</Text>
                </Stack.Item>}
        </Stack >
    );
}

export default TodoItemDetailPane;
