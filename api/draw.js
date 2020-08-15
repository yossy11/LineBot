module.exports = () => {
  const d3 = require("d3");
  const fs = require("fs");
  const { join } = require("path");
  const request = require("request");
  const fabric = require("fabric").fabric;
  const { JSDOM } = require("jsdom");
  const document = new JSDOM().window.document;
  const url =
    "https://www3.nhk.or.jp/news/special/coronavirus/data/latest-pref-data.json";
  const options = {
    url: url,
    method: "GET",
    json: true,
  };
  const width = 2000;
  const height = 2000;
  const scale = 3200;

  const createMap = (japan, data) => {
    const svg = d3
      .select(document.body)
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    const projection = d3
      .geoMercator()
      .center([136.0, 35.6])
      .translate([width / 2, height / 2])
      .scale(scale);
    const geoPath = d3.geoPath(projection);
    const maxValue = Math.max(...data.data47.map((d) => Number(d.new)));
    const minValue = Math.min(...data.data47.map((d) => Number(d.new)));
    const color = d3
      .scaleQuantize()
      .domain([minValue, maxValue])
      .range([
        "rgb(254,246,169)",
        "rgb(250,221,109)",
        "rgb(244,176,102)",
        "rgb(241,150,98)",
        "rgb(238,117,57)",
        "rgb(205,109,44)",
        "rgb(162,81,29)",
      ]);
    for (let i = 0; i < 47; i++) {
      const dataState = data.data47[i].name;
      const dataValue = parseFloat(data.data47[i].new);
      for (let j = 0; j < japan.features.length; j++) {
        const jsonState = japan.features[j].properties.name_local;
        if (dataState == jsonState) {
          japan.features[j].properties.value = dataValue;
          japan.features[j].properties.quantizedValue = color(dataValue);
          break;
        }
      }
    }
    const map = svg
      .selectAll("path")
      .data(japan.features)
      .enter()
      .append("path")
      .attr("d", geoPath)
      .style("stroke", "#ffffff")
      .style("stroke-width", 0.1)
      .style("fill", (d) => d.properties.quantizedValue);

    svg
      .selectAll("text")
      .data(japan.features)
      .enter()
      .append("text")
      .attr("x", function (d) {
        return projection([d.properties.longitude, d.properties.latitude])[0];
      })
      .attr("y", function (d) {
        return projection([d.properties.longitude, d.properties.latitude])[1];
      })
      .text(function (d) {
        return d.properties.value;
      })
      .style("font-family", "DejaVu Sans")
      .style("font-size", "10px")
      .style("fill", "red");

    // svg
    //   .append("text")
    //   .attr("x", 300)
    //   .attr("y", 300)
    //   .text(data.lastmodifed)
    //   .style("font-family", "sans-serif")
    //   .style("font-size", "100px")
    //   .style("fill", "red");
  };
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
      if (err) {
        console.error(err);
      }
      const japan = JSON.parse(
        fs.readFileSync(join(__dirname, "japan.geojson"), "utf8")
      );
      const infectionData = body;
      createMap(japan, infectionData);
      fabric.loadSVGFromString(document.body.innerHTML, (objects, options) => {
        const canvas = new fabric.Canvas("c", {
          width: width,
          height: height,
        });
        const svgGroups = fabric.util.groupSVGElements(objects, options);
        canvas.add(svgGroups).renderAll();
        const result = canvas.toDataURL("png");
        const base64Data = result.replace(/^data:image\/png;base64,/, "");
        resolve(base64Data);
      });
    });
  });
};
