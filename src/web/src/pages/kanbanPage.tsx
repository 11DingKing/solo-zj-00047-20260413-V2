import { useEffect, useContext, useMemo, useState, useCallback } from 'react';
import { Stack, Text, getTheme, IStackStyles, IIconProps, FontIcon, Shimmer, ShimmerElementType, IconButton, IContextualMenuProps } from '@fluentui/react';
import { TodoItem, TodoItemState, TodoList, Tag, Priority } from '../models';
import * as itemActions from '../actions/itemActions';
import * as listActions from '../actions/listActions';
import * as tagActions from '../actions/tagActions';
import { TodoContext } from '../components/todoContext';
import { AppContext } from '../models/applicationState';
import { ItemActions } from '../actions/itemActions';
import { ListActions } from '../actions/listActions';
import { TagActions } from '../actions/tagActions';
import { stackPadding, titleStackStyles } from '../ux/styles';
import { useNavigate, useParams } from 'react-router-dom';
import { bindActionCreators } from '../actions/actionCreators';
import WithApplicationInsights from '../components/telemetryWithAppInsights.tsx';

const theme = getTheme();

const getPriorityOrder = (priority?: Priority): number => {
    if (priority === Priority.High) return 0;
    if (priority === Priority.Medium) return 1;
    if (priority === Priority.Low) return 2;
    return 3;
};

const isOverdue = (dueDate?: Date): boolean => {
    if (!dueDate) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(dueDate);
    return due < today;
};

const columnStyles: IStackStyles = {
    root: {
        minWidth: 300,
        backgroundColor: theme.palette.neutralLighterAlt,
        borderRadius: 8,
        padding: 12,
        marginRight: 16,
        height: '100%',
        overflowY: 'auto' as const
    }
};

const columnHeaderStyles: IStackStyles = {
    root: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `2px solid ${theme.palette.neutralLight}`
    }
};

const cardStyles = (isDragging: boolean, isOver: boolean): IStackStyles => ({
    root: {
        backgroundColor: isDragging ? theme.palette.neutralLight : theme.palette.white,
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
        boxShadow: theme.effects.elevation4,
        border: isOver ? `2px dashed ${theme.palette.themePrimary}` : '2px solid transparent',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s ease'
    }
});

