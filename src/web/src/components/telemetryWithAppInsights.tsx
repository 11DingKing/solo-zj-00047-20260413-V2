import { ComponentType, ComponentClass } from 'react';
import { reactPlugin, getApplicationInsights, isApplicationInsightsEnabled } from '../services/telemetryService';
import { withAITracking } from '@microsoft/applicationinsights-react-js';


const withApplicationInsights = (component: ComponentType<unknown>, componentName: string): ComponentClass<ComponentType<unknown>, unknown> | ComponentType<unknown> => {
    getApplicationInsights();
    
    if (!isApplicationInsightsEnabled()) {
        return component;
    }
    
    return withAITracking<typeof component>(reactPlugin, component, componentName);
};
 
export default withApplicationInsights;
