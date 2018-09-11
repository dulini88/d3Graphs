document.addEventListener("DOMContentLoaded", function(event) {
   generateData(onReceiveData);
});

function convertMultiKeyObjToObjArr(jasonData){
    
   var arr = [];

    for (var key in jasonData) {
        if (jasonData.hasOwnProperty(key)) {

            var dataObj = null;          

            if (jasonData[key] != null) 
            {
                dataObj = {
                date: new Date(key), //date
                value: +jasonData[key] //convert string to number
                }
            }

            arr.push(dataObj);
        }        
    } 
    
    return arr;     
}
function generateRandomNumber(min, max){
    return Math.floor(Math.random() * (max - min) + min);
}

//TODO: Remove below from the global scope
chartMarginInsideSVG = { top: 20, right: 20, bottom: 30, left: 50 };

function drawAxis(x, y, chartHeight){
    var svg = d3.select('svg');
        
    var g = svg.append("g")
                .attr("transform", "translate(" + chartMarginInsideSVG.left + "," + chartMarginInsideSVG.top + ")");

    g.append("g")
        .attr("transform", "translate(0," + chartHeight + ")")
        .attr("class", "gAxis")
        .call(d3.axisBottom(x))
        .append("text")
        .attr("y", 6)
        .attr("dy", "0.71em")
        /*.text("Date (D)");*/ //TODO: Position to be refined and displayed

    g.append("g")
        .attr("class", "gAxis")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("y", 6)
        .attr("dy", "0.71em")       
        .text("Price ($)");       
}

function drawChart(dataSet, x, y, chartLineStyle) {

    var dataObjArr = convertMultiKeyObjToObjArr(dataSet);

    var svg = d3.select('svg');
    var g = svg.append("g")
    .attr("transform", "translate(" + chartMarginInsideSVG.left + "," + chartMarginInsideSVG.top + ")");
        
    var line = d3.line()
                .defined(function(d) { return d; }) //used to ignore missing data points
                .x(function(d) { return x(d.date)})
                .y(function(d) { return y(d.value)});

    g.append("path")
                .attr("class", "chartLine")
                .datum(dataObjArr)
                .attr("stroke", chartLineStyle.color)    //Change line color here
                .attr("stroke-width", chartLineStyle.width)    //Change line width here
                .attr("stroke-dasharray", chartLineStyle.dashArr) //Change dash properties here
                .attr("d", line);
}

function drawMultilineChart(dataSet, axisDomains, chartLineStyles){
    var svg = d3.select('svg');

    var svgWidth = svg.node().getBoundingClientRect().width;
    var svgHeight = svg.node().getBoundingClientRect().height;
    var chartWidth = svgWidth - chartMarginInsideSVG.left - chartMarginInsideSVG.right; 
    var chartHeight = (svgHeight/2) - chartMarginInsideSVG.top - chartMarginInsideSVG.bottom;

    var x = d3.scaleTime()
                .domain([new Date((axisDomains["X"])[0]), new Date((axisDomains["X"])[1])])
                .range([0, chartWidth]);

    var y = d3.scaleLinear()
                .domain([(axisDomains["Y"])[0], (axisDomains["Y"])[1]])
                .range([chartHeight, 0]);

    drawAxis(x, y, chartHeight);

    for(var key in dataSet){
        drawChart(dataSet[key], x, y, chartLineStyles[key]);       
    }
}

var onReceiveData = function (jsonData){
    var receivedData = JSON.parse(jsonData);

    chartLineStyles = deriveChartLineStyles(receivedData["Bundle_Perf"]);

    drawMultilineChart(receivedData["Bundle_Perf"], receivedData["Axis_Domains"], chartLineStyles);

    visuallizeAutoOptOffPeriods(receivedData["Auto_Opt_Off_Periods"], receivedData["Axis_Domains"]);

    addLegend(chartLineStyles);
}

function deriveChartLineStyles(chartData){

    var numberOfLines = Object.keys(chartData).length;
    var numberOfBundles = (numberOfLines - 1) / 2;
    var numberOfColors = numberOfBundles + 1;
    var colorScale = d3.scaleOrdinal(d3["schemeCategory20"]); //Can use randomColor lib instead

    var chartLineStyles = {};
      
    for(var lineID = 1; lineID <= numberOfLines; lineID++){
        var lineColor, lineWidth, lineDashArr;
        if(lineID < numberOfLines){
            if( (lineID % 2) == 0 ){
                lineColor = colorScale((lineID/2) - 1);
                lineDashArr = 5.5;
            }
            else{
                lineColor = colorScale(((lineID + 1)/2) - 1);
                lineDashArr = 0.0;
            }
            lineWidth = 2;
        }
        else{
            lineColor = colorScale(numberOfColors - 1);
            lineDashArr = 0.0;
            lineWidth = 5;
        }

        chartLineStyles[Object.keys(chartData)[lineID-1]] = {
            color: lineColor,
            dashArr: lineDashArr,
            width: lineWidth
        }
    }

    return chartLineStyles;
}

