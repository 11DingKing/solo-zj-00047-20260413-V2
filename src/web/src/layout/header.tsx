import { FontIcon, getTheme, IconButton, IIconProps, IStackStyles, mergeStyles, Persona, PersonaSize, Stack, Text, Callout, Separator } from '@fluentui/react';
import { FC, ReactElement, useState, useContext, useEffect, useMemo } from 'react';
import { TodoContext } from '../components/todoContext';
import { AppContext, TodoItem, Priority } from '../models';
import * as reminderActions from '../actions/reminderActions';
import { bindActionCreators } from '../actions/actionCreators';

const theme = getTheme();

const logoStyles: IStackStyles = {
    root: {
        width: '300px',
        background: theme.palette.themePrimary,
        alignItems: 'center',
        padding: '0 20px'
    }
}

const logoIconClass = mergeStyles({
    fontSize: 20,
    paddingRight: 10
});

const toolStackClass: IStackStyles = {
    root: {
        alignItems: 'center',
        height: 48,
        paddingRight: 10
    }
}

const iconProps: IIconProps = {
    styles: {
        root: {
            fontSize: 16,
            color: theme.palette.white
        }
    }
}

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

const isTodayDue = (dueDate?: Date): boolean => {
    if (!dueDate) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const due = new Date(dueDate);
    return due >= today && due < tomorrow;
};

const Header: FC = (): ReactElement => {
    const appContext = useContext<AppContext>(TodoContext);
    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const [calloutTarget, setCalloutTarget] = useState<HTMLElement | null>(null);

    const actions = useMemo(() => ({
        reminders: bindActionCreators(reminderActions, appContext.dispatch),
    }), [appContext.dispatch]);

    useEffect(() => {
        actions.reminders.loadDueReminders();
        const interval = setInterval(() => {
            actions.reminders.loadDueReminders();
        }, 60000);
        return () => clearInterval(interval);
    }, [actions.reminders]);

    const reminders = appContext.state.dueReminders || [];
    const overdueItems = reminders.filter(item => isOverdue(item.dueDate)).sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
    const todayDueItems = reminders.filter(item => isTodayDue(item.dueDate)).sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
    const totalCount = overdueItems.length + todayDueItems.length;

    const onReminderButtonClick = (event: React.MouseEvent<HTMLElement>) => {
        setCalloutTarget(event.currentTarget);
        setIsCalloutVisible(!isCalloutVisible);
    };

    const onDismiss = () => {
        setIsCalloutVisible(false);
    };

    const renderReminderItem = (item: TodoItem, isOverdue: boolean) => {
        const isHighPriority = item.priority === Priority.High;
        return (
            <Stack key={item.id} horizontal verticalAlign="center" styles={{ root: { padding: '8px 12px', borderLeft: isHighPriority ? '4px solid #d13438' : '4px solid transparent' } }}>
                <Stack.Item grow={1}>
                    <Text variant="small" block styles={{ root: { color: isOverdue ? '#d13438' : 'inherit', fontWeight: isHighPriority ? 600 : 400 } }}>
                        {item.name}
                    </Text>
                    <Text variant="tiny" styles={{ root: { color: isOverdue ? '#d13438' : '#666' } }}>
                        {item.dueDate ? new Date(item.dueDate).toDateString() : ''}
                    </Text>
                </Stack.Item>
            </Stack>
        );
    };

    return (
        <Stack horizontal>
            <Stack horizontal styles={logoStyles}>
                <FontIcon aria-label="Check" iconName="SkypeCircleCheck" className={logoIconClass} />
                <Text variant="xLarge">ToDo</Text>
            </Stack>
            <Stack.Item grow={1}>
                <div></div>
            </Stack.Item>
            <Stack.Item>
                <Stack horizontal styles={toolStackClass} grow={1}>
                    <div style={{ position: 'relative' }}>
                        <IconButton
                            id="reminderButton"
                            aria-label="Reminders"
                            iconProps={{ iconName: "AlarmClock", ...iconProps }}
                            onClick={onReminderButtonClick}
                        />
                        {totalCount > 0 && (
                            <span style={{ position: 'absolute', top: -4, right: -4, background: '#d13438', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                {totalCount}
                            </span>
                        )}
                    </div>
                    <IconButton aria-label="Settings" iconProps={{ iconName: "Settings", ...iconProps }} />
                    <IconButton aria-label="Help" iconProps={{ iconName: "Help", ...iconProps }} />
                    <Persona size={PersonaSize.size24} text="Sample User" />
                </Stack>
            </Stack.Item>

            {isCalloutVisible && (
                <Callout
                    target={calloutTarget}
                    onDismiss={onDismiss}
                    role="dialog"
                    ariaLabelledBy="reminder-callout-title"
                    styles={{ root: { width: 320 } }}
                >
                    <Stack tokens={{ padding: 16 }}>
                        <Text variant="large" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>Reminders</Text>

                        {overdueItems.length > 0 && (
                            <>
                                <Text variant="medium" styles={{ root: { fontWeight: 600, color: '#d13438' } }}>Overdue ({overdueItems.length})</Text>
                                {overdueItems.map(item => renderReminderItem(item, true))}
                            </>
                        )}

                        {todayDueItems.length > 0 && (
                            <>
                                {overdueItems.length > 0 && <Separator styles={{ root: { margin: '8px 0' } }} />}
                                <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>Due Today ({todayDueItems.length})</Text>
                                {todayDueItems.map(item => renderReminderItem(item, false))}
                            </>
                        )}

                        {totalCount === 0 && (
                            <Text variant="small" styles={{ root: { color: '#666', textAlign: 'center', padding: '20px 0' } }}>
                                No pending reminders
                            </Text>
                        )}
                    </Stack>
                </Callout>
            )}
        </Stack>
    );
}

export default Header;