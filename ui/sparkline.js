"use strict";

var d3 = require('d3');

function svg_point_caption(selector, value) {
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
        .attr('font-size', '7px')
        .text(text);

    return point;
}

exports.sparkline = function (height, samples) {
    if (samples.length === 0) {
        return {
            curve: function () { return; },
            bars: function () { return; }
        };
    }

    var mwidth = height / 5,
        width = height * 6;

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

    function new_topelement(selector) {
        return selector
            .append("span")
            .attr('class', 'sparkline')
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

    function add_maxpoint(top, xscale, yscale, samples) {
        var mp = maxpoint(samples),
            maxpoint_shape = svg_point_caption(top, mp[1]);

        maxpoint_shape.attr(
            'transform',
            'translate(' + xscale(mp[0]) + ", " + yscale(mp[1]) + ')'
        );
    }

    return {
        //!
        //! Append a sparkline showing the evolution as a curve
        //!
        curve: function (selector) {
            var available_width = width,
                top = new_topelement(selector),
                chart = top.append('g'),
                endpoint_shape = svg_point_caption(top, samples[samples.length - 1]),
                line,
                xscale,
                yscale;

            available_width -= endpoint_shape.node().getBBox().width;

            yscale = new_yscale(d3.scale.linear()).range([height, 0]);
            xscale = new_xscale(d3.scale.linear()).range(
                [mwidth, available_width - mwidth]
            );

            /*jslint unparam: true*/
            line = d3.svg.line()
                .x(function (d, i) { return xscale(i); })
                .y(function (d) { return yscale(d); });
            /*jslint unparam: false*/

            chart.attr('fill', 'none');

            chart
                .append('line')
                .attr('x1', xscale.range()[0])
                .attr('x2', xscale.range()[1])
                .attr('y1', yscale(0.0))
                .attr('y2', yscale(0.0))
                .attr('stroke-dasharray', '1 3')
                .attr("stroke", "#c8c8c3");

            chart
                .append('path')
                .attr("d", line(samples))
                .attr("stroke", "#c8c8c3");

            // position endpoint item

            position_endpoint(endpoint_shape, xscale, yscale, samples);
            add_maxpoint(top, xscale, yscale, samples);
        },
        bars: function (selector) {
            var top = new_topelement(selector),
                available_width = width,
                chart = top.append('g'),
                endpoint_shape = svg_point_caption(top, samples[samples.length - 1]),
                xscale,
                yscale;

            available_width -= endpoint_shape.node().getBBox().width;

            xscale = d3.scale.linear()
                .domain([0, samples.length])
                .range([mwidth, available_width - mwidth]);

            yscale = new_yscale(d3.scale.linear())
                .range([height - 7, 7]);

            function bar(d, i) {
                var bt = d3.extent([0, d].map(function (e) { return yscale(e); })),
                    lr = [xscale(i), xscale(i + 1)];

                return {
                    x: lr[0],
                    y: bt[0],
                    height: bt[1] - bt[0],
                    width: lr[1] - lr[0],
                    class: d < 0 ? 'red' : 'black'
                };
            }

            function barx(d, i) {
                return bar(d, i).x;
            }

            function bary(d, i) {
                return bar(d, i).y;
            }

            function barw(d, i) {
                return bar(d, i).width;
            }

            function barh(d, i) {
                return bar(d, i).height;
            }

            function barc(d, i) {
                return bar(d, i).class;
            }

            chart
                .selectAll('rect')
                .data(samples)
                .enter()
                .append('rect')
                 .attr('x', barx)
                 .attr('y', bary)
                 .attr('width', barw)
                 .attr('height', barh)
                 .attr('class', barc);

            position_endpoint(endpoint_shape, xscale, yscale, samples);
            add_maxpoint(top, xscale, yscale, samples);
        }
    };
};