function visuallizeAutoOptOffPeriods(autoOptOffPeriods, axisData)
{
    var dataset = [100]; //TODO: Check usage
    var svg = d3.select('svg');  
    var svgWidth = svg.node().getBoundingClientRect().width;
    var svgHeight = svg.node().getBoundingClientRect().height;
 
    // TODO:
    // Svg margins to be retrieved dynamically from svg itself.
    // It is assumed that the x-axis always depicts dates without the use of ranges.
    // To make the implementation of this function generic,
    // the used of axisData need to be fine-tuned to use any type of data
    // for x-axis     
    var timeDiff = Math.abs( (new Date((axisData["X"])[1])).getTime() - (new Date((axisData["X"])[0])).getTime() );
    var numberOfUnitsInXAxis = Math.ceil(timeDiff / (1000 * 3600 * 24));
    var dayWidth = (svgWidth - 20 - 50)/numberOfUnitsInXAxis;

    for (var key in autoOptOffPeriods){
        if( autoOptOffPeriods.hasOwnProperty(key) ){
            var timeUntilPeriodStarts = Math.abs( (new Date(key)).getTime() - (new Date((axisData["X"])[0])).getTime() );
            var numberOfDaysUntilPeriodStarts = Math.ceil(timeUntilPeriodStarts / (1000 * 3600 * 24));
            
            var barChart = svg.selectAll("rect")
            .data(dataset)
            .enter()
            .append("rect")
            .attr("y", function(d) {
                return 20   //TODO: Get dynamically from SVG top margin value
            })
            .attr("x", function(d) {
                return (36.5 + (dayWidth * numberOfDaysUntilPeriodStarts)) //TODO: Get hard coded value dynamically from SVG left margin value
            })
            .attr("height", ((svgHeight/2) - 20 - 30) ) //TODO: Get hard coded value dynamically from SVG top and bottom margin values. 400 - legend height
            .attr("width", (dayWidth * autoOptOffPeriods[key]))
            .attr("class", "bar")
            .attr("fill", "#DDDDDD");
        }
    }    
}  

function addLegend(chartLineStyles)
{
    //TODO: Remove hard coding of dimentions

    var svg = d3.select('svg');    
    var g = svg.append("g")
    .attr("transform", "translate(" + 10 + "," + 10 + ")"); 

    //TODO: Following to be added to css
    g.append("rect")
        .attr("class", "legendFrame")
        .attr('x', 40)
        .attr('y', 400)
        .attr('width', 330)
        .attr('height', 120)
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    var itemID = 1;
    var xCordinate = 0;
    var yCordinate = 400;
    for(var key in chartLineStyles){
        if(chartLineStyles.hasOwnProperty(key)){

            //TODO: Cordinate hard coding to be removed
            if(itemID % 2 == 0){
                xCordinate = 210;
            }
            else{
                xCordinate = 60;
                yCordinate += 20;
            }

            var yCordinate
            drawLegendItem(g, xCordinate, yCordinate, chartLineStyles[key], key); 

            itemID++;
        }
    }     
}

function drawLegendItem(g, x, y, chartLineStyle, chartName)
{
    //TODO: Reove hard coding of dimentions
    g.append('line')
        .attr('x1', x)
        .attr('y1', y)
        .attr('x2', x+50)
        .attr('y2', y)
        .attr('stroke', chartLineStyle.color)
        .attr('stroke-width', chartLineStyle.width)
        .attr('stroke-dasharray', chartLineStyle.dashArr);

    g.append('text')                                     
        .attr('x', x+70)             
        .attr('y', y+5)      
        .attr('font-size', '12px')       
        .text(chartName);                    
}

DATA_GENERATION_CONFIGS = {
    numberOfLines: 9,
    lineNames: {
        1: "Bundle_1_A",
        2: "Bundle_1_B",
        3: "Bundle_2_A",
        4: "Bundle_2_B",
        5: "Bundle_3_A",
        6: "Bundle_3_B",
        7: "Bundle_4_A",
        8: "Bundle_4_B",
        9: "Total"
    },
    dataRanges: {
        1: [8, 14],
        2: [8, 14],
        3: [15, 21],
        4: [15, 21],
        5: [24, 30],
        6: [24, 30],
        7: [32, 38],
        8: [32, 38],
        9: [80, 100]
    },
    dataPoints: {
        "Count": 10,
        "StartDate": "2018-01-01"
    },
    nullDataPlacementsInLines: {
        3: [1, 2],
        4: [1, 2],
        5: [5, 6],
        6: [5, 6],
        7: [9, 10],
        8: [9, 10]
    },
    autoOptOffPeriods: {
        "2018-01-06": 1
    }
};

function generateRandomNumber(min, max){
    return Math.floor(Math.random() * (max - min) + min);
}

