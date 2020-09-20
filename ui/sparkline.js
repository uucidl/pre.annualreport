"use strict";

/*jslint browser: true*/

var d3 = require('d3');

function svg_point_caption(selector, font_size, value) {
    var g_class = value < 0 ? 'red' : 'black',
        offset_x = 3,
        text = (value > 0 ? '+' : '') + value,
        point = selector.append('g').attr('class', g_class);

    point
        .append('circle')
        .attr('r', 2);

    point
        .append('text')
        .attr('text-anchor', 'left')
        .attr('x', offset_x)
        .attr('font-size', font_size + 'px')
        .attr('fill', "#c8c8c3")
        .text(text);

    return point;
}

exports.sparkline = function (selector, samples) {
    if (samples.length === 0) {
        return {
            curve: function () { return; },
            bars: function () { return; }
        };
    }

    if (selector.empty()) {
        throw 'cannot work on an empty selection';
    }

    function parse_size(size_px) {
        var match = /([0-9]+)px/.exec(size_px);
        return match ? match[1] : 0;
    }

    function container_height() {
        // this takes the value from the font-size property
        var cs = window.getComputedStyle(selector.node()),
            font_size = parse_size(cs.getPropertyValue('font-size'));

        return font_size;
    }

    var height = container_height(),
        mwidth = height / 5,
        width = height * 4;

    if (height <= 0) {
        throw 'could not compute ideal height';
    }

    function maxpoint(samples) {
        var max_value = d3.max(samples, function (d) { return Math.abs(d); }),
            max_i = 0,
            i;
        for (i = 0; i < samples.length; i += 1) {
            if (Math.abs(samples[i]) === max_value) {
                max_i = i;
                break;
            }
        }

        return [max_i, samples[max_i]];
    }

    function new_topelement(container) {
        return container
            .append('svg')
            .attr('width',  width)
            .attr('height', height)
            .append('g');
    }

    function new_yscale(d3scale) {
        var zero_extended = d3.extent(samples, function (d) { return d; });
        zero_extended.push(0);

        return d3scale
            .domain(d3.extent(zero_extended));
    }

    /*jslint unparam: true*/
    function new_xscale(d3scale) {
        return d3scale
            .domain(d3.extent(samples, function (d, i) {
                return i;
            }));
    }
    /*jslint unparam: false*/

    function position_endpoint(endpoint, xscale, yscale, samples) {
        var y = yscale(samples[samples.length - 1]),
            x = xscale.range()[1];

        endpoint.attr('transform', 'translate(' + x + ', ' + y + ')');
    }

    function position_maxpoint(maxpoint_shape, xscale, yscale, samples) {
        var mp = maxpoint(samples);

        maxpoint_shape.attr(
            'transform',
            'translate(' + xscale(mp[0]) + ", " + yscale(mp[1]) + ')'
        );
    }

    return {
        //!
        //! Append a sparkline showing the evolution as a curve
        //!
        curve: function (must_draw_zero) {
            var available_width = width,
                y_offset = 0,
                container = selector.append("span").attr('class', 'sparkline'),
                top = new_topelement(container),
                chart = top.append('g'),
                last_xy = [samples.length - 1, samples[samples.length - 1]],
                endpoint_shape = svg_point_caption(top, height / 2.0, last_xy[1]),
                maxpoint_xy = maxpoint(samples),
                maxpoint_shape = maxpoint_xy[1] !== last_xy[1] ? svg_point_caption(top, height / 2.0, maxpoint_xy[1]) : undefined,
                line,
                xscale,
                yscale;

            available_width -= endpoint_shape.node().getBBox().width;
            if (maxpoint_shape) {
                y_offset += maxpoint_shape.node().getBBox().height;
            }

            yscale = new_yscale(d3.scaleLinear()).range([height, y_offset]);
            xscale = new_xscale(d3.scaleLinear()).range(
                [mwidth, available_width - mwidth]
            );

            /*jslint unparam: true*/
            line = d3.line()
                .curve(d3.curveBasis)
                .x(function (d, i) { return xscale(i); })
                .y(function (d) { return yscale(d); });
            /*jslint unparam: false*/

            chart.attr('fill', 'none');

            if (must_draw_zero) {
                chart
                    .append('line')
                    .attr('x1', xscale.range()[0])
                    .attr('x2', xscale.range()[1])
                    .attr('y1', yscale(0.0))
                    .attr('y2', yscale(0.0))
                    .attr('stroke-dasharray', '1 3')
                    .attr("stroke", "#c8c8c3");
            }

            chart
                .append('path')
                .attr("d", line(samples))
                .attr("stroke", "#c8c8c3");

            // position endpoint item

            position_endpoint(endpoint_shape, xscale, yscale, samples);
            if (maxpoint_shape) {
                position_maxpoint(maxpoint_shape, xscale, yscale, samples);
            }

            return container;
        }
    };
};
