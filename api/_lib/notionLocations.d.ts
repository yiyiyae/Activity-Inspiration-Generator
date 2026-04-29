type WeatherType = "Sunny" | "Cloudy" | "Rainy";
type TimeType = "Morning" | "Afternoon" | "Evening";
type LocationItem = {
    id: string;
    title: string;
    tags: string[];
    suitableWeather: WeatherType[];
    suitableTime: TimeType[];
    p_mode: {
        image: string;
        hook_text: string;
        action_prompt: string;
    };
    j_mode: {
        timeline: string[];
        checklist: string[];
        warning: string;
    };
};
type GenericPage = {
    id: string;
    properties: Record<string, any>;
};
export declare function queryMappedLocations(): Promise<LocationItem[]>;
export declare function queryRawPages(): Promise<GenericPage[]>;
export {};
