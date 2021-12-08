import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
export declare class VisualSettings extends DataViewObjectsParser {
    dataPoint: dataPointSettings;
    axis: axisSettings;
}
export declare class dataPointSettings {
    lineColor: string;
    fontSize: number;
    pointColor: string;
    pointSize: number;
}
export declare class axisSettings {
    showLabels: boolean;
    fontSize: number;
    color: string;
}
