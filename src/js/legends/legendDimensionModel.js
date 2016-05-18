/**
 * @fileoverview LegendDimensionModel is legend dimension model.
 * @author NHN Ent.
 *         FE Development Team <dl_javascript@nhnent.com>
 */

'use strict';

var chartConst = require('../const'),
    predicate = require('../helpers/predicate'),
    renderUtil = require('../helpers/renderUtil');

var LegendDimensionModel = tui.util.defineClass(/** @lends LegendDimensionModel.prototype */ {
    /**
     * LegendDimensionModel is legend dimension model.
     * @constructs LegendDimensionModel
     * @param {object} params parameters
     *      @param {string} params.chartType chart type
     *      @param {object} params.options legend options
     *      @param {object} params.theme legend theme
     *      @param {Array.<string | number>} params.legendLabels legend labels
     */
    init: function(params) {
        this.chartType = params.chartType;

        this.chartTypes = params.chartTypes || [this.chartType];

        this.options = params.options;

        this.theme = params.theme;

        this.legendLabels = params.legendLabels;

        this.legendCheckboxWidth = this.options.hasCheckbox === false ? 0 : chartConst.LEGEND_CHECKBOX_WIDTH;
    },

    /**
     * Make legend width.
     * @param {number} labelWidth label width
     * @returns {number} legend width
     * @private
     */
    _makeLegendWidth: function(labelWidth) {
        return labelWidth + this.legendCheckboxWidth + chartConst.LEGEND_RECT_WIDTH +
            chartConst.LEGEND_LABEL_LEFT_PADDING + chartConst.LEGEND_AREA_PADDING;
    },

    /**
     * Calculate sum of legends width.
     * @param {Array.<string>} labels legend labels
     * @param {{fontSize: number, fontFamily: number}} labelTheme legend label theme
     * @returns {number} sum of width
     * @private
     */
    _calculateLegendsWidthSum: function(labels, labelTheme) {
        var self = this;

        return tui.util.sum(tui.util.map(labels, function(label) {
            return self._makeLegendWidth(renderUtil.getRenderedLabelWidth(label, labelTheme));
        }));
    },

    /**
     * Divide legend labels.
     * @param {Array.<string>} labels legend labels
     * @param {number} count division count
     * @returns {Array.<Array.<string>>} divided labels
     * @private
     */
    _divideLegendLabels: function(labels, count) {
        var limitCount = Math.round(labels.length / count),
            results = [],
            temp = [];

        tui.util.forEachArray(labels, function(label) {
            if (temp.length < limitCount) {
                temp.push(label);
            } else {
                results.push(temp);
                temp = [label];
            }
        });

        if (temp.length) {
            results.push(temp);
        }

        return results;
    },

    /**
     * Get max line width.
     * @param {Array.<string>} dividedLabels divided labels
     * @param {{fontFamily: ?string, fontSize: ?string}} labelTheme label theme
     * @returns {number} max line width
     * @private
     */
    _getMaxLineWidth: function(dividedLabels, labelTheme) {
        var self = this,
            lineWidths = tui.util.map(dividedLabels, function(_labels) {
                return self._calculateLegendsWidthSum(_labels, labelTheme);
            });

        return tui.util.max(lineWidths);
    },

    /**
     * Make division labels and max line width.
     * @param {Array.<string>} labels legend labels
     * @param {number} chartWidth chart width
     * @param {{fontSize: number, fontFamily: number}} labelTheme legend label theme
     * @returns {{dividedLabels: Array.<Array.<string>>, maxLineWidth: number}} result
     * @private
     */
    _makeDividedLabelsAndMaxLineWidth: function(labels, chartWidth, labelTheme) {
        var divideCount = 1,
            maxLineWidth = 0,
            prevMaxWidth = 0,
            dividedLabels, prevLabels;

        do {
            dividedLabels = this._divideLegendLabels(labels, divideCount);
            maxLineWidth = this._getMaxLineWidth(dividedLabels, labelTheme);

            if (prevMaxWidth === maxLineWidth) {
                dividedLabels = prevLabels;
                break;
            }

            prevMaxWidth = maxLineWidth;
            prevLabels = dividedLabels;
            divideCount += 1;
        } while (maxLineWidth >= chartWidth);

        return {
            dividedLabels: dividedLabels,
            maxLineWidth: maxLineWidth
        };
    },

    /**
     * Calculate height of horizontal legend.
     * @param {Array.<Array.<string>>} dividedLabels divided labels
     * @param {{fontSize: number, fontFamily: number}} labelTheme legend label theme
     * @returns {number} legend height
     * @private
     */
    _calculateHorizontalLegendHeight: function(dividedLabels, labelTheme) {
        return tui.util.sum(tui.util.map(dividedLabels, function(labels) {
            return renderUtil.getRenderedLabelsMaxHeight(labels, labelTheme);
        }));
    },

    /**
     * Make dimension of horizontal legend.
     * @param {number} chartWidth chart width
     * @param {{fontSize: number, fontFamily: number}} labelTheme legend label theme
     * @returns {{width: number, height: (number)}} dimension of horizontal legend
     * @private
     */
    _makeHorizontalDimension: function(chartWidth) {
        var labelTheme = this.theme.label,
            labelsAndMaxWidth = this._makeDividedLabelsAndMaxLineWidth(this.legendLabels, chartWidth, labelTheme),
            horizontalLegendHeight = this._calculateHorizontalLegendHeight(labelsAndMaxWidth.dividedLabels, labelTheme),
            legendHeight = horizontalLegendHeight + (chartConst.LEGEND_AREA_PADDING * 2);

        return {
            width: labelsAndMaxWidth.maxLineWidth,
            height: legendHeight
        };
    },

    /**
     * Make dimension of vertical legend.
     * @param {{fontSize: number, fontFamily: number}} labelTheme legend label theme
     * @returns {{width: (number)}} dimension of vertical legend
     * @private
     */
    _makeVerticalDimension: function() {
        var maxLabelWidth = renderUtil.getRenderedLabelsMaxWidth(this.legendLabels, this.theme.label),
            legendWidth = this._makeLegendWidth(maxLabelWidth);
        return {
            width: legendWidth,
            height: 0
        };
    },

    /**
     * Whether skipped legend sizing or not.
     * @returns {boolean} result boolean
     * @private
     */
    _isSkipLegend: function() {
        var isPieTypeCharts = tui.util.all(this.chartTypes, predicate.isPieTypeChart);
        var isPieLegendAlign = predicate.isPieLegendAlign(this.options.align);

        return (isPieTypeCharts && isPieLegendAlign) || this.options.hidden;
    },

    /**
     * Make legend dimension.
     * @param {number} chartWidth chart width
     * @returns {{width: number, height: number}} legend dimention
     */
    makeDimension: function(chartWidth) {
        var dimension = {};

        if (this._isSkipLegend()) {
            dimension.width = 0;
        } else if (predicate.isHorizontalLegend(this.options.align)) {
            dimension = this._makeHorizontalDimension(chartWidth);
        } else {
            dimension = this._makeVerticalDimension();
        }

        return dimension;
    }
});

module.exports = LegendDimensionModel;
