sap.ui.define([
	"sap/gantt/misc/Format",
	"com/blueboot/smartplanning/utils/moment",
	"sap/gantt/library",
], function (
	Format,
	momentjs,
	GanttLibrary
) {
	"use strict";

	return {

		fnTimeConverter: function (sTimestamp) {
			return Format.abapTimestampToDate(sTimestamp);
		},
		
		workCntrTextPosition: function (sTimestamp, sWorkCntr, iZoomLevel) {
			if (!sTimestamp) return
			if (!sWorkCntr) return
			let iLength = 10
			let iSpacingCharacter
			
			switch (iZoomLevel) {
				case 0:
					iSpacingCharacter = (24*60*60*1000) * 3; //4 days
					break;
				case 1:
					iSpacingCharacter = (60*60*1000) * 2; //4 horas
					break;
				case 2:
					iSpacingCharacter = (60*60*1000) * 1; //1 horas
					break;
				case 3:
					iSpacingCharacter = (60*1000) * 6 //6 min
					break;
			}
			iSpacingCharacter = iSpacingCharacter*iLength
			
			let iTime = Format.abapTimestampToDate(sTimestamp);
			iTime.setTime(iTime.getTime() - iSpacingCharacter);
			return iTime
		},

		numberUnit: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		YesNo: function (bValue) {
			return (bValue) ? this.getText('YES') : this.getText('NO');
		},

		formatDate: function (sDate) {
			if (!sDate || sDate.length < 8) return sDate
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "MMM d, yyyy"
			});
			var oNow = new Date(sDate.substring(0, 4), sDate.substring(4, 6) - 1, sDate.substring(6, 8));
			return oDateFormat.format(oNow);
		},

		dateToFormat: function (format, d) {
			d = d || new Date();
			var yyyy = d.getFullYear(),
				MM = ('0' + (d.getMonth() + 1)).slice(-2),
				dd = ('0' + d.getDate()).slice(-2);
			switch (format) {
			case 'yyyyMMdd':
				return yyyy + MM + dd;
			case 'dd/MM/yyyy':
				return dd + "/" + MM + "/" + yyyy;
			case 'yyyy/MM/dd':
				return yyyy + "/" + MM + "/" + dd;
			case 'dd.MM.yyyy':
				return dd + "." + MM + "." + yyyy;
			default:
				return dd + "-" + MM + "-" + yyyy;
			}
		},

		abapDate: function (sDate) {
			if (!sDate || sDate.length < 8) return sDate;
			var dDate = new Date(sDate.substr(0, 4), sDate.substr(4, 2) - 1, sDate.substr(6, 2));
			var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "EEE, MMM d, yyyy"
			});
			return oDateFormat.format(dDate);
		},

		abapTime: function (sTime) {
			if (!sTime || sTime.length < 6) return sTime;
			return sTime.substr(0, 2) + ":" + sTime.substr(2, 2);
		},

		leadingZeros: function (number) {
			var numb = parseInt(number, 10);
			if (isNaN(numb)) { //Si no es parseable lo devuelvo como esta
				return number;
			} else {
				return parseInt(number, 10);
			}
		},

		ATPErrorExists: function (results) {
			if (!results) return
			if (results.length === 0) return false
			return !!results.find(function (oResult) {
				return oResult.Type === 'E'
			})
		},

		ATPNoErrorExists: function (results) {
			if (!results) return
			if (results.length === 0) return false
			return !results.find(function (oResult) {
				return oResult.Type === 'E'
			})
		},

		pad2: function (n) {
			return n < 10 ? '0' + n : n;
		},

		abapDateTime: function (sDate) {
			return sDate.getFullYear().toString() +
				this.pad2(sDate.getMonth() + 1) +
				this.pad2(sDate.getDate()) +
				this.pad2(sDate.getHours()) +
				this.pad2(sDate.getMinutes()) +
				this.pad2(sDate.getSeconds());
		},

		relationType: function (rel) {
			var relReturn = "FinishToStart";

			switch (rel) {
			case "SF":
				relReturn = "StartToFinish";
				break;
			case "EF":
				relReturn = "FinishToFinish";
				break;
			case "NF":
				relReturn = "FinishToStart";
				break;
			case "AF":
				relReturn = "StartToStart";
				break;
			}

			return relReturn;
		},

		relationTypeToSAP: function (rel) {
			var relReturn = "NF";

			switch (rel) {
			case "StartToFinish":
				relReturn = "SF";
				break;
			case "FinishToFinish":
				relReturn = "EF";
				break;
			case "FinishToStart":
				relReturn = "NF";
				break;
			case "StartToStart":
				relReturn = "AF";
				break;
			}

			return relReturn;
		},

		operationColor: function (operationStatus, isSubOp) {
			var color = isSubOp ? "#3BB9EF" : "#0092D1";

			if (operationStatus && operationStatus.length) {
				if (operationStatus.find(function (s) {
						return s.STAT === "I0045" || s.STAT === "I0009";
					})) {
					color = isSubOp ? "#50D689" : "#27AE60"; //Confirmed
				} else if (operationStatus.find(function (s) {
						return s.STAT === "I0010";
					})) {
					color = isSubOp ? "#FCE47E" : "#F4D03F"; //Parcial Confirmed
				}
			}

			return color;
		},

		correctDate: function (timeStamp) {
			if (timeStamp && timeStamp.substr(8, 6) === "240000") {
				timeStamp = timeStamp.substr(0, 8) + "235959";
			}
			return timeStamp;
		},

		correctTime: function (timeStamp) {
			if (timeStamp === "240000") {
				timeStamp = "235959";
			}
			return timeStamp;
		},

		allPermitsAproved: function (aPermits) {
			if (!aPermits) return
			return !aPermits.find(e => !e.IssuedBy);
		},

		calcKeyText: function (sCalckey) {
			switch (sCalckey) {
			case '0':
				return sap.ui.getCore().getModel('i18n').getResourceBundle().getText('CalcKey0');
				break;
			case '1':
				return sap.ui.getCore().getModel('i18n').getResourceBundle().getText('CalcKey1');
				break;
			case '2':
				return sap.ui.getCore().getModel('i18n').getResourceBundle().getText('CalcKey2');
				break;
			case '3':
				return sap.ui.getCore().getModel('i18n').getResourceBundle().getText('CalcKey3');
				break;
			default:
			}
		},

		alcAge: function (sCreationDate) {
			if (!sCreationDate) return
			var dCreation = new Date(sCreationDate.substr(0, 4), sCreationDate.substr(4, 2) - 1, sCreationDate.substr(6, 2));
			var dNow = new Date()
			if (dCreation > dNow) return ''
			const days = (date_1, date_2) => {
				let difference = date_1.getTime() - date_2.getTime();
				let TotalDays = Math.ceil(difference / (1000 * 3600 * 24));
				return TotalDays;
			}
			return days(dNow, dCreation)
		},
		//Return available times per capacity work per day
		parseDateTimes: function (dStart, tStart, dEnd, tEnd) { //Expected pattern yyyyMMdd,hhmmss,yyyyMMdd,hhmmss
			var workTimes = [],
				regex_date = /^\d{4}\d{2}\d{2}$/,
				regex_time = /^\d{2}\d{2}\d{2}$/;
			// First check for the pattern
			if (!dStart || !regex_date.test(dStart) || !dEnd || !regex_date.test(dEnd) ||
				!tStart || !regex_time.test(tStart) || !tEnd || !regex_time.test(tEnd)) {
				return [];
			}
			// Parse the date parts to integers
			var yearS = parseInt(dStart.substring(0, 4), 10),
				monthS = parseInt(dStart.substring(4, 6), 10),
				dayS = parseInt(dStart.substring(6, 8), 10),
				yearE = parseInt(dEnd.substring(0, 4), 10),
				monthE = parseInt(dEnd.substring(4, 6), 10),
				dayE = parseInt(dEnd.substring(6, 8), 10);
			// Check the ranges of month and year
			if (yearS < 1000 || yearS > 9999 || monthS == 0 || monthS > 12 || yearE < 1000 || yearE > 9999 || monthE == 0 || monthE > 12) {
				return [];
			}
			var monthLenS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
			var monthLenE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
			// Adjust for leap years
			if (yearS % 400 == 0 || (yearS % 100 != 0 && yearS % 4 == 0)) {
				monthLenS[1] = 29;
			}
			if (yearE % 400 == 0 || (yearE % 100 != 0 && yearE % 4 == 0)) {
				monthLenE[1] = 29;
			}
			//Parse dates to days
			var daysStart = (yearS * 365) + (monthS * monthLenS[monthS - 1]) + dayS;
			var daysEnd = (yearE * 365) + (monthE * monthLenE[monthE - 1]) + dayE;
			var dDiff = daysEnd - daysStart;

			if (dDiff < 0) return [];

			//Parse the time parts to seconds directly
			var timeSSecs = parseInt(tStart.substr(4, 2)) + parseInt(tStart.substr(2, 2) * 60) + parseInt(tStart.substr(0, 2) * 3600);
			var timeESecs = parseInt(tEnd.substr(4, 2)) + parseInt(tEnd.substr(2, 2) * 60) + parseInt(tEnd.substr(0, 2) * 3600);

			if (dDiff === 0 || (dDiff === 1 && timeESecs === 0)) {
				workTimes.push({
					date: dStart,
					sStart: timeSSecs,
					sFinish: timeESecs
				});
				return workTimes;
			} else {
				var fecha = dStart;
				workTimes.push({
					date: dStart,
					sStart: timeSSecs,
					sFinish: 86400
				});
				for (var i = 1; i < dDiff; i++) {
					fecha = moment(fecha, "YYYYMMDD").add(1, 'days').format('YYYYMMDD');
					workTimes.push({
						date: fecha,
						sStart: 0,
						sFinish: 86400
					});
				}
				workTimes.push({
					date: dEnd,
					sStart: 0,
					sFinish: timeESecs
				});
				return workTimes;
			}
		},

		timeLineOptions: function () {
			return {
				"OneHour": {
					innerInterval: {
						unit: GanttLibrary.config.TimeUnit.hour,
						span: 1,
						range: 90
					},
					largeInterval: {
						unit: GanttLibrary.config.TimeUnit.day,
						span: 1,
						pattern: "cccc dd.MM.YYYY"
					},
					smallInterval: {
						unit: GanttLibrary.config.TimeUnit.hour,
						span: 1,
						pattern: "HH:mm"
					}
				},
				"TwelveHours": {
					innerInterval: {
						unit: GanttLibrary.config.TimeUnit.hour,
						span: 12,
						range: 90
					},
					largeInterval: {
						unit: GanttLibrary.config.TimeUnit.day,
						span: 1,
						pattern: "cccc dd.MM.YYYY"
					},
					smallInterval: {
						unit: GanttLibrary.config.TimeUnit.hour,
						span: 12,
						pattern: "HH:mm"
					}
				},
				"OneDay": {
					innerInterval: {
						unit: GanttLibrary.config.TimeUnit.day,
						span: 1,
						range: 90
					},
					largeInterval: {
						unit: GanttLibrary.config.TimeUnit.month,
						span: 1,
						pattern: "LLLL YYYY"
					},
					smallInterval: {
						unit: GanttLibrary.config.TimeUnit.day,
						span: 1,
						pattern: "cc dd"
					}
				},
				"OneMonth": {
					innerInterval: {
						unit: GanttLibrary.config.TimeUnit.month,
						span: 1,
						range: 90
					},
					largeInterval: {
						unit: GanttLibrary.config.TimeUnit.year,
						span: 1,
						format: "YYYY"
					},
					smallInterval: {
						unit: GanttLibrary.config.TimeUnit.month,
						span: 1,
						pattern: "LLL"
					}
				}
			}
		},
		
		parseDurationUnits: function (durUnit) {
			if (!durUnit) return durUnit;
			var oTimeUnits = this.oGlobalModel.getProperty("/RelationTimeUnits");
			var sTimeUnit = oTimeUnits.find(function (t) {
				return t.Key === durUnit;
			})
			if (!sTimeUnit.Text) return durUnit;
			else return sTimeUnit.Text;
		}

	};

});