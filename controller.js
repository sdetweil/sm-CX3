const mname="CX3"
angular.module('SmartMirror')
	.controller(mname, ($scope, $interval, CalendarService, WeatherService, $rootScope)=>{

		Date.prototype.getWeek = function () {
		    var target  = new Date(this.valueOf());
		    var dayNr   = (this.getDay() + 6) % 7;
		    target.setDate(target.getDate() - dayNr + 3);
		    var firstThursday = target.valueOf();
		    target.setMonth(0, 1);
		    if (target.getDay() != 4) {
		        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
		    }
		    return 1 + Math.ceil((firstThursday - target) / 604800000);
		}


		// get parms from config
		let weeks_to_view=    +config.CX3.weeks_to_view|| 2
		let first_week_offset= +config.CX3.week_offset || -1
		let mode= config.CX3.mode || "week"
		let fontsize =   (config.CX3.fontsize  || 14) +"px" 
		let maxeventlines= (config.CX3.maxeventlines || 6 )

		let v= {

				// config passed parms
				display_week_number:config.CX3.display_week_number ,
				display_weather_info: config.CX3.display_weather ,
				first_day_of_week: config.CX3.firstDayOfWeek || 0,

				container:{
					classes:'bodice CX3_' + 1 + ' CX3  mode_' + 'day ',
					styles:"--fontsize:"+fontsize +"; --maxeventlines:"+maxeventlines+"; position: absolute;   z-index: 1; ",
				},
				currentWeek:0,

				instance: {id:'CX3_' + 1},

				week_number:[52,53,54],
				weeks:[],
				week_days:[0,1,2,3,4,5,6],
				days_of_week:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
				floor:Math.floor,
				}

				$scope[mname]=v

				if($scope[mname].first_day_of_week!=0){
					let old=$scope[mname].days_of_week.splice(0,$scope[mname].first_day_of_week)
					$scope[mname].days_of_week=$scope[mname].days_of_week.concat(old)
				}

				$scope[mname].now=moment()

				let_day_of_week= $scope[mname].now.isoWeekday()
				let today=+$scope[mname].now.format('DD')
				let week_number=(new Date()).getWeek()
				//console.log("current week number="+week_number)

				if(mode==="month"){
					weeks_to_view=4
					first_week_offset =-1 // (Math.floor(today/7)-1)*-1
					//console.log(" month view first week = "+today+ " floor="+ (Math.floor(today/7)-1)*-1)
				}

				$scope[mname].weeks=[]
				$scope[mname].week_number_list=[]
				let save_week_number=week_number
				for(let x=weeks_to_view+first_week_offset;x>first_week_offset ;x--){
					$scope[mname].weeks.push(x)

					$scope[mname].week_number_list.push(week_number+first_week_offset); week_number++

				}
				week_number=save_week_number
				$scope[mname].weeks=$scope[mname].weeks.reverse()

				let today_weekday=$scope[mname].now.weekday()
				//let today=now.getDay()
				let week_position=$scope[mname].days_of_week.indexOf($scope[mname].days_of_week[today_weekday-$scope[mname].first_day_of_week])
				$scope[mname].currentWeek = $scope[mname].week_number_list.indexOf(week_number)

				//console.log("today is a "+today_weekday+" text="+$scope[mname].days_of_week[today_weekday-$scope[mname].first_day_of_week])
				

				// get number of days to fill in calendar cells
				// number of weeks * 7
				// today_week is todays position in current week 
				// week_position is array index 0,1,2,3
				// get count of days prior
				//  today_weekday  + (week_position *7) 0 = only, 1 = second
				//      4 (thurs)  + (week_position *7)  
				let days= []  // number_of_days = weeks_to_view * 7

				// get the 1st day of the calendar
				let first_day = $scope[mname].now.format('D') -(today_weekday  + ($scope[mname].currentWeek*7)) 
				// start with a copy of today

				let start = $scope[mname].now.clone()
				// create the day array
				let number_of_days = weeks_to_view * 7

				// start the dat object at the 1st cal date
				start.set('date', first_day)
				for (let i =0; i<number_of_days; i++ ){
					// create an object for each day, will be used by the template
					days[i]={date:moment(start),day:start.format('D'),events:[],forecast:null}
					// add a day
					start.add(1,'day')
				}
				// save the count of days in the cal
				$scope[mname].days=days

				let futureDays=start.diff($scope[mname].now,'days')
				// go get the caledar events, wait til theu are ready
				//CalendarService.getCalendarEvents().then(()=>{
				$scope.$on('calendar',(event,futureevents)=>{
					// events ready (pulled from web calendar)
					// past events is large, filter out the garbage
					let allpastevents=CalendarService.getPastEvents()
					let pastevents=[]
					for(let i = allpastevents.length-1;i>0;i--){
						let Event = allpastevents[i]
						if(Event.start.diff($scope[mname].days[0].date) >=0  
									||
						        (Event.end.isAfter($scope[mname].days[0].date) &&
						        	Event.start.isBefore($scope[mname].days[0].date))){
							pastevents.unshift(Event)
						} else {
							break;
						}
					}
					/*
					.filter(Event=>{
						return Event.start.diff($scope[mname].days[0].date) >=0  
									||
						        (Event.end.isAfter($scope[mname].days[0].date) &&
						        	Event.start.isBefore($scope[mname].days[0].date))
					});*/
					// get furture events, for just the rest of the calendar (could be 28 days, or 1)
					//let futureevents= CalendarService.getFutureEvents(futureDays+1, (futureDays+1)*maxeventlines)
					//console.log("future events="+JSON.stringify(futureevents,null,2))
					// loop thu the days once
					// make one list
					let events=pastevents.concat(futureevents)
					// loop thru and apportion by date
					days.forEach(d=>{
						d.events=[]
						// loop thru the smaller number of events
						events.forEach(event=>{
							//console.log("comparing "+d.date.format("YYYY:MM:DD HH:MM A")+" with "+ event.start.format("YYYY:MM:DD HH:MM A"+" title "+event.SUMMARY))
							// if this event starts this day, or ends this day
							// date.diff isn't working)
							if(event.start.format("YYYY:MM:DD") === d.date.format("YYYY:MM:DD") || event.end.format("YYYY:MM:DD") ===d.date.format("YYYY:MM:DD")) {
								//console.log("Matching event day="+d.date.format("YYYY:MM:DD HH:mm A")+ " event start="+event.start.format("YYYY:MM:DD HH:mm A")+" event end="+event.end.format("YYYY:MM:DD HH:mm A"))
								// add it to the days events
								d.events.push(event)
							}
						})
						// sort when there is more than one event per day
						if(d.events.length>1){
							d.events=d.events.sort(function(a,b){
								var da = new Date(a.start).getTime();
            					var db = new Date(b.start).getTime();

            					return da < db ? -1 : da > db ? 1 : 0
            				});
						}
					})
				}, true)
				$scope.$on('weather',(event,data)=>{
					console.log("received weather data change trigger")
					//data=WeatherService.getWeatherData()
					if(data.weekly){
						//console.log("have weekly data ="+JSON.stringify(data.weekly,null,2))
						for ( let i in data.weekly){
							let forecastDay = data.weekly[i]
							let m = moment.utc(forecastDay.dt*1000)
							//console.log("forecast day="+m.format("YYYY:MM:DD")+" temp min="+forecastDay.temp.min+" temp max="+forecastDay.temp.max)
							let fd = m.format('DD')
							for(d of days){
								if(d.date.format('DD')==fd){
									d.forecast={icon:data.weekly.data[i].wi,min:data.weekly.data[i].temperatureMin, max:data.weekly.data[i].temperatureMax}	
									break;
								}
							}
							$scope.$apply()
						}
					}
				})
				// form the grid column info
				$scope[mname].cell= function(start){
						let x = ""+(parseInt(start)+1)
							if(start !== 6)
								x.concat("/"+(parseInt(start)+2))
						return x
				}
				// generate the css classes for this days cell
				$scope[mname].cell_classes=(week,day)=>{
					let d=days[week*7+day]
					let thisMonth=$scope[mname].now.format("MM")===d.date.format("MM")?" thisMonth":""
					let thisYear=$scope[mname].now.format("YYYY")===d.date.format("YYYY")?" thisYear":""
					let isToday=$scope[mname].now.format("YYYYMMDD")===d.date.format("YYYYMMDD")?" today":""

					return "day"+day+" weekday_"+day+" year_"+d.date.format("YYYY")+" month_"+d.date.format("MM")+ " date_"+d.date.format("DD")+isToday+thisMonth+thisYear
				}
	})
