/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import 'regenerator-runtime/runtime';
import "./../style/visual.less";
import {
    select as d3Select
} from "d3-selection";
import powerbi from "powerbi-visuals-api";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import FilterAction = powerbi.FilterAction;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;


import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
import { VisualSettings } from "./settings";
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";




/** This specifices the 'shape' of the data in each row. */
interface IChartDataPoint {
    x: number,
    y: number,
    selectionId: ISelectionId
}



export class Visual implements IVisual {
    private target: HTMLElement;
    private updateCount: number;
    private settings: VisualSettings;
    private svg: Selection<SVGElement>;
    private container: Selection<SVGElement>;
    private textValue: Selection<SVGElement>;
    private textLabel: Selection<SVGElement>;
    private host: IVisualHost;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private xLabel: string;
    private yLabel: string;
    private selectionManager: ISelectionManager;

    private pointSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>;

    constructor(options: VisualConstructorOptions) {
        this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();

        // this.selectionManager.registerOnSelectCallback(() => {
        //     this.syncSelectionState(this.pointSelection, <ISelectionId[]>this.selectionManager.getSelectionIds());
        // });

        this.svg = d3.select(this.target)
            .append('svg')
            .classed('CustomLineChart', true);
        this.container = this.svg.append('g')
        this.textValue = this.container.append("text")
            .classed("textValue", true);
        this.textLabel = this.container.append("text")
            .classed("textLabel", true);


    }


    public update(options: VisualUpdateOptions) {
        let dataView: DataView = options.dataViews[0];
        let categorical = dataView.categorical
        let width: number = options.viewport.width;
        let height: number = options.viewport.height;

        // filter data (not working)
        let basicFilter = {
            target: {
                column: categorical.categories[0]
            },
            operator: "In",
            values: [2002, 2003, 2004, 2005, 2006]
        }
        this.host.applyJsonFilter(basicFilter, "general", "filter", FilterAction.remove)

        // set margins
        var margin = { top: 10, right: 30, bottom: 50, left: 80 };

        this.svg.attr("width", width);
        this.svg.attr("height", height);

        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        let axisStyle = this.settings.axis
        this.yLabel = dataView.metadata.columns[0].displayName
        this.xLabel = dataView.metadata.columns[1].displayName

        //remove old line chart
        this.container.selectAll('*').remove();

        //map data points
        let data: IChartDataPoint[] = categorical.categories[0].values.map(
            (xVals, idx) => {
                const selectionId: ISelectionId = this.host.createSelectionIdBuilder()
                .withCategory(categorical.categories[0], idx)
                .createSelectionId();
                return {
                    x: <number>xVals,
                    y: <number>categorical.values[0].values[idx],
                    selectionId: selectionId
                }
            }
            
        );

        //sort x-axis ascendingly
        data = data.slice().sort((a, b) => d3.ascending(a.x, b.x));


        var svg = this.container.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Add X axis
        var x = d3.scaleLinear()
            .domain(d3.extent(data, function (d) { return d.x; }))
            .range([0, width - margin.left - margin.right]);
        svg.append("g")
            .attr("transform", "translate(0," + (height - margin.top - margin.bottom) + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", this.settings.dataPoint.fontSize);

        if (axisStyle.showLabels) {
            svg.append("text")
                .attr("text-anchor", "end")
                .attr("x", width - margin.left - margin.right)
                .attr("y", height - margin.top)
                .style("font-size", axisStyle.fontSize)
                .style("fill", axisStyle.color)
                .text(this.xLabel);
        }
        // Add Y axis
        var y = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) { return +d.y; })])
            .range([height - margin.top - margin.bottom, 0]);
        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", this.settings.dataPoint.fontSize);

        if (axisStyle.showLabels) {
            svg.append("text")
                .attr("text-anchor", "end")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 20)
                .attr("x", -margin.top)
                .style("font-size", axisStyle.fontSize)
                .style("fill", axisStyle.color)
                .text(this.yLabel)
        }


        //Draw Line Chart
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", this.settings.dataPoint.lineColor)
            .attr("stroke-width", 1.5)
            .attr("d", d3.line<IChartDataPoint>()
                .x(function (d) { return x(d.x) })
                .y(function (d) { return y(d.y) })
            )
        svg.selectAll("myCircles")
            .data(data)
            .enter()
            .append("circle")
            .attr("fill", this.settings.dataPoint.pointColor)
            .attr("stroke", "none")
            .attr("cx", function (d) { return x(d.x) })
            .attr("cy", function (d) { return y(d.y) })
            .attr("r", this.settings.dataPoint.pointSize)
        //this.container.selectAll('path')
        this.tooltipServiceWrapper.addTooltip(svg.selectAll('circle'),
            (data: IChartDataPoint) => this.getTooltipData(data),
            (data: IChartDataPoint) => data.x)
        this.svg.on('contextmenu', (event, d) => {
            console.log("event:",event)
            console.log("target:",event.target)
            let dataPoint: any = d3Select(<d3.BaseType>event.target).datum();
            console.log(dataPoint)
            this.selectionManager.showContextMenu(dataPoint ? dataPoint.selectionId : {}, {
                x: event.x,
                y: event.y
            });
            event.preventDefault();
        });

    }

    private getTooltipData(datapoint: IChartDataPoint): VisualTooltipDataItem[] {
        return [{
            displayName: this.xLabel + ":\n"
                + this.yLabel + ": \n",
            header: 'Tooltip',
            color: this.settings.dataPoint.pointColor,
            value: datapoint.x.toString() + "\n" + datapoint.y.toString()
        }];
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    // private syncSelectionState(
    //     selection: Selection<IChartDataPoint>,
    //     selectionIds: ISelectionId[]
    // ): void {
    //     if (!selection || !selectionIds) {
    //         return;
    //     }

    //     if (!selectionIds.length) {
    //         const opacity: number = this.barChartSettings.generalView.opacity / 100;
    //         selection
    //             .style("fill-opacity", opacity)
    //             .style("stroke-opacity", opacity);
    //         return;
    //     }

    //     const self: this = this;

    //     selection.each(function (barDataPoint: BarChartDataPoint) {
    //         const isSelected: boolean = self.isSelectionIdInArray(selectionIds, barDataPoint.selectionId);

    //         const opacity: number = isSelected
    //             ? BarChart.Config.solidOpacity
    //             : BarChart.Config.transparentOpacity;

    //         d3Select(this)
    //             .style("fill-opacity", opacity)
    //             .style("stroke-opacity", opacity);
    //     });
    // }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}


