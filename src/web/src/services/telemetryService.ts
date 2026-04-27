import { ReactPlugin } from "@microsoft/applicationinsights-react-js";
import { ApplicationInsights, Snippet, ITelemetryItem } from "@microsoft/applicationinsights-web";
import { DistributedTracingModes } from "@microsoft/applicationinsights-common";
import { createBrowserHistory } from 'history'
import config from "../config";

const plugin = new ReactPlugin();
let applicationInsights: ApplicationInsights;
export const reactPlugin = plugin;

export const getApplicationInsights = (): ApplicationInsights | null => {
    const browserHistory = createBrowserHistory({ window: window });
    if (applicationInsights) {
        return applicationInsights;
    }

    const ApplicationInsightsConfig: Snippet = {
        config: {
            connectionString: config.observability.connectionString,
            enableCorsCorrelation: true,
            distributedTracingMode: DistributedTracingModes.W3C, 
            extensions: [plugin],
            extensionConfig: {
                [plugin.identifier]: { history: browserHistory }
            }
        }
    }

    try {
        const ai = new ApplicationInsights(ApplicationInsightsConfig);
        ai.loadAppInsights();
        ai.addTelemetryInitializer((telemetry: ITelemetryItem) => {
            if (!telemetry) {
                return;
            }
            if (telemetry.tags) {
                telemetry.tags['ai.cloud.role'] = "webui";
            }
        });
        applicationInsights = ai;
    } catch(err) {
        console.error("ApplicationInsights setup failed, ensure environment variable 'VITE_APPLICATIONINSIGHTS_CONNECTION_STRING' has been set.", err);
        applicationInsights = null as unknown as ApplicationInsights;
    }

    return applicationInsights;
}

export const trackEvent = (eventName: string, properties?: { [key: string]: unknown }): void => {
    if (!applicationInsights) {
        return;
    }

    applicationInsights.trackEvent({
        name: eventName,
        properties: properties
    });
}
