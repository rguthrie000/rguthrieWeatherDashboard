$(document).ready(function(){

// var ajaxWait = false;

// $(document).ajaxComplete(function() {ajaxWait = false;});

const debug = true;

var weatherObj = 
{
  city         : "",
  lat          : "",
  lon          : "",
  icon         : "",
  description  : "",
  temp         : "",
  rH           : "",
  windS        : "",
  windD        : "",
  uvScore      : "",
  forecastLows : [],
  forecastLTOD : [],
  forecastHighs: [],
  forecastHTOD : [],
  forecastRHs  : [],
  forecastDates: [],
  forecastIcons: []
}

var cityList =
{
    key : "WeatherDashboard",
    cities: []
}
var storedCitiesList = $("#storedCities");
var cityIndexWL;

function clock()
{
  // get and post the current date and time
  $("#currentDateTime").text(moment().format('MMMM DD YYYY, HH:mm:ss'));
}

function queryWeatherLocs(place)
{
  place = place.toLowerCase();

  for (let i = 0; i < weatherLocs.length; i++)
  {
    if (place == weatherLocs[i]["city"]["name"].toLowerCase())
    {
      return(i);
    }
  }
  return(-1);
}

function listChange()
{
  // save the new list
  localStorage.setItem(cityList.key,JSON.stringify(cityList));

  // rewrite the dropdown list
  storedCitiesList.empty();
  for (let i = 0; i < cityList.cities.length; i++)
  {
    var newDiv = $("<div>").addClass("btn-group","btn-group-vertical");
    var newButton = $("<button>").addClass("cityBtn").val(i).text(cityList.cities[i]);
    newButton.attr("size","35");
    newButton.appendTo(newDiv);
    newButton.click(btnService);
    var newDelBtn = $("<button>").addClass("delBtn").val("x"+i).text("x");
    newDelBtn.appendTo(newDiv);
    newDelBtn.click(btnService);
    if (debug) {console.log("added '"+cityList.cities[i]+"' at position "+i+" in storedCitiesList.");}
    newDiv.appendTo(storedCitiesList);
  }
}

$(".cityBtn").on("click", btnService);

function btnService(event) 
{
  // event.stopPropagation;

  var btnVal = $(this).val();
  if (debug) {console.log("Click!  Value is '"+btnVal+"'");}

  var city = "";

  if (btnVal == "query")
  {
    var city = $("#citySel").val().trim().toLowerCase();
    $("#citySel").val("");

    if (debug) {console.log("query button, input text val()= '"+city+"'");}

    if (city)
    {
      // already in the cities list?
      var cityIndex = cityList.cities.indexOf(city);
      if (debug && (cityIndex >= 0)) {console.log("'"+city+"' is at position "+
        cityIndex+" in the cities list");}
     
      cityIndexWL = queryWeatherLocs(city);
      
      if (cityIndex == -1)
      {
        if (debug) {console.log("'"+city+"' isn't in the cities list");}

        // nope, not in our cities list. is it in the OpenWeather list?
        if (cityIndexWL >= 0)
        {
          // It is! Insert it in our list, and re-draw the list on the page.
          if (debug) {console.log("'"+city+"' is in OpenWeather.");}
          console.log("cityIndexWL: "+cityIndexWL);
          cityList.cities.unshift(city);
          cityList.cities.sort();
          cityIndex = 0;
          listChange();
          $("#citySel").attr("placeholder", "city");
        }
        else
        {
          // uh oh. this city's not in OpenWeather's list
          $("#citySel").attr("placeholder", "unknown");
          if (debug) {console.log(city+" isn't in OpenWeather.");}
          city = "";
        }
      }
    }
  }
  else
  {
    // the button is in the City List, and is either a delete 
    // or a select.  
    btnValSplit = btnVal.split("");
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

      cityIndex = btnVal;
      city = cityList.cities[cityIndex];
      cityIndexWL = queryWeatherLocs(city);
      if (debug) {console.log("Choice from cities list: '"+city+
        "' at index " + cityIndex+", cityIndexWL "+cityIndexWL);}
    }
  }

  if (city) {getWeather(city,cityIndexWL);}
 }


function getWeather(cityName,cityIndexWL)
{
  // ok, let's get some weather info!
  var baseURL        = "http://api.openweathermap.org/data/2.5/";
  var openWeatherKey = "35a41f79e853928d773cad1da927b1b4";
  var appId          = "&appid="+openWeatherKey;
  var units          = "&units=imperial"
  var currentW       = "weather?q=";
  var forecastW      = "forecast?q=";
  var uviW           = "uvi?";
  var currentURL     = baseURL+currentW+cityName+appId+units;
  var forecastURL    = baseURL+forecastW+cityName+appId+units;
  var uviURL         = baseURL+uviW+appId + 
    "&lat=" + weatherLocs[cityIndexWL]["city"]["coord"]["lat"] +
    "&lon=" + weatherLocs[cityIndexWL]["city"]["coord"]["lon"] + units;

  $.ajax({url: currentURL,method: "GET"}).then(
  function(response) 
  {
    if (response)
    {
      if (debug) {console.log("current weather"); console.log(response);}

      weatherObj.city = cityName;
      weatherObj.lat = response.coord.lat;
      weatherObj.lon = response.coord.lon;
      weatherObj.temp = response.main.temp;
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
      $("#todayCardCity").text(cityName);
      $("#todayCardTemp").text(weatherObj.temp+String.fromCharCode(8457));
      var iconStr = "http://api.openweathermap.org/img/w/"+weatherObj.icon+".png";
      $("#todayCardIcon").attr("src",iconStr);
      $("#todayCardDesc").text(weatherObj.description);
      $("#todayCardRH").text("Humidity: "+weatherObj.rH+"%");
      $("#todayCardWind").text("Wind: " +weatherObj.windD+" at "+weatherObj.windS+" mph");
    }
  });

  $.ajax({url: uviURL,method: "GET"}).then(
  function(response) 
  {
    if (response)
    {
      if (debug) {console.log("UV Index"); console.log(response);}
      weatherObj.uvScore = response.value;
      $("#todayCardUV").text("UV Index: ");
      $("#todayCardUVIcon").attr("display","inline").text(weatherObj.uvScore);

      // @@@@@ add CSS
      if (weatherObj.uvScore > 7)
      {
        $("#todayCardUVIcon").toggleClass("lowSun",false).addClass("highSun");
      }
      else
      {
        $("#todayCardUVIcon").toggleClass("highSun",false).addClass("lowSun");
      }
    }
  });

  $.ajax({url: forecastURL,method: "GET"}).then(
  function(response) 
  {
    if (response)
    {
      if (debug) {console.log("Forecast"); console.log(response);}

      // work through the next 5 days to make 5-day forecast info
      var utcDelta = response.city.timezone;
      var localTimeUnix = response.list[0].dt + utcDelta;
      var dateObj = new Date(1000 * localTimeUnix); 
      var oldtString = dateObj.toUTCString(); 
      
      // sample tString: "Fri, 13 Dec 2019 07:00:00 GMT"
      var tArr = oldtString.split(" "); 
      var oldDateOfMonth = tArr[1]; 
      var oldDayArr = tArr.splice(1,3);
      oldtString = oldDayArr.join(" ");
      // keep in mind there are only 40 forecasts in the array.
      var minTemp = 200;
      var minTempTOD;
      var maxTemp = -200;
      var maxTempTOD;
      var avgRhSum = 0;
      var j = 0;
      var k = 0;
      for (var i = 0; i < 40; i++)
      {
        localTimeUnix = response.list[i].dt + utcDelta;
        dateObj = new Date(1000 * localTimeUnix); 
        tString = dateObj.toUTCString(); 
        // sample tString: "Fri, 13 Dec 2019 07:00:00 GMT"
        tArr = tString.split(" "); 
        var newDateOfMonth = tArr[1]; 
        var clkStr = tArr[4];
        var dayArr = tArr.splice(1,3);
        tString = dayArr.join(" ");

        if (newDateOfMonth == oldDateOfMonth)
        {
          k++;
          var clkArr = clkStr.split(":");
          var hr = clkArr[0];
          temp = response.list[i].main.temp;
          if (temp < minTemp) {minTemp = temp; minTempTOD = hr;}
          if (temp > minTemp) {maxTemp = temp; maxTempTOD = hr;}
          avgRhSum += response.list[i].main.humidity;
        }
        else
        {
          // day transition
          oldDateOfMonth = newDateOfMonth;
          weatherObj.forecastRHs[j] = Math.round(avgRhSum / k);  // k can't be zero; on first pass newDate == oldDate
          weatherObj.forecastLows[j] = Math.round(minTemp);
          weatherObj.forecastLTOD[j] = minTempTOD;
          weatherObj.forecastHighs[j]= Math.round(maxTemp);
          weatherObj.forecastHTOD[j] = maxTempTOD;
          weatherObj.forecastDates[j]= oldtString;
          weatherObj.forecastIcons[j] = response.list[i].weather[0].icon;
          j++;
          k = 0;
          oldtString = tString;
          minTemp = 200;
          maxTemp = -200;
          avgRhSum = 0;
        }
      }
      // eventually we're through the 40 samples -- but we weren't lined up on dates, so we need to
      // summarize the last day
      weatherObj.forecastRHs[j] = avgRhSum / k;  // k can't be zero; on first pass newDate == oldDate
      weatherObj.forecastLows[j] = minTemp;
      weatherObj.forecastLTOD[j] = minTempTOD;
      weatherObj.forecastHighs[j]= maxTemp;
      weatherObj.forecastHTOD[j] = maxTempTOD;
      weatherObj.forecastDates[j]= oldtString;
      weatherObj.forecastIcons[j]= response.list[i-1].weather[0].icon;
      //now the day cards
      for (let i = 0; i < 5; i++)
      {
        dayId = $("#dayCard"+i);
        dayId.empty();
        dayId.addClass("dayCard");
        var newP = $("<p>"); newP.text(weatherObj.forecastDates[i]); newP.appendTo(dayId);
        var newImg=$("<img>");
        var iconStr = "http://api.openweathermap.org/img/w/"+weatherObj.forecastIcons[i]+".png";
        newImg.attr("src",iconStr); 
        newImg.appendTo(dayId);
        newP = $("<p>"); 
        newP.text("High: "+weatherObj.forecastHighs[i]+String.fromCharCode(8457)+" at "+weatherObj.forecastHTOD[i]+"00"); 
        newP.appendTo(dayId);
        newP = $("<p>"); 
        newP.text(" Low: "+weatherObj.forecastLows[i]+String.fromCharCode(8457)+" at "+weatherObj.forecastLTOD[i]+"00"); 
        newP.appendTo(dayId);
        newP = $("<p>"); newP.text("humidity: "+weatherObj.forecastRHs[i]+"%"); 
        newP.appendTo(dayId);
      }
    }
  });

  if (debug) {console.log("weatherObj: "); console.log(weatherObj);}
}    

var savedRecord = JSON.parse(localStorage.getItem(cityList.key));
if (savedRecord)
{
  // load up!      
  cityList = savedRecord;
  // and populate the dropdown list of cities
  listChange();
}   

// start the clock
var localClock = setInterval(clock,1000.0);

})