const KanbanPage = () => {
    const navigate = useNavigate();
    const appContext = useContext<AppContext>(TodoContext);
    const { listId } = useParams();

    const actions = useMemo(() => ({
        lists: bindActionCreators(listActions, appContext.dispatch) as unknown as ListActions,
        items: bindActionCreators(itemActions, appContext.dispatch) as unknown as ItemActions,
        tags: bindActionCreators(tagActions, appContext.dispatch) as unknown as TagActions,
    }), [appContext.dispatch]);

    const [isReady, setIsReady] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<TodoItemState | null>(null);

    const tagsMap = useMemo(() => {
        const map: Record<string, Tag> = {};
        (appContext.state.tags || []).forEach(tag => {
            if (tag.id) map[tag.id] = tag;
        });
        return map;
    }, [appContext.state.tags]);

    const sortedItems = useMemo(() => {
        const items = (appContext.state.selectedList?.items || []).slice();
        return items.sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
    }, [appContext.state.selectedList?.items]);

    const todoItems = useMemo(() => sortedItems.filter(item => item.state === TodoItemState.Todo), [sortedItems]);
    const inProgressItems = useMemo(() => sortedItems.filter(item => item.state === TodoItemState.InProgress), [sortedItems]);
    const doneItems = useMemo(() => sortedItems.filter(item => item.state === TodoItemState.Done), [sortedItems]);

    useEffect(() => {
        actions.tags.list();
    }, [actions.tags]);

    useEffect(() => {
        if (appContext.state.lists?.length === 0) {
            actions.lists.save({ name: 'My List' });
        }
    }, [actions.lists, appContext.state.lists?.length]);

    useEffect(() => {
        if (appContext.state.lists?.length && !listId && !appContext.state.selectedList) {
            const defaultList = appContext.state.lists[0];
            navigate(`/kanban/${defaultList.id}`);
        }
    }, [appContext.state.lists, appContext.state.selectedList, listId, navigate]);

    useEffect(() => {
        if (listId && appContext.state.selectedList?.id !== listId) {
            actions.lists.load(listId);
        }
    }, [actions.lists, appContext.state.selectedList, listId]);

    useEffect(() => {
        if (appContext.state.selectedList?.id && !appContext.state.selectedList.items) {
            const loadListItems = async (listId: string) => {
                await actions.items.list(listId);
                setIsReady(true);
            };
            loadListItems(appContext.state.selectedList.id);
        }
    }, [actions.items, appContext.state.selectedList?.id, appContext.state.selectedList?.items]);

    const deleteList = () => {
        if (appContext.state.selectedList?.id) {
            actions.lists.remove(appContext.state.selectedList.id);
            navigate('/kanban');
        }
    };

    const iconProps: IIconProps = {
        iconName: 'More',
        styles: {
            root: {
                fontSize: 14
            }
        }
    };

    const menuProps: IContextualMenuProps = {
        items: [
            {
                key: 'delete',
                text: 'Delete List',
                iconProps: { iconName: 'Delete' },
                onClick: () => { deleteList(); }
            }
        ]
    };

    const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
        setDraggedItem(itemId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemId);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedItem(null);
        setDragOverColumn(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, column: TodoItemState) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(column);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverColumn(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetColumn: TodoItemState) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        
        if (!itemId || !appContext.state.selectedList?.id) {
            setDraggedItem(null);
            setDragOverColumn(null);
            return;
        }

        const items = [...(appContext.state.selectedList?.items || [])];
        const item = items.find(i => i.id === itemId);

        if (item && item.state !== targetColumn) {
            const updatedItem = { ...item, state: targetColumn };
            actions.items.save(appContext.state.selectedList.id, updatedItem);
        }

        setDraggedItem(null);
        setDragOverColumn(null);
    }, [appContext.state.selectedList, actions.items]);

    const handleItemClick = (item: TodoItem) => {
        actions.items.select(item);
        navigate(`/kanban/${item.listId}/items/${item.id}`);
    };

    const renderTagPill = (tagId: string) => {
        const tag = tagsMap[tagId];
        if (!tag) return null;
        return (
            <span
                key={tagId}
                style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    marginRight: 4,
                    marginTop: 2,
                    borderRadius: 10,
                    backgroundColor: tag.color,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 600
                }}
            >
                {tag.name}
            </span>
        );
    };

    const renderCard = (item: TodoItem, column: TodoItemState) => {
        const isHighPriority = item.priority === Priority.High;
        const itemOverdue = item.state !== TodoItemState.Done && item.dueDate && isOverdue(item.dueDate);
        const isDragging = draggedItem === item.id;
        const isOver = dragOverColumn === column && draggedItem === item.id;

        return (
            <Stack
                key={item.id}
                styles={cardStyles(isDragging, isOver)}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id || '')}
                onDragEnd={handleDragEnd}
                onClick={() => handleItemClick(item)}
            >
                <Stack horizontal>
                    {isHighPriority && (
                        <div style={{ width: 4, backgroundColor: '#d13438', borderRadius: 2, marginRight: 8 }} />
                    )}
                    <Stack.Item grow={1}>
                        <Text
                            variant="small"
                            block
                            styles={{
                                root: {
                                    color: itemOverdue ? '#d13438' : 'inherit',
                                    fontWeight: isHighPriority ? 600 : 400,
                                    marginBottom: 4
                                }
                            }}
                        >
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text variant="tiny" styles={{ root: { color: '#666', marginBottom: 6 } }}>
                                {item.description}
                            </Text>
                        )}
                        {(item.tagIds || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
                                {(item.tagIds || []).map(tagId => renderTagPill(tagId))}
                            </div>
                        )}
                        {item.dueDate && (
                            <Text
                                variant="tiny"
                                styles={{ root: { color: itemOverdue ? '#d13438' : '#666', marginTop: 6 } }}
                            >
                                <FontIcon iconName="Clock" style={{ marginRight: 4 }} />
                                {new Date(item.dueDate).toDateString()}
                            </Text>
                        )}
                    </Stack.Item>
                </Stack>
            </Stack>
        );
    };

    const renderColumn = (title: string, state: TodoItemState, items: TodoItem[]) => {
        const isOver = dragOverColumn === state;

        return (
            <Stack
                styles={{
                    ...columnStyles,
                    root: {
                        ...columnStyles.root,
                        backgroundColor: isOver ? theme.palette.themeLighterAlt : theme.palette.neutralLighterAlt
                    }
                }}
                onDragOver={(e) => handleDragOver(e, state)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, state)}
            >
                <Stack horizontal styles={columnHeaderStyles} verticalAlign="center">
                    <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
                        {title}
                    </Text>
                    <Text
                        variant="medium"
                        styles={{
                            root: {
                                marginLeft: 8,
                                backgroundColor: theme.palette.neutralQuaternary,
                                borderRadius: 10,
                                padding: '2px 8px',
                                fontSize: 12,
                                fontWeight: 600
                            }
                        }}
                    >
                        {items.length}
                    </Text>
                </Stack>
                {items.map(item => renderCard(item, state))}
            </Stack>
        );
    };

    return (
        <Stack styles={{ root: { height: '100%', padding: 16 } }}>
            <Stack.Item>
                <Stack horizontal styles={titleStackStyles} tokens={stackPadding}>
                    <Stack.Item grow={1}>
                        <Shimmer
                            width={300}
                            isDataLoaded={!!appContext.state.selectedList}
                            shimmerElements={[
                                { type: ShimmerElementType.line, height: 20 }
                            ]}
                        >
                            <>
                                <Text block variant="xLarge">
                                    <FontIcon iconName="Kanban" style={{ marginRight: 8 }} />
                                    {appContext.state.selectedList?.name || 'Loading...'}
                                </Text>
                                <Text variant="small">{appContext.state.selectedList?.description}</Text>
                            </>
                        </Shimmer>
                    </Stack.Item>
                    <Stack.Item>
                        <IconButton
                            disabled={!isReady}
                            menuProps={menuProps}
                            iconProps={iconProps}
                            styles={{ root: { fontSize: 16 } }}
                            title="List Actions"
                            ariaLabel="List Actions"
                        />
                    </Stack.Item>
                </Stack>
            </Stack.Item>
            <Stack.Item grow={1} styles={{ root: { marginTop: 16 } }}>
                <Stack horizontal styles={{ root: { height: '100%', overflowX: 'auto' as const, paddingBottom: 16 } }}>
                    {renderColumn('To Do', TodoItemState.Todo, todoItems)}
                    {renderColumn('In Progress', TodoItemState.InProgress, inProgressItems)}
                    {renderColumn('Done', TodoItemState.Done, doneItems)}
                </Stack>
            </Stack.Item>
        </Stack>
    );
};

const KanbanPageWithTelemetry = WithApplicationInsights(KanbanPage, 'KanbanPage');

export default KanbanPageWithTelemetry;