
$('td').on('click',function(){
    if ($(this).parent('tr').hasClass('selected')) {
        $('tr').removeClass('selected');
    } else {
        $('tr').removeClass('selected');
        $(this).parent('tr').addClass('selected');    
    }
})

const favorites = [
    "British Columbia",
    "California",
    "Washington",
    "Italy",
    "France",
    "Iran",
    "Spain",
    "Denmark",
]

favorites.forEach(favorite => {
    $('.region-or-country').each((i,e) => {
       if ($(e).text() == favorite) {
           $(e).parent('tr').addClass('favorite');
       } 
    }); 
})




const height = 600;
const width = 1280;
const margin = ({top: 20, right: 20, bottom: 30, left: 30})

data = DATA
data.dates = data.dates.map(d3.utcParse("%Y-%m-%d"))

console.log(data);

const line = d3.line()
    .defined(d => !isNaN(d))
    .x((d, i) => x(data.dates[i]))
    .y(d => y(d))

const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))

const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.select(".tick:last-of-type text").clone()
        .attr("x", 3)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(data.y))


x = d3.scaleUtc()
    .domain(d3.extent(data.dates))
    .range([margin.left, width - margin.right])


y = d3.scaleLinear()
    .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
    .range([height - margin.bottom, margin.top])



const chart = (() => {

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("overflow", "visible");

    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .selectAll("path")
        .data(data.series)
        .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", d => line(d.values));

    svg.call(hover, path);

    return svg.node();
})();

document.getElementById("chart").appendChild(chart)

function hover(svg, path) {

    if ("ontouchstart" in document) svg
        .style("-webkit-tap-highlight-color", "transparent")
        .on("touchmove", moved)
        .on("touchstart", entered)
        .on("touchend", left)
    else svg
        .on("mousemove", moved)
        .on("mouseenter", entered)
        .on("mouseleave", left);

    const dot = svg.append("g")
        .attr("display", "none");

    dot.append("circle")
        .attr("r", 2.5);

    dot.append("text")
        .style("font", "10px sans-serif")
        .attr("text-anchor", "middle")
        .attr("y", -8);

    function moved() {
        d3.event.preventDefault();
        const ym = y.invert(d3.event.layerY);
        const xm = x.invert(d3.event.layerX);
        const i1 = d3.bisectLeft(data.dates, xm, 1);
        const i0 = i1 - 1;
        const i = xm - data.dates[i0] > data.dates[i1] - xm ? i1 : i0;
        const s = data.series.reduce((a, b) => Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b);
        path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
        dot.attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`);
        dot.select("text").text(s.name);
    }

    function entered() {
        path.style("mix-blend-mode", null).attr("stroke", "#ddd");
        dot.attr("display", null);
    }

    function left() {
        path.style("mix-blend-mode", "multiply").attr("stroke", null);
        dot.attr("display", "none");
    }
}