function generateData(dataReceiveCallback)
{
    var generatedDataInJasonFmt = "";

    generatedDataInJasonFmt += '{ ';

    //----------------- Generate Axis Data - START -----------------
    //Derive end date for X-Axis
    var endDate  = new Date(DATA_GENERATION_CONFIGS.dataPoints["StartDate"]);
    endDate.setDate(endDate.getDate() + (DATA_GENERATION_CONFIGS.dataPoints["Count"]-1));

    //Derive min, max values for Y-Axis
    var minYValue = (DATA_GENERATION_CONFIGS.dataRanges[1])[0];
    var maxYValue = (DATA_GENERATION_CONFIGS.dataRanges[1])[1];
    for(var i = 1; i <= (Object.keys(DATA_GENERATION_CONFIGS.dataRanges)).length; i++){
        if( minYValue > (DATA_GENERATION_CONFIGS.dataRanges[i])[0] ){
            minYValue = (DATA_GENERATION_CONFIGS.dataRanges[i])[0];
        }

        if( maxYValue < (DATA_GENERATION_CONFIGS.dataRanges[i])[1] ){
            maxYValue = (DATA_GENERATION_CONFIGS.dataRanges[i])[1];
        }
    }

    generatedDataInJasonFmt += '\"Axis_Domains\": {\"X\": [\"';
    generatedDataInJasonFmt += DATA_GENERATION_CONFIGS.dataPoints["StartDate"];
    generatedDataInJasonFmt += '\", \"';
    generatedDataInJasonFmt += endDate.getFullYear() + '-' + (endDate.getMonth() + 1) + '-' + endDate.getDate() + '\"] ';
    generatedDataInJasonFmt += ', \"Y\": [' + minYValue + ' ,' + maxYValue + '] }, ';
    //----------------- Generate Axis Data - END ----------------

    //-------------- Generate Bundle Data - START ---------------
    generatedDataInJasonFmt += '\"Bundle_Perf\": ';

    for(var bundleID = 1; bundleID <= DATA_GENERATION_CONFIGS.numberOfLines; bundleID++){
        
        if( bundleID == 1 ){
            generatedDataInJasonFmt += '{ ';
        } 

        generatedDataInJasonFmt += '\"' + DATA_GENERATION_CONFIGS.lineNames[bundleID] + '\"' + ' : ';

        var dataPointDate = new Date(DATA_GENERATION_CONFIGS.dataPoints["StartDate"]);
        for(var dataPointID = 1; dataPointID <= DATA_GENERATION_CONFIGS.dataPoints["Count"]; dataPointID++){
            if( dataPointID > 1 ){
                dataPointDate.setDate(dataPointDate.getDate() + 1);
            }
            else{
                generatedDataInJasonFmt += '{';
            }
            
            var dataPointValue = 'null';

            if( ! ( (DATA_GENERATION_CONFIGS.nullDataPlacementsInLines.hasOwnProperty(bundleID) )  && 
                        ( dataPointID >= (DATA_GENERATION_CONFIGS.nullDataPlacementsInLines[bundleID])[0] ) && 
                        ( dataPointID <= (DATA_GENERATION_CONFIGS.nullDataPlacementsInLines[bundleID])[1] ) ) ) {
                dataPointValue = ( generateRandomNumber((DATA_GENERATION_CONFIGS.dataRanges[bundleID])[0],
                            (DATA_GENERATION_CONFIGS.dataRanges[bundleID])[1]) ).toString();   
            }            
            
            generatedDataInJasonFmt +=  '\"' + dataPointDate.getFullYear() + '-'
                                        + (dataPointDate.getMonth() + 1) + '-' + dataPointDate.getDate() + '\": ' + dataPointValue;
            
            if( dataPointID == DATA_GENERATION_CONFIGS.dataPoints["Count"] ){
                generatedDataInJasonFmt += '} ';
                if(bundleID < DATA_GENERATION_CONFIGS.numberOfLines){
                    generatedDataInJasonFmt += ', ';
                }
            }else{
                generatedDataInJasonFmt += ', ';
            }    
        }
        
        if( bundleID == DATA_GENERATION_CONFIGS.numberOfLines ){
            generatedDataInJasonFmt += '} ';
        }
    }    
    //--------------- Generate Bundle Data - END ---------------

    //------- Generate Auto optimization off data - START ------
    if ((Object.keys(DATA_GENERATION_CONFIGS.autoOptOffPeriods)).length > 0){
        generatedDataInJasonFmt += ' , \"Auto_Opt_Off_Periods\" : ';
        generatedDataInJasonFmt += JSON.stringify(DATA_GENERATION_CONFIGS.autoOptOffPeriods);        
    }    
    //------- Generate Auto optimization off data - END -------

    generatedDataInJasonFmt += ' }';

    dataReceiveCallback(generatedDataInJasonFmt);    
}

