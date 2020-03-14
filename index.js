const port = process.env.PORT || 3001;
var express = require('express');
var exphbs  = require('express-handlebars');
var lodash = require('lodash'); 

var app = express();

const DATA_CACHE = {};

var hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: {
        if_eq: function(arg1, arg2, options) {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        },
        unless_eq: function(arg1, arg2, options) {
            return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        },
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.use(express.static('public'));

app.get('/ping', function (req, res) {
    res.send("OK")
});


app.get('/', async function (req, res) {

    const csv = require('async-csv');
    const fs = require('fs').promises;
    const d3 = require("d3")

    const confirmed_data = await getTimeSeriesData('confirmed');
    const deaths_data = await getTimeSeriesData('deaths');
    let confirmed = await csv.parse(confirmed_data);
    let deaths = await csv.parse(deaths_data);

    confirmed_by_country = groupByCountry(confirmed);
    deaths_by_country = groupByCountry(deaths);
 

    const multiline_chart_data = {
        y: "Country",
        series: confirmed_by_country.slice(1).map((row) => ({
            name: row[0],
            values: row.slice(1),
        })),
        dates: confirmed_by_country[0].slice(1),
    };

    confirmed_header = confirmed.slice(0,1);
    confirmed = confirmed_header.concat(lodash.sortBy(confirmed.slice(1), [row => row[1], row => row[0]]));
    // Remove Lat & Lon
    confirmed.forEach(row => {
        row.splice(2,2)
    })
    // Reverse the dates
    confirmed = confirmed.map(row => {
        return row.slice(0,2).concat(row.slice(2).reverse());
    })
    
    confirmed_by_country = lodash.orderBy(confirmed_by_country, [row => row[row.length-1]], ['desc']);
    deaths_by_country = lodash.orderBy(deaths_by_country, [row => row[row.length-1]], ['desc']);

    // Reverse the dates
    confirmed_by_country = confirmed_by_country.map(row => {
        return row.slice(0,1).concat(row.slice(1).reverse());
    })
    deaths_by_country = deaths_by_country.map(row => {
        return row.slice(0,1).concat(row.slice(1).reverse());
    })

    // Format the numbers
    confirmed_by_country = formatNumbers(confirmed_by_country);
    deaths_by_country = formatNumbers(deaths_by_country);

    res.render('home',{
        data_json_string: JSON.stringify(multiline_chart_data),
        confirmed,
        confirmed_by_country,
        deaths_by_country,
    });

});

function formatNumbers(data) {
    return data.map(row => {
        return row.map(cell => {
            if (!isNaN(cell)) {
                const nf = new Intl.NumberFormat();
                return nf.format(cell);
            } else {
                return cell;
            }   
        });
    })
}

function groupByCountry(data) {
    const offset = 4;
    const new_table = {};
    data.forEach((row,i) => {
        if (i > 0) {
            row.forEach((cell,j) => {
                if (j >= offset) {
                    if (!new_table[row[1]]) {
                        new_table[row[1]] = [];
                    }
                    if (!new_table[row[1]][j-offset]) {
                        new_table[row[1]][j-offset] = 0;
                    }
                    new_table[row[1]][j-offset] += parseInt(cell) || 0;
                }
            });
        } else {
            // header (list of dates)
            const header_key = 'header';
            new_table[header_key] = []
            row.forEach((cell,j) => {
                if (j >= offset) {
                    let date = new Date(cell);
                    const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date)
                    const mo = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(date)
                    const da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date)
                    date = `${ye}-${mo}-${da}`;
                    new_table[header_key][j-offset] = date;
                }
            });

        }
    });
    const final = [];
    Object.keys(new_table).forEach(country_key => {
        final.push([country_key].concat(new_table[country_key]));
    })
    return final;
}

// Get data from Johns Hopkins
async function getTimeSeriesData(type) {
    const download = require('download');
    const fs = require('fs');


    if (DATA_CACHE[type] && DATA_CACHE[type].data && DATA_CACHE[type].expires > Date.now()) {
        console.log('CACHE HIT',type)
        return DATA_CACHE[type].data
    }

    // const path = './node_modules/COVID-19/csse_covid_19_data/csse_covid_19_time_series';
    // fs.readFile(`${path}/time_series_19-covid-Confirmed.csv`)
    // fs.readFile(`${path}/time_series_19-covid-Deaths.csv`)
    
    const host = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series';
    let url;
    switch (type) {
        case 'confirmed':
            url = `${host}/time_series_19-covid-Confirmed.csv`;
            break;
        case 'deaths':
            url = `${host}/time_series_19-covid-Deaths.csv`;
            break;
        case 'recovered':
            url = `${host}/time_series_19-covid-Recovered.csv`;
            break;
        default:
            throw new Error();
    }

    console.log('CACHE MISS',type)
    const data = await download(url);

    DATA_CACHE[type] = {
        data: data,
        expires: Date.now() + 3600000, // cache for one hour
    }

    return data;
}


app.listen(port, () => console.log(`App listening on port ${port}!`))
