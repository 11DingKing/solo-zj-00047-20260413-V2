import { IIconProps, INavLink, INavLinkGroup, Nav, Stack, TextField, Pivot, PivotItem } from '@fluentui/react';
import { FC, ReactElement, useState, FormEvent, MouseEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { TodoList } from '../models/todoList';
import { stackItemPadding } from '../ux/styles';

interface TodoListMenuProps {
    selectedList?: TodoList
    lists?: TodoList[]
    onCreate: (list: TodoList) => void
}

const iconProps: IIconProps = {
    iconName: 'AddToShoppingList'
}

const TodoListMenu: FC<TodoListMenuProps> = (props: TodoListMenuProps): ReactElement => {
    const navigate = useNavigate();
    const location = useLocation();
    const [newListName, setNewListName] = useState('');
    const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');

    useEffect(() => {
        if (location.pathname.startsWith('/kanban')) {
            setCurrentView('kanban');
        } else {
            setCurrentView('list');
        }
    }, [location.pathname]);

    const getViewPrefix = () => {
        return currentView === 'kanban' ? '/kanban' : '/lists';
    };

    const onViewChange = (item?: PivotItem) => {
        if (!item || !props.selectedList?.id) return;
        
        const viewKey = item.props.itemKey;
        if (viewKey === 'kanban') {
            navigate(`/kanban/${props.selectedList.id}`);
        } else {
            navigate(`/lists/${props.selectedList.id}`);
        }
    };

    const onNavLinkClick = (evt?: MouseEvent<HTMLElement>, item?: INavLink) => {
        evt?.preventDefault();

        if (!item) {
            return;
        }

        navigate(`${getViewPrefix()}/${item.key}`);
    }

    const createNavGroups = (lists: TodoList[]): INavLinkGroup[] => {
        const links = lists.map(list => ({
            key: list.id,
            name: list.name,
            url: `${getViewPrefix()}/${list.id}`,
            links: [],
            isExpanded: props.selectedList ? list.id === props.selectedList.id : false
        }));

        return [{
            links: links
        }]
    }

    const onNewListNameChange = (_evt: FormEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) => {
        setNewListName(value || '');
    }

    const onFormSubmit = async (evt: FormEvent<HTMLFormElement>) => {
        evt.preventDefault();

        if (newListName) {
            const list: TodoList = {
                name: newListName
            };

            props.onCreate(list);
            setNewListName('');
        }
    }

    return (
        <Stack>
            <Stack.Item>
                <Pivot
                    selectedKey={currentView}
                    onLinkClick={onViewChange}
                    styles={{ root: { padding: '0 8px' } }}
                >
                    <PivotItem headerText="List" itemKey="list" headerButtonProps={{ 'data-content': 'list' }} />
                    <PivotItem headerText="Kanban" itemKey="kanban" headerButtonProps={{ 'data-content': 'kanban' }} />
                </Pivot>
            </Stack.Item>
            <Stack.Item>
                <Nav
                    selectedKey={props.selectedList?.id}
                    onLinkClick={onNavLinkClick}
                    groups={createNavGroups(props.lists || [])} />
            </Stack.Item>
            <Stack.Item tokens={stackItemPadding}>
                <form onSubmit={onFormSubmit}>
                    <TextField
                        borderless
                        iconProps={iconProps}
                        value={newListName}
                        disabled={props.selectedList == null}
                        placeholder="New List"
                        onChange={onNewListNameChange} />
                </form>
            </Stack.Item>
        </Stack>
    );
};

export default TodoListMenu;