// rguthrie's Weather Dashboard javascript file
// 20191213
// 
// The Weather Dashboard shows current and 5-day forecast weather for selected
// cities.  The city list is remembered in local storage for persistence across
// visits.

// wait for all resources!
$(document).ready(function(){

// single 'switch' to enable copious console.log() calls
const debug = true;

// buffering for full set of data used from OpenWeather.org
var weatherObj = 
{
  city           : "",
  lat            : "",
  lon            : "",
  timezone       : "",
  timeUTCUnix    : "",
  icon           : "",
  description    : "",
  temp           : "",
  rH             : "",
  windS          : "",
  windD          : "",
  uvScore        : "",
  forecastLows   : [],
  forecastLTOD   : [],
  forecastHighs  : [],
  forecastHTOD   : [],
  forecastRHlows : [],
  forecastRHhighs: [],
  forecastDates  : [],
  forecastIcons  : []
}

// the list of cities, including last displayed - which is used by default at startup
var cityList =
{
    key : "WeatherDashboard",
    lastDisplayed: "",
    lastDisplayedCode: "",
    cities: []
}

// clock() services the Interval timer to give current time and date.  Note use
// of moment.js for date/time string.
function clock()
{
  // get and post the current date and time
  $("#currentDateTime").text(moment().format('dddd, YYYY MMMM DD, HH:mm:ss'));
}

// queryWeatherLocs() is used to determine if a city is known to OpenWeather.
function queryWeatherLocs(place)
{
  place = place.toLowerCase();

  // weatherLocs[] is kept locally to speed this search
  for (let i = 0; i < weatherLocs.length; i++)
  {
    if (place == weatherLocs[i]["city"]["name"].toLowerCase())
    {
      return(i);
    }
  }
  return(-1);
}

// listChange() is used to maintain the HTML versions of
// the list of cities.  
function listChange()
{
  // rewrite the dropdown list
  storedCitiesList = $(".storedCities");
  storedCitiesList.empty();

  for (let i = 0; i < cityList.cities.length; i++)
  {
    var newDiv = $("<div>");
    var newButton = $("<button>").addClass("cityBtn").val(i).text(cityList.cities[i]);
    newButton.appendTo(newDiv);
    newButton.click(btnService);
    var newDelBtn = $("<button>").addClass("delBtn").val("x"+i).text("x");
    newDelBtn.appendTo(newDiv);
    newDelBtn.click(btnService);
    newDiv.appendTo(storedCitiesList);

    if (debug) {console.log("added '"+cityList.cities[i]+"' at position "+i+" in storedCitiesList.");}
  }
}

// Button Service vector. 
$(".queryBtn").on("click", btnService);

// function btnService) serves all buttons. Note in listChange() that each city in the history
// is a button; those buttons are directed to btnService() dynamically as their elements
// are added to the page.
function btnService(event) 
{
  var btnVal = $(this).val();
  if (debug) {console.log("Click!  Value is '"+btnVal+"'");}

  var city = "";
  
  // buttons are either adding a new city or selecting one already on the list.

  // first, let's handle a new city
  if (btnVal == "query")
  {
    // fetch it, then clear the input button label.
    var city = $("#citySel").val().trim().toLowerCase();
    $("#citySel").val("");

    if (debug) {console.log("query button, input text val()= '"+city+"'");}

    // check that we have something
    if (city)
    {
      // already in our cities list?
      var cityIndex = cityList.cities.indexOf(city);
      if (debug && (cityIndex >= 0)) {console.log("'"+city+"' is at position "+
        cityIndex+" in the cities list");}
      // and does OpenWeather provide information for this city?
      var cityIndexWL = queryWeatherLocs(city);
      
      if (cityIndex == -1)
      {
        if (debug) {console.log("'"+city+"' isn't in the cities list");}

        // nope, not in our cities list. is it in the OpenWeather list?
        if (cityIndexWL >= 0)
        {
          // It is! Insert it in our list, and re-draw the list on the page.
          if (debug) {console.log("'"+city+"' is in OpenWeather.");}
          cityList.cities.unshift(city);
          // keep the list in alphabetic order
          cityList.cities.sort();
          // and update the HTML
          listChange();
          $("#citySel").attr("placeholder", "city");
        }
        else
        {
          // uh oh. this city's not in OpenWeather's list

          // show the user the search failed
          $("#citySel").attr("placeholder", "<unknown>");
          if (debug) {console.log(city+" isn't in OpenWeather.");}

          // and leave this block with no city name
          city = "";
        }
      }
    }
  }
  else
  {
    // the button is in the City List, and is either a delete 
    // or a select.

    // the button value attributes differentiate selects, which are numbers,
    // and matching deletes, which have a first character of 'x'  
    
    // split to an array of single-character strings
    btnValSplit = btnVal.split("");
    // and test the first character
    if (btnValSplit[0] == "x")
    {
      if (debug) {console.log("Deleting '"+cityList.cities[btnValSplit[1]]+"'");}

      // deletion from cities list.
      cityList.cities.splice(btnValSplit[1],1);
      listChange();
      city = "";
    }
    else
    {
      // selection from the list; button values match the indices of
      // the list
      // the value for a select is the index in the cities list.
      cityIndex = btnVal;
      city = cityList.cities[cityIndex];
      cityIndexWL = queryWeatherLocs(city);
      if (debug) {console.log("Choice from cities list: '"+city+
        "' at index " + cityIndex+", cityIndexWL "+cityIndexWL);}
    }
  }

  if (city) 
  {
    // save the last displayed for use as the first displayed
    // when the page is visited from this browser in the future
    cityList.lastDisplayed = city;
    cityList.lastDisplayedCode = cityIndexWL;
    // and update the list in local storage
    localStorage.setItem(cityList.key,JSON.stringify(cityList));
    // before doing the real work of fetching and organizing info
    // from OpenWeather
    getWeather(city,cityIndexWL);
  }
 }

// makeLocalTime() uses the javascript Date and toUTCString() functions
// to provide elements of date and time, as listed here for var
// dateAndTime.
var dateAndTime =
{
  year           : "",
  month          : "",
  monthName      : "",
  monthNameShort : "",
  dayOfMonth     : "",
  dayOfWeek      : "",
  hour           : "",
  minute         : "",
  second         : ""
}
function makeLocalTime(UTC,tzDelta)
{
  var dateTime = {};  // output buffer
  var dateObj = new Date(1000 * (UTC+tzDelta)); // Javascript toUTCString() method can be
  var tString = dateObj.toUTCString();          // given a UTC-compliant time in milliseconds
                                                // and will produce a string like this: 
                                                // "Fri, 13 Dec 2019 07:00:00 GMT"
  var tArr = tString.split(" "); // which we break apart at the spaces
  dateTime.year = tArr[3];
  dateTime.monthNameShort = tArr[2];
  switch (tArr[2])
  {
    case "Jan": dateTime.month =  1; dateTime.monthName =   "January"; break;
    case "Feb": dateTime.month =  2; dateTime.monthName =  "February"; break;
    case "Mar": dateTime.month =  3; dateTime.monthName =     "March"; break;
    case "Apr": dateTime.month =  4; dateTime.monthName =     "April"; break;
    case "May": dateTime.month =  5; dateTime.monthName =       "May"; break;
    case "Jun": dateTime.month =  6; dateTime.monthName =      "June"; break;
    case "Jul": dateTime.month =  7; dateTime.monthName =      "July"; break;
    case "Aug": dateTime.month =  8; dateTime.monthName =    "August"; break;
    case "Sep": dateTime.month =  9; dateTime.monthName = "September"; break;
    case "Oct": dateTime.month = 10; dateTime.monthName =   "October"; break;
    case "Nov": dateTime.month = 11; dateTime.monthName =  "November"; break;
    case "Dec": dateTime.month = 12; dateTime.monthName =  "December"; break;
  }
  dateTime.dayOfMonth = tArr[1];
  switch (tArr[0])
  {
    case "Mon,": dateTime.dayOfWeek =    "Monday"; break;
    case "Tue,": dateTime.dayOfWeek =   "Tuesday"; break;
    case "Wed,": dateTime.dayOfWeek = "Wednesday"; break;
    case "Thu,": dateTime.dayOfWeek =  "Thursday"; break;
    case "Fri,": dateTime.dayOfWeek =    "Friday"; break;
    case "Sat,": dateTime.dayOfWeek =  "Saturday"; break;
    case "Sun,": dateTime.dayOfWeek =    "Sunday"; break;
  }
  var todArr = tArr[4].split(":");  
  dateTime.hour   = todArr[0];
  dateTime.minute = todArr[1];
  dateTime.second = todArr[2];
  return(dateTime);
}


// getWeather() makes multiple AJAX queries to OpenWeather
// for current weather (including an independent query for 
// UV index), and forecast weather for a selected city.
function getWeather(cityName,cityIndexWL)
{
  // some handy special characters for use down the road
  const degStr       = String.fromCharCode(8457);
  const SEArrowStr   = String.fromCharCode(8600);
  const downArrowStr = String.fromCharCode(8595);
  const NEArrowStr   = String.fromCharCode(8599);

  // ok, let's get some weather info!

  // our query strings are assembled here.
  var baseURL        = "http://api.openweathermap.org/data/2.5/";
  var openWeatherKey = "35a41f79e853928d773cad1da927b1b4";
  var appId          = "&appid="+openWeatherKey;
  var units          = "&units=imperial"
  var currentW       = "weather?q=";
  var forecastW      = "forecast?q=";
  var uviW           = "uvi?";
  var currentURL     = baseURL+currentW+cityName+appId+units;
  var forecastURL    = baseURL+forecastW+cityName+appId+units;
  var uviURL         = baseURL+uviW+appId
    +"&lat=" + weatherLocs[cityIndexWL]["city"]["coord"]["lat"]
    +"&lon=" + weatherLocs[cityIndexWL]["city"]["coord"]["lon"];

  $.ajax({url: currentURL,method: "GET"}).then(
  function(response) 
  {
    var ajaxDebug = false;
    var localDebug = false;

    if (response)
    {
      if (ajaxDebug) {console.log("current weather"); console.log(response);}

      // the hard work is done and we're staring at a big sack of potatoes.
      // start peelin'
      weatherObj.city = cityName;
      weatherObj.lat = response.coord.lat;
      weatherObj.lon = response.coord.lon;
      uviURL = uviURL+"&lat="+response.coord.lat+"&lon="+response.coord.lon;
      weatherObj.timezone = response.timezone;
      weatherObj.timeUTCUnix = response.dt;
      var dtObj = makeLocalTime(weatherObj.timeUTCUnix,weatherObj.timezone);
      var localTime = dtObj.dayOfWeek+", "+dtObj.hour+":"+dtObj.minute;
      weatherObj.temp = Math.round(response.main.temp);
      weatherObj.rH = response.main.humidity;
      weatherObj.description = response.weather[0].description;
      weatherObj.icon = response.weather[0].icon;
      weatherObj.windS = Math.round(0.621371*response.wind.speed);
      var dir = response.wind.deg;
      dir = dir < 0? dir+360 : dir;
      weatherObj.windD = dir >  22.5 && dir <=  67.5 ? "NE" :
                        (dir >  67.5 && dir <= 112.5 ? "E"  :
                        (dir > 112.5 && dir <= 157.5 ? "SE" :
                        (dir > 157.5 && dir <= 202.5 ? "S"  :
                        (dir > 202.5 && dir <= 247.5 ? "SW" :
                        (dir > 247.5 && dir <= 292.5 ? "W"  :
                        (dir > 292.5 && dir <= 337.5 ? "NW" : "N"))))));

      // that was a load.  let's get some content on the page.
      $("#todayCardCity").text(cityName.toUpperCase() +", local time: "+localTime);
      $("#todayCardTemp").text(weatherObj.temp+degStr);
      var iconStr = "http://api.openweathermap.org/img/w/"+weatherObj.icon+".png";
      $("#todayCardIcon").attr("src",iconStr);
      $("#todayCardDesc").text(weatherObj.description);
      $("#todayCardRH").text("Humidity: "+weatherObj.rH+"%");
      $("#todayCardWind").text("Wind: " +weatherObj.windD+" at "+weatherObj.windS+" mph");
    }
  });

  if (ajaxDebug) {console.log("UVI URL: "+uviURL);}

  $.ajax({url: uviURL,method: "GET"}).then(
  function(response) 
  {
    if (response)
    {
      // we make this query just to get the UV Index
      if (debug) {console.log("UV Index"); console.log(response);}
      weatherObj.uvScore = Math.round(10*response.value)/10;
      var uScore = weatherObj.uvScore;
      $("#todayCardUV").text("UV Index: ");
      // we also color-code the range of the UV Index. the method 
      // is to use HTML class assignment with alternate CSS rules.
      var uv = $(".todayCardUVIcon");
      uv.text(uScore);
      uv.removeClass("noSun lowSun highSun");
      uv.addClass(uScore < 3 ? "noSun" : (uScore < 7 ? "lowSun" : "highSun") );
    }
  });

  // the forecast holds 40 future records, all separated in forecast time by 3 hours
  // so 40*3 / 24 = 5 days of records are delivered. the first will be for sometime
  // in the next 3 hours, so some of the records will be for today (unless we are
  // approaching midnight).
  $.ajax({url: forecastURL,method: "GET"}).then(
  function(response) 
  {
    if (response)
    {
      if (ajaxDebug) {console.log("Forecast"); console.log(response);}

      // there should be 5 days of work through the next 5 days to make 5-day forecast info

      // we will find the first record for tomorrow. keep in mind that our city could
      // be anywhere in the world -- any timezone. so we need to work in local time.
      // fortunately, OpenWeather provides a UTC time offset for each supported city.
      // we use makeLocalTime to get the city's local time.
      var dtObj = makeLocalTime(weatherObj.timeUTCUnix,weatherObj.timezone); 
      // our starting day is taken from the current weather request.
      var currentForecastDayOfMonth = dtObj.dayOfMonth;

      if (localDebug) {console.log("dayOfMonth in current forecast: " + currentForecastDayOfMonth);}

      // using a 'while()' to emphasize the persistence of recordIndex
      var recordIndex = 0;
      do
      {
        dtObj = makeLocalTime(response.list[recordIndex].dt, weatherObj.timezone);
        if (localDebug) {console.log("looking for tomorrow, found "+dtObj.dayOfMonth+", "+dtObj.hour);}
      }
      while (recordIndex++ < 40 && dtObj.dayOfMonth == currentForecastDayOfMonth)

      // note that the loop structure causes causes recordIndex to be high by one
      // run with localDebug turned on to see for yourself...
      recordIndex--;

      if (localDebug) {console.log("first record on new day: "+recordIndex);}

      // recordIndex will be < 8 unless the data is fouled.
      if (recordIndex < 8)
      {
        // we now have the index of the first 'tomorrow' record
        // each calendar day is spanned by the current and next 7 records, so we work
        // in groups of 8, with the exception of the last day, which will probably
        // have less than 8.
        forecastDay = 0;
        while (recordIndex < 40)
        {
          // here's the trick to take care of the last day. 
          var recordsInDay = recordIndex < 33 ? 8 : (40-recordIndex);

          // prep for the searches for minima and maxima in humidity and temperature
          var minTemp = 500;
          var maxTemp = -500;
          var minRH = 101;
          var maxRH = -1;

          // oh, BTW, we're ready to write our first record of this day -- the date
          dtObj = makeLocalTime(response.list[recordIndex].dt, weatherObj.timezone);
          var dateStr = dtObj.dayOfWeek+", "+dtObj.dayOfMonth+" "+dtObj.monthNameShort;
          if (localDebug) {console.log(dateStr);}

          weatherObj.forecastDates[forecastDay] = dateStr;

          // now we move through the day, gleaning from each 3-hr record.  
          for (let inDay = 0; inDay < recordsInDay; inDay++)
          {
            // get the hour to be able to show when the high and low temperatures
            // are forecast to occur.
            dtObj = makeLocalTime(response.list[recordIndex].dt, weatherObj.timezone);
            var hr = dtObj.hour;
            if (localDebug) {console.log("by record: recordIndex "+recordIndex+", dayOfMonth "+
              dtObj.dayOfMonth+", hour "+hr)}
            // minima and maxima checks.    
            temp = response.list[recordIndex].main.temp;
            if (temp < minTemp) {minTemp = temp; minTempTOD = hr;}
            if (temp > minTemp) {maxTemp = temp; maxTempTOD = hr;}
            var RH = response.list[recordIndex].main.humidity;
            minRH = RH < minRH ? RH : minRH;
            maxRH = RH > maxRH ? RH : maxRH;

            // the weather icon is a single sample. this test is assured to give us a
            // sample, even if the last day only has one record.  but it won't take a
            // sample after early afternoon.
            if (inDay < 4) 
            {
              weatherObj.forecastIcons[forecastDay] = response.list[recordIndex].weather[0].icon;
            }
            // remember the outer loop...
            recordIndex++;
          }
          // alright, let's tally our treasure.
          weatherObj.forecastRHhighs[forecastDay] = maxRH   = Math.round(maxRH);
          weatherObj.forecastRHlows[forecastDay]  = minRH   = Math.round(minRH);
          weatherObj.forecastHighs[forecastDay]   = maxTemp = Math.round(maxTemp);
          weatherObj.forecastHTOD[forecastDay]    = maxTempTOD;
          weatherObj.forecastLows[forecastDay]    = minTemp = Math.round(minTemp);
          weatherObj.forecastLTOD[forecastDay]    = minTempTOD;

          // and get this dayCard posted on the page. 

          // each dayCard<n> has a div; here <n> is forecastDay. this chunk of code
          // is stuffing what we've accumulated for the day onto (into?) the day's div.
          dayId = $(".dayCard"+forecastDay);
          dayId.empty();

          var newP = $("<p>"); 
          newP.text(weatherObj.forecastDates[forecastDay]).addClass("dayCardDate"); 
          newP.appendTo(dayId);

          // note the mapping to the icons at OpenWeather
          var newImg=$("<img>");
          var iconStr = "http://api.openweathermap.org/img/w/"+weatherObj.forecastIcons[forecastDay]+".png";
          newImg.attr("src",iconStr).addClass("dayCardIcon"); 
          newImg.appendTo(dayId);

          // the local variables used in the inDay loop are still in context.
          var newP = $("<p>"); 
          newP.text("humidity: " + minRH + "%-" + maxRH +"%").addClass("dayCardRH");
          newP.appendTo(dayId);

          // and here's where the special characters are used.
          var highStr = maxTemp + degStr + " at " + maxTempTOD + "00"; 
          var lowStr  = minTemp + degStr + " at " + minTempTOD + "00"; 
          var newHiP = $("<p>"); 
          newHiP.text(highStr).addClass("dayCardHighTemp");
          var newLoP = $("<p>"); 
          newLoP.text(lowStr).addClass("dayCardLowTemp");
          var newArP = $("<p>"); 

          // the dayCard has the feature of showing the high and low temps
          // for the day with the high left of the low if the low happens later - 
          // and vice versa. (yes, they're lined up if they're the same.)
          var arrowStr = downArrowStr;
          if (maxTempTOD > minTempTOD) //hottest is later than coolest
          {
            arrowStr = NEArrowStr;
            newHiP.addClass("right");
          }
          else if (maxTempTOD < minTempTOD) // hottest is earlier than coolest
          {
            arrowStr = SEArrowStr;
            newLoP.addClass("right");
          }
        
          newArP.text(arrowStr).addClass("dayCardArrow");
          
          newHiP.appendTo(dayId);
          newArP.appendTo(dayId);
          newLoP.appendTo(dayId);

          // onward to the next day.
          forecastDay++;
        }
      }
    }
  });

  if (ajaxDebug) {console.log("weatherObj: "); console.log(weatherObj);}
}    

// Welcome!  here's the startup.

// they say there was no time before the Big Bang.
// hmm.  well, anyway, let's start here by starting the clock
var localClock = setInterval(clock,1000.0);

// peruse local Storage
var savedRecord = JSON.parse(localStorage.getItem(cityList.key));
if (savedRecord)
{
  // alright, found something.  load up!      
  cityList = savedRecord;
  // and populate the dropdown list of cities
  listChange();
  // refresh the last-viewed city.
  var c = cityList.cities.indexOf(cityList.lastDisplayed);
  getWeather(cityList.cities[c],cityList.lastDisplayedCode);
}   
else
{
  // first time on a new browser.  let's show our stuff with
  // a random city choice.
  var randoCity = Math.floor(Math.random()*weatherLocs.length);
  getWeather(weatherLocs[randoCity]["city"]["name"],randoCity);
}

})

