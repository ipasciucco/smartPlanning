/* global moment:true */
sap.ui.define([
	"com/blueboot/smartplanning/controller/BaseController",
	"sap/ui/model/Filter",
	'sap/ui/core/Fragment',
	"sap/gantt/simple/Relationship",
	"com/blueboot/smartplanning/utils/formatter",
	"com/blueboot/smartplanning/utils/oDataAction",
	"com/blueboot/smartplanning/utils/moment",
	"com/blueboot/smartplanning/utils/TableP13n",
	// "sap/gantt/simple/GanttPrinting",
	"../controls/GanttPrinting",
	"../utils/VH",
	
], function (
	BaseController,
	Filter,
	Fragment,
	Relationship,
	formatter,
	oDataAction,
	momentjs,
	TableP13n,
	GanttPrinting,
	VH,
	) {
	"use strict";
	
	const STROKE_CONSTRAINT_COLOR = "#B207F2";
	const STROKE_DASH = "2";
	const STROKE_WIDTH = 5;
	const sOrderColor = '#a8501c'
	const sOverWorkedWCColor = '#EC7063'//Red
	const sNotWorkingWCColor = '#CACFD2'//Grey
	const sHeavyWorkWCColor = '#F4D03F'//Yellow
	const sLightWorkWCColor = '#58D68D'//Green
	const sInitialStartDate = "20220101000000"
	const sInitialEndDate = "20221201000000"
	
	return BaseController.extend("com.blueboot.smartplanning.controller.Gantt", {
		
		oDataModel: null,
		oGlobalModel: null,
		oMessageManager: null,
		
		formatter: formatter,
		_gantt1: null,
		_gantt2: null,
		_zoomStrategy: null,
		_zoomStrategy2: null,
		_treeTableGantt: null,
		oTimeLineOptions: formatter.timeLineOptions(),         
		
		VH: VH,
		
		onInit: function () {
			window._gantt = this
			
			//Double click event
			this._clicks = 0;

			//Models
			this.oDataModel = sap.ui.getCore().getModel();
			this.oGlobalModel = sap.ui.getCore().getModel("mGlobal");
			this.createOdataPromse(this.oDataModel);
			
			//Controls
			this._gantt1 = this.byFragmentId("Gantt1", "gantt1");
			this._gantt2 = this.byFragmentId("Gantt2", "gantt2");
			this._zoomStrategy = this.byFragmentId("Gantt1", "zoomStrategy");
			this._zoomStrategy2 = this.byFragmentId("Gantt2", "zoomStrategy2");
			this._treeTableGantt = this.byFragmentId("Gantt1", "treeTableGantt1");
			
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");
			this.oMessageManager.registerObject(this.getView(), true);
			
			this._initGantt()
			
			oDataAction.getRelationTypes.call(this);
			oDataAction.getRelationTimeUnits.call(this);
			// oDataAction.getActionsList.call(this);
			
			this.VariantManagement = new sap.ui.comp.variants.VariantManagement({standardItemText:'Standar'})
			this.GantTableP13n = new TableP13n({ 
			    oTable: _gantt._treeTableGantt,
			    bSelectable: true,
			    oVariantManagement: this.VariantManagement
			})
			
			//Router
			this.getRouter().getRoute("RouteGantt").attachPatternMatched(this._onObjectMatched, this);
		
		},
		
		createCalendarDef: function(){
			this.set('/CanlendarDefs', {} )
			jQuery.sap.require("sap.gantt.def.cal.Calendar")
			jQuery.sap.require("sap.gantt.def.cal.TimeInterval")
			
			let oCalendarDefs = this.byFragmentId("Gantt1", "calDefs")
			oCalendarDefs.setModel(this.oGlobalModel)
			oCalendarDefs.removeAllDefs()

			let aOrders = this.get('/Selections/Orders')
			if (!aOrders) return
			let removeDuplicates = function(arr) {
			    return arr.filter((item, index) => arr.indexOf(item) === index);
			}
			let aWC = []
			aOrders.map(e=>e.OrderOperationSet.results.map(e=>aWC.push(e.WorkCntr)))
			aWC = removeDuplicates(aWC)
			
			aWC.map(sWC=>{ 
				
				let oCalendar = new sap.gantt.def.cal.Calendar({
					key:sWC, 
					backgroundColor:"#cad2cd"
				})
				oCalendar.setModel(this.oGlobalModel)
				oCalendarDefs.addDef(oCalendar)
				
				oCalendar.bindTimeIntervals({
				    path: '/CanlendarDefs/'+sWC,
				    template: new sap.gantt.def.cal.TimeInterval({
				    	startTime:"{startTime}",
				    	endTime:"{endTime}"
				    })
				})
				
			})
			
			// _gantt.set('/SPINELEC', [{startTime:"20230303170000", endTime:"20230305170000"},{startTime:"20230307170000", endTime:"20230309170000"}] )
			//register every Person Responsable for visible operations
			let aPersWC = []
			aOrders.map(e=>e.OrderOperationSet.results.map(e=>{//ME PARECE QUE ESTO LO VOY A BORRAR UNA VEZ ME TRAIGA LOS NOMBRES EN '/CapacityWorkSet'
				if(e.PersNo === "00000000") return
				let claveWC = e.Plant+"-"+e.WorkCntr
				if(!aPersWC[claveWC]){
					aPersWC[claveWC] = []
				}
				if(!aPersWC[claveWC][e.PersNo] ){
					aPersWC[claveWC][e.PersNo] = {
						Pernr: e.PersNo,
						PersName: e.PersName,
						Plant: e.Plant,
						WorkCntr: e.WorkCntr,
						Work: []
					}
				}
			}))
			this.set("/PersonOnWC", aPersWC );
		},
		
		openTableP13n: function(){
			this.GantTableP13n.open()
		},
		
		openVariantManagment: function(){
			this.VariantManagement._openVariantSelection()
			this.VariantManagement.oVariantPopOver.openBy( this.byFragmentId("GanttToolbar", "gantMenu") )	
		},
		
		toggleShapeTextVisible: function(){
			this.set('/ShapeTextVisible', !this.get('/ShapeTextVisible') ) 
		},
		
		toggleCursoLine: function(){
			var bCursorLine = this._gantt1.getEnableCursorLine()
			this.set('/CursorLine', !bCursorLine ) 
			this._gantt1.setEnableCursorLine(!bCursorLine)
		},
		
		_initGantt: function(){
			//Initial Data model
			this.set("/TotalHorizonStartDate", sInitialStartDate );
			this.set("/TotalHorizonEndDate", sInitialEndDate );
			this.set("/VisibleHorizonStartDate", sInitialStartDate );
			this.set("/VisibleHorizonEndDate", sInitialEndDate );
			
			this.set("/FirstView", true );
			
			this._zoomStrategy.setTimeLineOptions(this.oTimeLineOptions);
			this._zoomStrategy.setTimeLineOption(this.oTimeLineOptions["OneDay"]);
			this._zoomStrategy2.setTimeLineOptions(this.oTimeLineOptions);
			this._zoomStrategy2.setTimeLineOption(this.oTimeLineOptions["OneDay"]);
			
			this._gantt1.setEnableCursorLine(false) 
			this._gantt2.setEnableCursorLine(false)
		},
		
		_onObjectMatched: function (oEvent) {
			this.setBusy(false, "appView" );
			
			this._initGantt()

			this._zoomStrategy2.prevZoom = undefined
			this.set('/ZoomLevel', this._zoomStrategy2.getZoomLevel())

			var ordersSelected = this.get("/Selections/Orders");
			if (!ordersSelected || ordersSelected.length < 0){
				this.onNavBack();
				return
			}
			
			this.set('/CapacityWorkSet', [] )
			this.set('/CapacityAvailabilitySet', [] )
			this.set('/objectSelected', null )
			
			this.setGanttData();
			this.set("/FirstView", false );
			
			var oTableGantt = this._gantt1
			var oTable = oTableGantt.getTable();
			oTable.clearSelection();
			
			this.createCalendarDef();
		},
		
		setGanttData: function () {
			var ordersSelected = this.get("/Selections/Orders");
			var newOrdersSelected = [];
			var orders = this.get("/OrderSet");
			var ordersGantt = [];
			var relations = [];
			var aWorkCentersDataToGet = []
			
			
			var maxDate = "00000000000000";
			var minDate = "99999999999999";
			ordersSelected.forEach(function (os) {
				var o = orders.find(function (order) { return order.Orderid === os.Orderid; })
				newOrdersSelected.push(o);
				var order = {
					ID: o.Orderid,
					ObjectID: o.Orderid,
					Orderid: o.Orderid,
					ShortText: o.ShortText,
					StartDate: formatter.correctDate(o.StartDate + o.BasicStart),
					EndDate: formatter.correctDate(o.FinishDate + o.BasicFin),
					ParentObjectID: "",
					HierarchyNodeLevel: 0,
					DrillDownState: "expanded",
					Magnitude: 0,
					Color: sOrderColor,
					Type: "SummaryExpanded",
					Connectable: false,
					Height: "25",
					DueDateVisible: true,
					DueDateObjectID: o.Orderid + "-DD",
					DueDateStartDate: o.DueDate ? formatter.correctDate(o.DueDate + "000000") : "", 
					DueDateEndDate: o.DueDate ? formatter.correctDate(o.DueDate + "000000") : "", 
					Operations: []
				}
				
				o.OrderOperationSet.results.forEach(function (oo) {
					var startDate = oo.EarlSchedStartDate + oo.EarlSchedStartTime;
					var endDate = oo.EarlSchedFinDate + oo.EarlSchedFinTime;
					
					if (oo.ConstraintTypeStart) {
						startDate = oo.StartCons !== "00000000" && oo.StrtTimCon !== "000000" ? oo.StartCons + oo.StrtTimCon : startDate;
					}
					if (oo.ConstraintTypeFinish) {
						endDate = oo.FinCons !== "00000000" && oo.FinTimCons !== "000000" ? oo.FinCons + oo.FinTimCons : endDate;
					}
					
					maxDate = endDate > maxDate ? endDate : maxDate;
					minDate = startDate < minDate ? startDate : minDate;
					
					var datesRestriction = false;
					var strokeColor = "";
					var strokeWidth = 0;
					var strokeDash = "";
					
					
					if (oo.ConstraintTypeStart || oo.ConstraintTypeFinish) {
						datesRestriction = true;
						strokeColor = STROKE_CONSTRAINT_COLOR;
						strokeWidth = STROKE_WIDTH;
						strokeDash = STROKE_DASH;
					}
					
					var isSubOp = oo.SubActivity ? true : false;
					
					order.Operations.push({
						// Orderid: o.Orderid,
						ID: isSubOp ? o.Orderid + " / " + oo.Activity + " / " + oo.SubActivity : o.Orderid + " / " + oo.Activity,
						Activity: oo.Activity,
						SubActivity: oo.SubActivity,
						ObjectID: o.Orderid + "-" + oo.Activity,
						ShortText: oo.Description,
						RelationID: "",
						StartDate: formatter.correctDate(startDate),
						EndDate: formatter.correctDate(endDate),
						Work: oo.Work,
						UnWork: oo.UnWork,
						ActualDur: oo.ActualDur,
						Duration: oo.Duration,
						DurationNormalUnit: oo.DurationNormalUnit,
						Remaining: oo.Remaining,
						RemWork: oo.RemWork,
						Count: oo.Count,
						WorkCntr: oo.WorkCntr,
						Color: formatter.operationColor(oo.SystemStatusSet.results, isSubOp),
						Type: "Normal",
						Connectable: isSubOp ? false : true,
						Height: "20",
						DueDateVisible: false,
						ParentObjectID: o.Orderid,
						DatesRestriction: datesRestriction,
						ConstraintTypeFinish: oo.ConstraintTypeFinish,
						ConstraintTypeStart: oo.ConstraintTypeStart,
						StrokeColor: strokeColor,
						StrokeWidth: strokeWidth,
						StrokeDash: strokeDash
					});
					
					if (!!startDate && !!endDate){
						aWorkCentersDataToGet.push( { WorkCntr: oo.WorkCntr, Plant: oo.Plant, startDate: startDate, endDate: endDate } )
					}
					
				});
				
				ordersGantt.push(order);
				
				o.OrderRelationSet.results.forEach(function (or) {
					var newRelation = {};
					var id = or.OrderPredecessor + "-" + or.OperationPredecessor + "-" + or.OrderSuccessor + "-" + or.OperationSuccessor;
					newRelation.ObjectID = id;
					newRelation.RelationID = id;
					newRelation.ParentObjectID = or.OrderPredecessor + "-" + or.OperationPredecessor;
					newRelation.PredecTaskID = or.OrderPredecessor + "-" + or.OperationPredecessor;
					newRelation.SuccTaskID = or.OrderSuccessor + "-" + or.OperationSuccessor;
					newRelation.RelationType = formatter.relationType(or.RelationType);
					newRelation.shapeTypeStart = "VerticalRectangle";
					newRelation.shapeTypeEnd = "Diamond";
					newRelation.DurationRelation = or.DurationRelation;
					newRelation.DurationRelationUnit = or.DurationRelationUnit;
					
					relations.push(newRelation);
				});
			});
			
			
			aWorkCentersDataToGet = this.getRangeOfAvaibilityToGet(aWorkCentersDataToGet)
			oDataAction.getWCCapacityData.call( this, aWorkCentersDataToGet )
			
			var horizonStartDate = formatter.fnTimeConverter(minDate);
			horizonStartDate.setMonth(horizonStartDate.getMonth() - 1);
			var horizonEndDate = formatter.fnTimeConverter(maxDate);
			horizonEndDate.setMonth(horizonEndDate.getMonth() + 1);
			var visibleStartDate = formatter.fnTimeConverter(minDate);
			visibleStartDate.setDate(visibleStartDate.getDate() - 1);
			var visibleEndDate = formatter.fnTimeConverter(maxDate);
			visibleEndDate.setDate(visibleEndDate.getDate() + 1);
			
			this.set("/minDate", minDate )
			this.set("/maxDate", maxDate ) 
			this.set("/TotalHorizonStartDate", formatter.abapDateTime(horizonStartDate));
			this.set("/TotalHorizonEndDate", formatter.abapDateTime(horizonEndDate));
			
			// var objectSelected = this.get('/objectSelected' )
			// if (objectSelected){
			// 	this.goToObjectSelected(objectSelected) 
			// } else {
			// 	this.set("/VisibleHorizonStartDate", formatter.abapDateTime(visibleStartDate));
			// 	this.set("/VisibleHorizonEndDate", formatter.abapDateTime(visibleEndDate));
			// }
			
			if (this.get("/FirstView")) {
				this.set("/FirstView", false)
				this.set("/VisibleHorizonStartDate", formatter.abapDateTime(visibleStartDate) );
				this.set("/VisibleHorizonEndDate", formatter.abapDateTime(visibleEndDate));
			}
			
			this.set("/OrdersGantt", ordersGantt);	
			this.set("/Selections/Orders", newOrdersSelected);	
			this.set("/Relationships", relations);
			this.set("/ShapeTextVisible", true);
		},
		
		getRangeOfAvaibilityToGet: function(aWC, aPrevData = [] ){
			var aResponse = aPrevData 
			aWC.forEach(function(e){
				let oWC = {...e}
				
				let oAdded = aResponse.find( function(oResponse) { return oResponse.WorkCntr === oWC.WorkCntr && oResponse.Plant === oWC.Plant } )
				
				oWC.startDate = moment( oWC.startDate , "YYYYMMDD" ).subtract( 1, 'week' ).format('YYYYMMDD')
				oWC.endDate = moment( oWC.endDate , "YYYYMMDD" ).add( 1, 'week' ).format('YYYYMMDD')

				if (!oAdded) { aResponse.push( oWC ) } 
				else {
				
					if ( oWC.startDate < oAdded.startDate ) {
						oAdded.startDate = oWC.startDate
					}
					if ( oWC.endDate > oAdded.endDate ) {
						oAdded.endDate = oWC.endDate
					}
				}
			})                        
			return aResponse
		},
		
		timeToSeconds: function(sTime){ return parseInt(sTime.substr(4,2)) + parseInt( sTime.substr(2,2) * 60 ) + parseInt( sTime.substr(0,2) * 3600 )	},
		
		getCapacityByHour:function(){
			
			var aCA = this.get('/CapacityAvailabilitySet')
			var aHourCap = []
			
			aCA.forEach(function(oCA){
			
			    let oHourCap = { 
			        Arbpl: oCA.Arbpl,
			        Werks: oCA.Werks,
			        Datum: oCA.Datum,
			        CargaTrabajo: 0,
			        persons: [],
			    }
			    
			    let inicioPeriodo = this.timeToSeconds(oCA.Begzt)
			    let finPeriodo = this.timeToSeconds(oCA.Endzt) 
			    if (inicioPeriodo > finPeriodo && finPeriodo === 0 ) finPeriodo = 86400
			    let segundoDeTrabajo = (finPeriodo - inicioPeriodo)
			    let segundosTrabajoDelPeriodo = oCA.Kapazs
			    let trabajoPorHora =  segundoDeTrabajo ? segundosTrabajoDelPeriodo / segundoDeTrabajo : 0
			
			    for ( let iCS = 0 ; iCS < 86400 ; iCS = iCS + 3600 ) {
			        let iCE = iCS + 3600
			        let A = inicioPeriodo
			        let B = finPeriodo
			        let C = iCS
			        let D = iCE
			        let resultado

			        if ( A <= C && B <= D && B > C ){ 
			            resultado = B - C
			        } else if ( C <= A && D <= B && D > A ) {
			            resultado = D - A
			        } else if ( A >= C && B <= D || C >= A && D <= B ) {
			            resultado = D - C
			        } else {
			            resultado = 0
			        }
			        oHourCap.SegInicio = iCS
			        oHourCap.SegFin = iCE 
			        oHourCap.SegundosDisponibles = resultado * trabajoPorHora
			        
			        /*var oFind = aHourCap.find(function(e){ //no se usa
			        	return e.Arbpl === oHourCap.Arbpl && e.Werks === oHourCap.Werks  && e.Datum === oHourCap.Datum && e.SegInicio === oHourCap.SegInicio
			        })*/
			        aHourCap.push({...oHourCap})
			    }
			}.bind(this))
			
			let fSort = function(a, b) {
			  if (a.Arbpl < b.Arbpl) return -1;
			  if (a.Arbpl > b.Arbpl) return 1;
			  if (a.Werks < b.Werks) return -1;
			  if (a.Werks > b.Werks) return 1;
			  if (a.Datum < b.Datum) return -1;
			  if (a.Datum > b.Datum) return 1;
			  if (a.SegInicio < b.SegInicio) return -1;
			  if (a.SegInicio > b.SegInicio) return 1;
			  return 0;
			}
			aHourCap.sort(fSort)
			
			this.set('/CapacityByHour', aHourCap )
		},
		
		getWorkLoad:function(){
			var aCapacityByHour = this.get('/CapacityByHour')
			var aCA = this.get('/CapacityAvailabilitySet')
			var aWork = this.get('/CapacityWorkSet')
			var aPersonWC =  this.get('/PersonOnWC')
			aWork.forEach(function(oWork){
				let trabajoPendiente = oWork.Arbei
				let personaResp = oWork.Pernr
				let claveWC = oWork.Werks+"-"+oWork.Arbpl
				//let workAvailability = formatter.parseDateTimes(oWork.Fsavd, oWork.Fsavz, oWork.Fsedd, oWork.Fsedz)//no se usa
				aCapacityByHour.forEach(function(oCapacity){
					
					if (trabajoPendiente <= 0) return
					if ( oCapacity.Arbpl !== oWork.Arbpl || oCapacity.Werks !== oWork.Werks ) return
					if ( oCapacity.SegundosDisponibles <= 0 )  return
					if ( oCapacity.Datum < oWork.Fsavd ) return
					
					let oWorkSegInicio = this.timeToSeconds(oWork.Fsavz)
					if ( oCapacity.Datum  == oWork.Fsavd && oCapacity.SegInicio + 3600 < oWorkSegInicio ) return
					
					//Si estoy en el medio de la franja minima de 1 hora
					let Horas_a_descontar = 3600
					if ( oCapacity.Datum  == oWork.Fsavd && ( oCapacity.SegInicio ) < oWorkSegInicio ) {
						Horas_a_descontar = 3600 - ( oWorkSegInicio - oCapacity.SegInicio )
					}
					
					//Descuento los segundos de trabajo
					if (trabajoPendiente - Horas_a_descontar < 0) {
						oCapacity.CargaTrabajo = oCapacity.CargaTrabajo + trabajoPendiente
						trabajoPendiente = 0
					} else {
						oCapacity.CargaTrabajo = oCapacity.CargaTrabajo + Horas_a_descontar
						trabajoPendiente = trabajoPendiente - Horas_a_descontar
					}
				}.bind(this))
				
				if (personaResp === "00000000") return
				if (oWork.Arbei <= 0) return
				
				trabajoPendiente = oWork.Arbei
				
				if(!aPersonWC[claveWC]){
					aPersonWC[claveWC] = []
				}
				if(!aPersonWC[claveWC][personaResp] ){
					aPersonWC[claveWC][personaResp] = {
						Pernr: personaResp,
						PersName: personaResp,//MODIFICAR BACK PARA QUE ME TRAIGA oWork.PersName
						Plant: oWork.Werks,
						WorkCntr: oWork.Arbpl,
						Work: []
					}
				}
					
				let oPerson = aPersonWC[claveWC][personaResp]
				
				let oWorkSegInicio = this.timeToSeconds(oWork.Fsavz)
				let oWorkSegFinal = this.timeToSeconds(oWork.Fsedz) //no lo utilicé, las horas se siguen asignando aunque haya terminado la operación
				//let horaActual = ~~(oWorkSegInicio/3600)
				let segHoraActual = oWorkSegInicio - oWorkSegInicio % 3600
				let fechaActual = oWork.Fsavd
				let trabajoHoraActual = 0
				
				//buscar horario de trabajo en WC para día actual
				let actualWCCapacity = aCA.find(function(e){
		        	return e.Arbpl === oWork.Arbpl && e.Werks === oWork.Werks && e.Datum == oWork.Fsavd
		        })
		        if (!actualWCCapacity) return
		        
		        let segInicioJornadaWC = this.timeToSeconds(actualWCCapacity.Begzt)
				let segFinalJornadaWC = this.timeToSeconds(actualWCCapacity.Endzt)
				let segHoraInicioJornadaWC = segInicioJornadaWC - segInicioJornadaWC % 3600
				if (segHoraActual < segHoraInicioJornadaWC){
					segHoraActual = segHoraInicioJornadaWC
				}
				
				while (trabajoPendiente > 0){
					//Condiciones cambio de día
					if (segHoraActual >= 86400 || segHoraActual >= segFinalJornadaWC || (segInicioJornadaWC - segFinalJornadaWC) == 0){//Change of Day
						let actualDate = new Date(fechaActual.substring(0, 4), fechaActual.substring(4, 6) - 1, fechaActual.substring(6, 8))
						let cantIntentos = 0
						do {
							actualDate.setDate(actualDate.getDate() + 1)
							fechaActual = formatter.dateToFormat('yyyyMMdd',actualDate)
							actualWCCapacity = aCA.find(function(e){
					        	return e.Arbpl === oWork.Arbpl && e.Werks === oWork.Werks && e.Datum == fechaActual && e.Begzt != e.Endzt
					        })
					        cantIntentos++
						} while (!actualWCCapacity && cantIntentos < 100)//WARNING: le puse un límite de intentos para que no ve vaya infinitamene buscando en el futuro, en teoría debería haber algo de trabajo todas las semanas
						
						segInicioJornadaWC = this.timeToSeconds(actualWCCapacity.Begzt)
						segFinalJornadaWC = this.timeToSeconds(actualWCCapacity.Endzt)
						segHoraInicioJornadaWC = segInicioJornadaWC - segInicioJornadaWC % 3600
						segHoraActual = segHoraInicioJornadaWC
					}
					if (segHoraInicioJornadaWC <= segHoraActual && segHoraActual < segFinalJornadaWC){
						//horaActual = ~~(segHoraActual/3600)
						let oPersonWorkHour = oPerson.Work.find(function(e){
				        	return e.Datum === fechaActual && e.SegInicio === segHoraActual
				        })
						if (!oPersonWorkHour){
							oPersonWorkHour = {
								//ESTO NO SE TIENE QUE ARMAR COMO UN SUBTASK NECESARIAMENTE, PORQUE ESO DEPENDE DEL NIVEL DE ZOOM
								CargaTrabajo: 0,
								Datum: fechaActual,
								SegInicio: segHoraActual,
								SegFin: segHoraActual + 3599,//no le encontre uso todavía
								SegundosDisponibles: 3600
							}
							oPerson.Work.push(oPersonWorkHour)
						}
						if (fechaActual == oWork.Fsavd && segHoraActual < oWorkSegInicio && oWorkSegInicio < segHoraActual + 3600){
							//caso particular donde no empezó la operación
							if (oWorkSegInicio < segInicioJornadaWC && segHoraActual + 3600 <= segFinalJornadaWC ){//corta la hora el inicio de jornada WC
								trabajoHoraActual = 3600 - (segInicioJornadaWC - segHoraActual)
							}else if(oWorkSegInicio < segInicioJornadaWC && segHoraActual + 3600 > segFinalJornadaWC){//cortan la hora el inicio y final de jornada WC
								trabajoHoraActual = segFinalJornadaWC - segInicioJornadaWC
							}else if(oWorkSegInicio >= segInicioJornadaWC && oWorkSegInicio < segFinalJornadaWC && segHoraActual + 3600 <= segFinalJornadaWC){//corta la hora el inicio de la oper
								trabajoHoraActual = 3600 - (oWorkSegInicio - segHoraActual)
							}else if(oWorkSegInicio >= segInicioJornadaWC && oWorkSegInicio < segFinalJornadaWC && segHoraActual + 3600 > segFinalJornadaWC){//cortan la hora el inicio de la oper y final de jornada WC
								trabajoHoraActual = segFinalJornadaWC - oWorkSegInicio
							}else{//la operación empezó despues del final de jornada
								trabajoHoraActual = 0
							}
						}else{
							//ya emepezó la operación, solo se tiene en cuenta el horario del WC
							if (segHoraActual < segInicioJornadaWC && segHoraActual + 3600 > segFinalJornadaWC){//"cortan la hora ambos inicio y final jornada WC"
								trabajoHoraActual = segFinalJornadaWC - segInicioJornadaWC
							} else if (segHoraActual < segInicioJornadaWC && segHoraActual + 3600 <= segFinalJornadaWC){//"corta la hora inicio jornada WC"
								trabajoHoraActual = segHoraActual + 3600 - segInicioJornadaWC
							} else if (segHoraActual >= segInicioJornadaWC && segHoraActual + 3600 > segFinalJornadaWC){//"corta la hora final jornada WC"
								trabajoHoraActual = segFinalJornadaWC - segHoraActual
							} else {
								trabajoHoraActual = 3600
							}
						}	
						if (trabajoHoraActual > trabajoPendiente){
							trabajoHoraActual = trabajoPendiente
						}
						oPersonWorkHour.CargaTrabajo += trabajoHoraActual
						trabajoPendiente -= trabajoHoraActual
					}
					segHoraActual += 3600
				}
			}.bind(this))
			
			this.set('/CapacityByHour', aCapacityByHour )
			
			//by sorting Person Work Loads, the current subtask construction will be suitable
			let fWorkSort = function(a, b) {
				if (a.Datum < b.Datum) return -1;
				if (a.Datum > b.Datum) return 1;
				if (a.SegInicio < b.SegInicio) return -1;
				if (a.SegInicio > b.SegInicio) return 1;
				return 0;
			}
			aPersonWC.forEach(function(aWCPersons){
				aWCPersons.forEach(function(oPersonLoad){
					oPersonLoad.Work.sort(fWorkSort)
				})
			})
			this.set('/PersonOnWC', aPersonWC)
		},
		
		onWorkGantVisibilityChange: function(oEvent){
			var oZoom = this._zoomStrategy2
			var sStartDate = this.get("/VisibleHorizonStartDate");
			var sEndDate = this.get("/VisibleHorizonEndDate");
			let iZoomLevel = oZoom.getZoomLevel()
			// console.log({sStartDate, sEndDate, oZoom})
			
			if ( oZoom.prevZoom !== undefined  && ( 
				iZoomLevel !== oZoom.prevZoom || 
				sStartDate.substr(0,8) !== oZoom.prevStartDate.substr(0,8) ||
				sEndDate.substr(0,8) !== oZoom.prevEndDate.substr(0,8)
			) ) {
				if (this.get('/ZoomLevel') !== iZoomLevel) this.set('/ZoomLevel', iZoomLevel)
				this.capacityDrawWithTimeout()
			}
			
		},
		
		drawPersonCapacity: function(){
			var oZoom = this._zoomStrategy2
			var iZoomLevel = oZoom.getZoomLevel()
			var sStartDate = this.get("/VisibleHorizonStartDate");
			var sEndDate = this.get("/VisibleHorizonEndDate");
			var aPersonOnWC = this.get('/PersonOnWC')
			var oCapacityGant = this.get('/CapacityGant')
			
			var oPreviusPLW = null
			var aPersonSubtask = []
			var oSubTask = {}
			var oPrevSubTask = null
			
			Object.keys(aPersonOnWC).forEach(function(WCKey){
				let aPersons = oCapacityGant.children.find(function (o) { return o.Arbpl === WCKey.substr(0,4) && o.Werks === WCKey.substr(5,); })
				if (!aPersons) return
				Object.keys(aPersonOnWC[WCKey]).forEach(function(perKey){
					let oPersonLoad = aPersonOnWC[WCKey][perKey]
					aPersonSubtask = []
					let aPerson = { 
						Pernr: oPersonLoad.Pernr,
						PersName: oPersonLoad.PersName,
						subtask: aPersonSubtask
					}
					aPersons.children.push(aPerson)
					oPersonLoad.Work.forEach(function(oPLW){
						if (iZoomLevel === 3) {
							oPLW.startTime = oPLW.Datum + (  Math.trunc( oPLW.SegInicio / 3600 ) ).toString().padStart(2, "0") + "0000"
							oPLW.endTime = oPLW.Datum + (  Math.trunc( oPLW.SegInicio / 3600 ) + 1 ).toString().padStart(2, "0") + "0000"
							if (oPLW.endTime.substr(8,2) === "24") oPLW.endTime = oPLW.endTime.substr(0,8) + "235959"
						}
						if (iZoomLevel === 2) {
							oPLW.startTime = oPLW.Datum + ( Math.trunc( oPLW.SegInicio / 43200 ) * 12 ).toString().padStart(2, "0") + "0000"
							oPLW.endTime = oPLW.Datum + ( ( Math.trunc( oPLW.SegInicio / 43200 ) + 1 ) * 12  ).toString().padStart(2, "0") + "0000"
							if (oPLW.endTime.substr(8,2) === "24") oPLW.endTime = oPLW.endTime.substr(0,8) + "235959"
						}
						if (iZoomLevel === 1) {
							oPLW.startTime = oPLW.Datum + "000000"
							oPLW.endTime = oPLW.Datum + "235959"
						}
						if (iZoomLevel === 0) {
							oPLW.startTime = oPLW.Datum.substring(0,6) + "01"
							oPLW.endTime = oPLW.Datum.substring(0,6) + new Date(oPLW.Datum.substring(0,4) , oPLW.Datum.substring(4,2) , 0).getDate();
						}
						
						//Solo el horizonte visible
						if ( oPLW.endTime.substr(0,8) < sStartDate.substr(0,8)  || oPLW.startTime.substr(0,8) > sEndDate.substr(0,8)  ) {
							return
						}
						
						if ( !oPrevSubTask || oPrevSubTask.startTime !== oPLW.startTime ){
							oSubTask = {
								startTime: oPLW.startTime,
								endTime: oPLW.endTime,
								SegundosDisponibles: oPLW.SegundosDisponibles,
								CargaTrabajo: oPLW.CargaTrabajo
							}
							aPersonSubtask.push(oSubTask)
		
						} else {
							oSubTask.SegundosDisponibles = oSubTask.SegundosDisponibles + oPLW.SegundosDisponibles
							oSubTask.CargaTrabajo = oSubTask.CargaTrabajo + oPLW.CargaTrabajo
						}
						oPrevSubTask = oSubTask 
						
						oSubTask.HorasDisp = (oSubTask.SegundosDisponibles / 3600)
						oSubTask.HorasDisp = oSubTask.HorasDisp % 1 === 0  ? oSubTask.HorasDisp.toFixed(0) : oSubTask.HorasDisp.toFixed(1)
						
						oSubTask.HorasCaga = (oSubTask.CargaTrabajo / 3600)
						oSubTask.HorasCaga = oSubTask.HorasCaga % 1 === 0  ? oSubTask.HorasCaga.toFixed(0) : oSubTask.HorasCaga.toFixed(1)
						
						oSubTask.title = oSubTask.HorasCaga + " / " + oSubTask.HorasDisp
						
						if (oSubTask.CargaTrabajo > oSubTask.SegundosDisponibles){
							oSubTask.fill = sOverWorkedWCColor
						} else if ( oSubTask.SegundosDisponibles === 0 ){
							oSubTask.fill = sNotWorkingWCColor  // Gris - No se trabaja
						} else if( oSubTask.CargaTrabajo / 0.75 > oSubTask.SegundosDisponibles  ) {
							oSubTask.fill = sHeavyWorkWCColor  // 75% --> Amarillo
						} else {
							oSubTask.fill = sLightWorkWCColor  // Verde
						}
					})
				})
			})
			
			this.set('/CapacityGant', oCapacityGant)
		},
		
		capacityDrawWithTimeout: function(){
			var iDrawCounter = this.get('/DrawCounter')
			if (!iDrawCounter) iDrawCounter = 0
			iDrawCounter = iDrawCounter + 1
			this.set('/DrawCounter', iDrawCounter );
			setTimeout(function(){
				if (this.get('/DrawCounter') === iDrawCounter) this.drawCapacity()
			}.bind(this), 500);

		},
		
		drawCapacity:function(){
			this._gantt2.setBusy(true)
			this.getCapacityByHour()
			this.getWorkLoad()
			//this.getPersonLoad()
			
			var oZoom = this._zoomStrategy2
			
			var iZoomLevel = oZoom.getZoomLevel()
			var sStartDate = this.get("/VisibleHorizonStartDate");
			var sEndDate = this.get("/VisibleHorizonEndDate");
			
			oZoom.prevZoom =  oZoom.getZoomLevel()
			oZoom.prevStartDate =  sStartDate
			oZoom.prevEndDate =  sEndDate
			
			var aCapacityByHour =  this.get('/CapacityByHour' )
			var aPersonOnWC =  this.get('/PersonOnWC')
			
			var oCapacityGant = { children : [] }
			
			var oPreviusCA = null
			var oChildren = {}
			var aSubtask = []
			var aPerson = []
			var oSubTask = {}
			var oPrevSubTask = null

			aCapacityByHour.forEach( function(oCA){
				
				//Añado los WC (La lista esta ordenada)
				if ( !oPreviusCA || oPreviusCA.Arbpl !== oCA.Arbpl){
					aSubtask = []
					oChildren = { 
						Werks : oCA.Werks,
						Arbpl: oCA.Arbpl,
						subtask: aSubtask,
						children: []
					}
					oCapacityGant.children.push(oChildren)
				}
				oPreviusCA = oCA
				
				if (iZoomLevel === 3) {
					oCA.startTime = oCA.Datum + (  Math.trunc( oCA.SegInicio / 3600 ) ).toString().padStart(2, "0") + "0000"
					oCA.endTime = oCA.Datum + (  Math.trunc( oCA.SegInicio / 3600 ) + 1 ).toString().padStart(2, "0") + "0000"
					if (oCA.endTime.substr(8,2) === "24") oCA.endTime = oCA.endTime.substr(0,8) + "235959"
				}
				if (iZoomLevel === 2) {
					oCA.startTime = oCA.Datum + ( Math.trunc( oCA.SegInicio / 43200 ) * 12 ).toString().padStart(2, "0") + "0000"
					oCA.endTime = oCA.Datum + ( ( Math.trunc( oCA.SegInicio / 43200 ) + 1 ) * 12  ).toString().padStart(2, "0") + "0000"
					if (oCA.endTime.substr(8,2) === "24") oCA.endTime = oCA.endTime.substr(0,8) + "235959"
				}
				if (iZoomLevel === 1) {
					oCA.startTime = oCA.Datum + "000000"
					oCA.endTime = oCA.Datum + "235959"
				}
				if (iZoomLevel === 0) {
					oCA.startTime = oCA.Datum.substring(0,6) + "01"
					oCA.endTime = oCA.Datum.substring(0,6) + new Date(oCA.Datum.substring(0,4) , oCA.Datum.substring(4,2) , 0).getDate();
				}
				
				//Solo el horizonte visible
				if ( oCA.endTime.substr(0,8) < sStartDate.substr(0,8)  || oCA.startTime.substr(0,8) > sEndDate.substr(0,8)  ) {
					return
				}

				if ( !oPrevSubTask || oPrevSubTask.startTime !== oCA.startTime ){
					oSubTask = {
						startTime: oCA.startTime,
						endTime: oCA.endTime,
						SegundosDisponibles: oCA.SegundosDisponibles,
						CargaTrabajo: oCA.CargaTrabajo
					}
					aSubtask.push(oSubTask)

				} else {
					oSubTask.SegundosDisponibles = oSubTask.SegundosDisponibles + oCA.SegundosDisponibles
					oSubTask.CargaTrabajo = oSubTask.CargaTrabajo + oCA.CargaTrabajo
				}

				oPrevSubTask = oSubTask 
				
				oSubTask.HorasDisp = (oSubTask.SegundosDisponibles / 3600)
				oSubTask.HorasDisp = oSubTask.HorasDisp % 1 === 0  ? oSubTask.HorasDisp.toFixed(0) : oSubTask.HorasDisp.toFixed(1)
				
				oSubTask.HorasCaga = (oSubTask.CargaTrabajo / 3600)
				oSubTask.HorasCaga = oSubTask.HorasCaga % 1 === 0  ? oSubTask.HorasCaga.toFixed(0) : oSubTask.HorasCaga.toFixed(1)
				
				oSubTask.title = oSubTask.HorasCaga + " / " + oSubTask.HorasDisp
				
				if (oSubTask.CargaTrabajo > oSubTask.SegundosDisponibles){
					oSubTask.fill = sOverWorkedWCColor
				} else if ( oSubTask.SegundosDisponibles === 0 ){
					oSubTask.fill = sNotWorkingWCColor  // Gris - No se trabaja
				} else if( oSubTask.CargaTrabajo / 0.75 > oSubTask.SegundosDisponibles  ) {
					oSubTask.fill = sHeavyWorkWCColor  // 75% --> Amarillo
				} else {
					oSubTask.fill = sLightWorkWCColor  // Verde
				}

			}.bind(this))
			var oCanlendarDefs = {}
			oCapacityGant.children.map(oWorkCenter=>{
				oCanlendarDefs[oWorkCenter.Arbpl] = []
				oWorkCenter.subtask.map(oPeriod=>{
					if (oPeriod.SegundosDisponibles === 0){
						oCanlendarDefs[oWorkCenter.Arbpl].push(oPeriod)
					}
				})
			})
			this.set('/CanlendarDefs', oCanlendarDefs)
			this.set('/CapacityGant', oCapacityGant)
			//this.drawPersonCapacity()
			
			this._gantt2.setBusy(false)
		},
		
		updateOperationsDates: function (order, path, miliseconds) {
			/*order.Operations.forEach(function (oo) {
				var startDate = formatter.fnTimeConverter(oo.StartDate);            	
				var endDate = formatter.fnTimeConverter(oo.EndDate);
				var oNewDateTime = new Date(startDate.getTime() + miliseconds);
				var oNewEndDateTime = new Date(endDate.getTime() + miliseconds);
				oo.StartDate = formatter.abapDateTime(oNewDateTime);
				oo.EndDate = formatter.abapDateTime(oNewEndDateTime);
			});
			this.set(path, order);*/
		},
		
		openOperationRelations: function() {
		
			var oView = this.getView();
			
			if (!this._pOperationRelations){
				this._pOperationRelations = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.OperationRelations",
					controller: this
				}).then(function(oDialog){
					oView.addDependent(oDialog);
					oDialog.setModel(this.oJSONModel);
					return oDialog;
				}.bind(this));
			}
			this._pOperationRelations.then(function(oDialog){
				oDialog.open();
			}.bind(this));
		},
		
		closeOperationsRelations: function () {
			this.byId("OperationsRelation").close();
		},
		
		openMassDateChange: function() {
			this.set("/MassDayDelta", "0");
			this.set("/MassHourDelta", "0");
			this.set("/MassMinuteDelta", "0");
			this.set("/MassStartDate", "");
			this.set("/MassEndDate", "");
			
			var oView = this.getView();
			
			if (!this._pMassDateChange){
				this._pMassDateChange = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.DateMassChange",
					controller: this
				}).then(function(oDialog){
					oView.addDependent(oDialog);
					oDialog.setModel(this.oJSONModel);
					return oDialog;
				}.bind(this));
			}
			this._pMassDateChange.then(function(oDialog){
				oDialog.open();
			}.bind(this));
		},
		
		closeMassDateChange: function () {
			this.byId("MassDateChange").close();
		},
		
		getChangedData: function () {
			var ordersSelected = this.get("/Selections/Orders");
			var ordersGantt = this.get("/OrdersGantt");
			var relations = this.get("/Relationships");
			var changeData = {
				aOrder: [],
				aOperation: [],
				aRelation: []
			};
			
			ordersSelected.forEach(function (os) {
				var orderChanged = {};
				var orderGantt = ordersGantt.find(function (og) { return og.Orderid === os.Orderid; });
				
				if (orderGantt) {
					if (os.StartDate !== orderGantt.StartDate.substr(0,8)) {
						orderChanged.StartDate = orderGantt.StartDate.substr(0,8);
					}
					if (formatter.correctTime(os.BasicStart) !== orderGantt.StartDate.substr(8,6)) {
						orderChanged.BasicStart = orderGantt.StartDate.substr(8,6);
					}
					if (os.FinishDate !== orderGantt.EndDate.substr(0,8)) {
						orderChanged.FinishDate = orderGantt.EndDate.substr(0,8);
					}
					if (formatter.correctTime(os.BasicFin) !== orderGantt.EndDate.substr(8,6)) {
						orderChanged.BasicFin = orderGantt.EndDate.substr(8,6);
					}
					
					if (Object.keys(orderChanged).length) {
						orderChanged.Orderid = os.Orderid;
						changeData.aOrder.push(orderChanged);
					}
					
					os.OrderOperationSet.results.forEach(function (oso) {
						var operationChanged = {};
						var operationGantt = orderGantt.Operations.find(function (ogo) { return ogo.Activity === oso.Activity && ogo.SubActivity === oso.SubActivity; });
						
						if (operationGantt) {
							if (oso.StartCons !== operationGantt.StartDate.substr(0,8) && oso.EarlSchedStartDate !== operationGantt.StartDate.substr(0,8)) {
								operationChanged.StartCons = operationGantt.StartDate.substr(0,8);
								if (operationGantt.StartDate !== "00000000000000") {
									operationGantt.ConstraintTypeStart = "1";
								}
							}
							if (formatter.correctTime(oso.StrtTimCon) !== operationGantt.StartDate.substr(8,6) && formatter.correctTime(oso.EarlSchedStartTime) !== operationGantt.StartDate.substr(8,6)) {
								operationChanged.StrtTimCon = operationGantt.StartDate.substr(8,6);
								if (operationGantt.StartDate !== "00000000000000") {
									operationGantt.ConstraintTypeStart = "1";
								}
							}
							if (oso.FinCons !== operationGantt.EndDate.substr(0,8) && oso.EarlSchedFinDate !== operationGantt.EndDate.substr(0,8)) {
								operationChanged.FinCons = operationGantt.EndDate.substr(0,8);
								if (operationGantt.EndDate !== "00000000000000") {
									operationGantt.ConstraintTypeFinish = "1";
								}
							}
							if (formatter.correctTime(oso.FinTimCons) !== operationGantt.EndDate.substr(8,6) && formatter.correctTime(oso.EarlSchedFinTime) !== operationGantt.EndDate.substr(8,6)) {
								operationChanged.FinTimCons = operationGantt.EndDate.substr(8,6);
								if (operationGantt.EndDate !== "00000000000000") {
									operationGantt.ConstraintTypeFinish = "1";
								}
							}
							
							if (oso.ConstraintTypeStart !== operationGantt.ConstraintTypeStart) {
								operationChanged.ConstraintTypeStart = operationGantt.ConstraintTypeStart;
							}
							
							if (oso.ConstraintTypeFinish !== operationGantt.ConstraintTypeFinish) {
								operationChanged.ConstraintTypeFinish = operationGantt.ConstraintTypeFinish;
							}
							
							if (Object.keys(operationChanged).length) {
								operationChanged.Number = oso.Orderid;
								operationChanged.Orderid = oso.Orderid;
								operationChanged.Activity = oso.Activity;
								operationChanged.SubActivity = oso.SubActivity
								changeData.aOperation.push(operationChanged);
							}
						}
					});
					
					//Check relations to delete
					os.OrderRelationSet.results.forEach(function (osr) {
						var relationChanged = {};
						var id = osr.OrderPredecessor + "-" + osr.OperationPredecessor + "-" + osr.OrderSuccessor + "-" + osr.OperationSuccessor;
						var relationGantt = relations.find(function (r) {
							var relationFormattedToSAP = formatter.relationTypeToSAP(r.RelationType);
							return id === r.ObjectID && osr.RelationType === relationFormattedToSAP;
						});
						
						if (!relationGantt) {
							relationChanged.RelationType = osr.RelationType;
							relationChanged.Orderid = osr.Orderid;
							relationChanged.OrderPredecessor = osr.OrderPredecessor;
							relationChanged.OperationPredecessor = osr.OperationPredecessor;
							relationChanged.OrderSuccessor = osr.OrderSuccessor;
							relationChanged.OperationSuccessor = osr.OperationSuccessor;
							relationChanged.Method = "DELETE";
							changeData.aRelation.push(relationChanged);
						}
					});
					
					relations.forEach(function (r) {
						var relationChanged = {};
						var relationOrderid = r.PredecTaskID.split("-")[0];
						
						if (os.Orderid === relationOrderid) {
							var relationFormattedToSAP = formatter.relationTypeToSAP(r.RelationType);
							var relationOrder = os.OrderRelationSet.results.find(function (osr) {
								var id = osr.OrderPredecessor + "-" + osr.OperationPredecessor + "-" + osr.OrderSuccessor + "-" + osr.OperationSuccessor;
								return id === r.ObjectID && osr.RelationType === relationFormattedToSAP;
							});
							
							
							if (!relationOrder) {
								relationChanged.RelationType = relationFormattedToSAP;
								relationChanged.Orderid = r.PredecTaskID.split("-")[0];
								relationChanged.OrderPredecessor = r.PredecTaskID.split("-")[0];
								relationChanged.OperationPredecessor = r.PredecTaskID.split("-")[1];
								relationChanged.OrderSuccessor = r.SuccTaskID.split("-")[0];
								relationChanged.OperationSuccessor = r.SuccTaskID.split("-")[1];
								relationChanged.DurationRelation = r.DurationRelation;
								relationChanged.DurationRelationUnit = r.DurationRelationUnit;
								relationChanged.Method = "CREATE";
								changeData.aRelation.push(relationChanged);
							} else {
								if (relationOrder.DurationRelation !== parseFloat(r.DurationRelation).toFixed(1)) {
									relationChanged.DurationRelation = r.DurationRelation;
								}
								if (relationOrder.DurationRelationUnit !== r.DurationRelationUnit) {
									relationChanged.DurationRelationUnit = r.DurationRelationUnit;
								}
								
								if (Object.keys(relationChanged).length) {
									relationChanged.RelationType = relationFormattedToSAP;
									relationChanged.Orderid = relationOrder.Orderid;
									relationChanged.OrderPredecessor = relationOrder.OrderPredecessor;
									relationChanged.OperationPredecessor = relationOrder.OperationPredecessor;
									relationChanged.OrderSuccessor = relationOrder.OrderSuccessor;
									relationChanged.OperationSuccessor = relationOrder.OperationSuccessor;
									relationChanged.Method = "CHANGE";
									changeData.aRelation.push(relationChanged);
								}
							}
						}
					});
				}
			});
			
			return changeData;	
		},
		
		updateGanttOrders: function () {
			var that = this;
			var changedData = this.getChangedData();
			
			if ( !changedData.aOrder.length && !changedData.aOperation.length && !changedData.aRelation.length){
				sap.m.MessageToast.show(this.getText('NOTHING_CHANGE'))
				return
			}
			
			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.setBusy(true, "appView" );
			
			var aPendingPromises = oDataAction.saveOrdesChanges.call(this, changedData )          
			Promise.allSettled(aPendingPromises).then(function(){
				
				this.openMessagePopover()
				
				var dfd = this.refreshOrderList(changedData.aOrder);
				dfd.finally(function () {
					that.setGanttData();
					this.setBusy(false, "appView" );
				}.bind(this));
			}.bind(this)).catch(function(){
				var dfd = this.refreshOrderList(changedData.aOrder);
				dfd.finally(function () {
					that.setGanttData();
					this.setBusy(false, "appView" );
				}.bind(this));
			}.bind(this))
		},
		
		createOperationsRelations: function (relationType, relationTimeUnit, relationTime, operations) {
			var that = this;
			
			var relationships = this.get("/Relationships");
			
			var lastItem = operations.length;
			var countItem = 0;
			var predecessorOpEndDate = formatter.fnTimeConverter(operations[0].Operation.EndDate);
			operations.forEach(function (oo) {
				countItem++;
				
				if (countItem > 1) {
					switch (relationTimeUnit) {
						case "TAG": predecessorOpEndDate.setDate(predecessorOpEndDate.getDate() + parseInt(relationTime));
							break;
						case "WK": predecessorOpEndDate.setDate(predecessorOpEndDate.getDate() + (7 * parseInt(relationTime)));
							break;
						case "MON": predecessorOpEndDate.setMonth(predecessorOpEndDate.getMonth() + parseInt(relationTime));
							break;
						case "H": predecessorOpEndDate.setTime(predecessorOpEndDate.getTime() + (parseInt(relationTime) * 3600000));
							break;
						case "MIN": predecessorOpEndDate.setTime(predecessorOpEndDate.getTime() + (parseInt(relationTime) * 60000));
							break;
					}
					
					var miliSecondsDifference = formatter.fnTimeConverter(oo.Operation.EndDate) - formatter.fnTimeConverter(oo.Operation.StartDate);
					//oo.Operation.StartDate = formatter.abapDateTime(predecessorOpEndDate);
					predecessorOpEndDate = new Date(predecessorOpEndDate.getTime() + miliSecondsDifference);
					//oo.Operation.EndDate = formatter.abapDateTime(predecessorOpEndDate);
					that.set(oo.Path, oo.Operation);
				}
				
				/*if (countItem === lastItem) {
					var pathSplit = oo.Path.split("/");
					pathSplit.pop();
					pathSplit.pop();
					var orderPath = "/OrdersGantt/" + pathSplit.pop();
					that.set(orderPath + "/EndDate", oo.Operation.EndDate);
				}*/
				
				if (countItem !== lastItem) {
					var id = oo.Operation.ObjectID + "-" + operations[countItem].Operation.ObjectID;//NO SE CONTEMPLA SUBOPERATION
					var relationExist = relationships.find(function (r) { return r.ObjectID === id; });
					var newRelation = relationExist ? relationExist : {};
					if (oo.Operation.ParentObjectID != operations[countItem].Operation.ParentObjectID) return
					
					newRelation.ObjectID = id;
					newRelation.RelationID = id;
					newRelation.ParentObjectID = oo.Operation.ObjectID;
					newRelation.PredecTaskID = oo.Operation.ObjectID;
					newRelation.SuccTaskID = operations[countItem].Operation.ObjectID;
					newRelation.RelationType = relationType;
					newRelation.shapeTypeStart = "VerticalRectangle";
					newRelation.shapeTypeEnd = "Diamond";
					newRelation.DurationRelationUnit = relationTimeUnit;
					newRelation.DurationRelation = relationTime;
					
					if (!relationExist) {
						relationships.push(newRelation);
					}
				}
			});
			
			this.set("/Relationships", relationships);
			this.updateGanttOrders();
		},
		
		// EVENTS
		
		onChange: function () {
			this.updateGanttOrders();
		},
		
		// pasted function from
		
		onGanttChange: function (oEvent) {
			//this.clearFilters()
			this.getSelection();
			var oSelections = this.get('/Selections')
			if (oSelections.Orders.length === 0) {
				sap.m.MessageToast.show(this.getText('NOTHING_SELECTED'))
				return
			}
			if (oSelections.Operations.length > 0){
				this.set('/ObjectTab', 'operation')
			} else {
				this.set('/ObjectTab', 'order')
			}
			
			this.openChangeDialog(this.affterChangeDialogSave.bind(this));

		},
		
		affterChangeDialogSave: function (oChangeData) {
			this.openMessagePopover()
			this.onRefreshAll().finally(function () {
				this.byId("ChangeDialog").setBusy(false);
				this.byId("ChangeDialog").close();
			}.bind(this))
		},
		
		getSelection: function () {
			var orderSelected = this.get("/Selections/Orders");
			var operationsSelected = [];
			var treeTable = this._treeTableGantt
			var selectedIndices = treeTable.getSelectedIndices();
			var oSelected = {
				Orders: [],
				Operations: []
			}
			orderSelected.forEach(function (order) {
				order.OrderOperationSet.results.forEach(function (operation) {
					operationsSelected.push(operation);
				});
			});
			for (var i = 0; i < selectedIndices.length; i++) {
				var path = treeTable.getContextByIndex(selectedIndices[i]).getPath();
				var actualObject = treeTable.getContextByIndex(selectedIndices[i]).getObject();
				if (actualObject.Activity) {
					oSelected.Operations.push(operationsSelected.find(function (o) { return o.Orderid === actualObject.ParentObjectID && o.Activity === actualObject.Activity && o.SubActivity === actualObject.SubActivity; }));
					var orderFound = orderSelected.find(function (o) { return o.Orderid === actualObject.ParentObjectID; });
					if (orderFound && !oSelected.Orders.find(function (o) { return o.Orderid === orderFound.Orderid; }))
						oSelected.Orders.push(orderFound);
				}else if (! oSelected.Orders.find(function (o) { return o.Orderid === actualObject.Orderid; })){
					oSelected.Orders.push(orderSelected.find(function (o) { return o.Orderid === actualObject.Orderid; }));
				}
			}
			
			this.set('/Selections', oSelected);
		},
		
		onExpandAll: function () {
			var oTableGantt = this._gantt1
			var oTable = oTableGantt.getTable();
			oTable.selectAll();
			oTable.expand(oTable.getSelectedIndices());
			oTable.clearSelection();
		},
		
		onCollapseAll: function () {
			var oTableGantt = this._gantt1
			var oTable = oTableGantt.getTable();
			oTable.collapseAll();	
		},
		
		onGoToDate: function () {
			var dateToGo = this.get("/StartDateGanttVisible");
			if (dateToGo) {
				var dateEnd = new Date(dateToGo.getFullYear(), dateToGo.getMonth(), dateToGo.getDate() + 7);
				this.set("/VisibleHorizonStartDate", formatter.abapDateTime(dateToGo));
				this.set("/VisibleHorizonEndDate", formatter.abapDateTime(dateEnd));
			}
		},
		
		onGoToObject: function (oEvent) {
			this._clicks++;
			var objectSelected = oEvent.getSource().mBindingInfos.text.binding.oContext.getObject();
			var path = oEvent.getSource().mBindingInfos.text.binding.oContext.getPath();
			if (this._clicks === 1) {
				this.set('/objectSelected', objectSelected)
				this.goToObjectSelected(objectSelected)
			} else if (this._clicks > 1) {
				if (objectSelected?.Operations?.length > 1) {
					var operations = [];
					var counter = 0;
					objectSelected.Operations.forEach(function (oo) {
						operations.push({Path: path + "/Operations/" + counter.toString(), Operation: oo });
						counter++;
					});
					// this.createOperationsRelations("FinishToStart", "H", 0, operations);
					
					this.set("/OperationsSelected", operations);
					this.set("/RelationTypeSelected", "FinishToStart");
					this.set("/RelationTimeUnitSelected", "H");
					this.set("/RelationTime", "0");
					this.set("/RelationInputVisible", true)
					this.openOperationRelations();
				
				}
			}
			setTimeout(function () {
				this.clearClicks();
			}.bind(this), 500);
		},
		
		clearClicks: function () {
			this._clicks = 0;	
		},
		
		goToObjectSelected: function(objectSelected){
			if (!objectSelected.StartDate || !objectSelected.EndDate ) return
			let sStart = objectSelected.StartDate,
				sEnd = objectSelected.EndDate
			if (sStart>=sEnd) sEnd = (parseInt(sStart) + 1).toString()
			this.set("/VisibleHorizonStartDate", sStart);
			this.set("/VisibleHorizonEndDate", sEnd);
		},
		
		onTreeTableDateChanges: function (oEvent) {
			var objectChanged = oEvent.getSource().mBindingInfos.value.binding.oContext.getObject();
			var sPath = oEvent.getSource().mBindingInfos.value.binding.oContext.sPath;
			var fieldPath = oEvent.getSource().mBindingInfos.value.binding.sPath;
			
			if (objectChanged.Orderid) {
				var orderSelected = this.get("/Selections/Orders");
				var orderFound = orderSelected.find(function (o) { return o.Orderid === objectChanged.Orderid; });
				if (orderFound) {
					var moveMiliseconds;
					if (fieldPath === "StartDate") {
						var orderFoundStartDate = formatter.fnTimeConverter(formatter.correctDate(orderFound.StartDate + orderFound.BasicStart));
						var orderChangedStartDate = formatter.fnTimeConverter(objectChanged.StartDate);
						moveMiliseconds = orderChangedStartDate.getTime() - orderFoundStartDate.getTime();
						objectChanged.EndDate = formatter.abapDateTime(new Date(formatter.fnTimeConverter(objectChanged.EndDate).getTime() + moveMiliseconds));
					} else if (fieldPath === "EndDate") {
						var orderFoundEndDate = formatter.fnTimeConverter(formatter.correctDate(orderFound.FinishDate + orderFound.BasicStart));
						var orderChangedEndDate = formatter.fnTimeConverter(objectChanged.EndDate);
						moveMiliseconds = orderChangedEndDate.getTime() - orderFoundEndDate.getTime();
						objectChanged.StartDate = formatter.abapDateTime(new Date(formatter.fnTimeConverter(objectChanged.StartDate).getTime() + moveMiliseconds));
					}
					this.updateOperationsDates(objectChanged, sPath, moveMiliseconds);
				}
			}
			this.updateGanttOrders();	
		},
		
		
		onDeleteLinkOperations: function () {
			var that = this;
			var treeTable = this._treeTableGantt
			var selectedIndices = treeTable.getSelectedIndices();
			//var rows = treeTable.getRows();
			var relations = this.get("/Relationships");
			
			for (var i = 0; i < selectedIndices.length; i++) {
				//var path = rows[selectedIndices[i]].oBindingContexts.mGlobal.getPath();
				//var actualObject = that.get(path);
				var actualObject = treeTable.getContextByIndex(selectedIndices[i]).getObject();
				relations = relations.filter(function (r) { return r.ParentObjectID !== actualObject.ObjectID});
			}
			
			this.set("/Relationships", relations);
			
			this.updateGanttOrders();
		},
		
		onLinkOperations: function () {
			var that = this;
			var treeTable = this._treeTableGantt
			var selectedIndices = treeTable.getSelectedIndices();
			//var rows = treeTable.getRows();
			var operationsSelected = [];
			
			var countOp = 0;
			for (var i = 0; i < selectedIndices.length; i++) {
				var path = treeTable.getContextByIndex(selectedIndices[i]).getPath();
				//var path = rows[selectedIndices[i]].oBindingContexts.mGlobal.getPath();
				var actualObject = treeTable.getContextByIndex(selectedIndices[i]).getObject();
				//var actualObject = that.get(path);
				if (actualObject.Activity && actualObject.Connectable) {
					countOp++;
					operationsSelected.push({Operation: actualObject, Path: path});
				}
			}
			
			if (countOp > 1) {
				this.set("/OperationsSelected", operationsSelected);
				this.set("/RelationTypeSelected", "FinishToStart");
				this.set("/RelationTimeUnitSelected", "H");
				this.set("/RelationTime", "0");
				this.set("/RelationInputVisible", true)
				this.openOperationRelations();
			} else {
				sap.m.MessageToast.show(this.getText("ErrorOpenOperationRelations"))
				return
			}
		},
		
		onOperationsRelationsSave: function () {
			var relationType = this.get("/RelationTypeSelected") ? this.get("/RelationTypeSelected") : "FinishToStart";
			var relationTimeUnit = this.get("/RelationTimeUnitSelected") ? this.get("/RelationTimeUnitSelected") : "H";
			var relationTime = this.get("/RelationTime") ? this.get("/RelationTime"): 0;
			var operations = this.get("/OperationsSelected");
			
			this.createOperationsRelations(relationType, relationTimeUnit, relationTime, operations);
			this.closeOperationsRelations();
		},
		
		onOperationsRelationsClose: function () {
			this.closeOperationsRelations();	
		},
		
		onMassDateOpen: function () {
			this.openMassDateChange();	
		},
		
		onMassDateSave: function () {
			var massStartDate = this.get("/MassStartDate");
			var massEndDate = this.get("/MassEndDate");
			var massDayDelta = this.get("/MassDayDelta") ? this.get("/MassDayDelta") : 0;
			var massHourDelta = this.get("/MassHourDelta") ? this.get("/MassHourDelta") : 0;
			var massMinuteDelta = this.get("/MassMinuteDelta") ? this.get("/MassMinuteDelta") : 0;
			var treeTable = this._treeTableGantt
			var selectedIndices = treeTable.getSelectedIndices();
			
			for (var i = 0; i < selectedIndices.length; i++) {
				var path = treeTable.getContextByIndex(selectedIndices[i]).getPath();
				var actualObject = treeTable.getContextByIndex(selectedIndices[i]).getObject();
				
				actualObject.StartDate = massStartDate ? massStartDate : actualObject.StartDate;	
				actualObject.EndDate = massEndDate ? massEndDate : actualObject.EndDate;
				
				var dateStartDate = formatter.fnTimeConverter(actualObject.StartDate);                         
				var dateEndDate = formatter.fnTimeConverter(actualObject.EndDate);
				
				dateStartDate.setDate(dateStartDate.getDate() + parseInt(massDayDelta));
				dateStartDate.setHours(dateStartDate.getHours() + parseInt(massHourDelta));
				dateStartDate.setMinutes(dateStartDate.getMinutes() + parseInt(massMinuteDelta));
				
				dateEndDate.setDate(dateEndDate.getDate() + parseInt(massDayDelta));
				dateEndDate.setHours(dateEndDate.getHours() + parseInt(massHourDelta));
				dateEndDate.setMinutes(dateEndDate.getMinutes() + parseInt(massMinuteDelta));
				
				actualObject.StartDate = formatter.abapDateTime(dateStartDate);	
				actualObject.EndDate = formatter.abapDateTime(dateEndDate);
				
				this.set(path, actualObject);
			}
			
			this.closeMassDateChange();
			this.updateGanttOrders();
		},
		
		onMassDateClose: function () {
			this.closeMassDateChange();	
		},
		
		// Gantt EVENTS
		
		onShapeDoubleClick: function (oEvent) {
			var objectSelected = oEvent.getParameter("shape").mBindingInfos.shapeId.binding.oContext.getObject();
			var path = oEvent.getParameter("shape").mBindingInfos.shapeId.binding.oContext.sPath;
			if (objectSelected.Orderid) {
				var operations = [];
				var counter = 0;
				objectSelected.Operations.forEach(function (oo) {
					operations.push({Path: path + "/Operations/" + counter.toString(), Operation: oo });
					counter++;
				});
				this.createOperationsRelations("FinishToStart", "H", 0, operations);
			}
		},
		
		onShapeDrop: function(oEvent) {
			var that = this;
			var oTableGantt = this._gantt1
			var oDataModel = oTableGantt.getModel("mGlobal");
			var oNewDateTime = oEvent.getParameter("newDateTime");
			var oDraggedShapeDates = oEvent.getParameter("draggedShapeDates");
			var sLastDraggedShapeUid = oEvent.getParameter("lastDraggedShapeUid");
			var oOldStartDateTime = oDraggedShapeDates[sLastDraggedShapeUid].time;
			var oOldEndDateTime = oDraggedShapeDates[sLastDraggedShapeUid].endTime;
			var iMoveWidthInMs = oNewDateTime.getTime() - oOldStartDateTime.getTime();
			if (oTableGantt.getGhostAlignment() === sap.gantt.dragdrop.GhostAlignment.End) {
				iMoveWidthInMs = oNewDateTime.getTime() - oOldEndDateTime.getTime();
			}

			var getBindingContextPath = function (sShapeUid) {
				var oParsedUid = sap.gantt.misc.Utility.parseUid(sShapeUid);
				return oParsedUid.shapeDataName;
			};

			var itemsCount = Object.keys(oDraggedShapeDates).length;
			Object.keys(oDraggedShapeDates).forEach(function (sShapeUid) {
				var sPath = getBindingContextPath(sShapeUid);
				var oOldDateTime = oDraggedShapeDates[sShapeUid].time;
				var oOldEndDateTime = oDraggedShapeDates[sShapeUid].endTime;
				var oNewDateTime = new Date(oOldDateTime.getTime() + iMoveWidthInMs);
				var oNewEndDateTime = new Date(oOldEndDateTime.getTime() + iMoveWidthInMs);
				oDataModel.setProperty(sPath + "/StartDate", formatter.abapDateTime(oNewDateTime), true);
				oDataModel.setProperty(sPath + "/EndDate", formatter.abapDateTime(oNewEndDateTime), true);
				
				var objectData = oDataModel.getProperty(sPath);
				that.set('/objectSelected', objectData)
				
				var operationDateRestricted = false;
				
				if (objectData.Orderid) {
					objectData.Operations.forEach(function(oo) {
						operationDateRestricted = oo.DatesRestriction ? oo.DatesRestriction : operationDateRestricted;
					});
				}
				if (objectData.Orderid && itemsCount === 1 && !operationDateRestricted) {
					that.updateOperationsDates(objectData, sPath, iMoveWidthInMs)
				}
			});
			
			this.updateGanttOrders();
		},
		
		onShapeResize: function(oEvent) {
			var oShape = oEvent.getParameter("shape");
			var aNewTime = oEvent.getParameter("newTime");
			var sBindingPath = oShape.getBindingContext("mGlobal").getPath();
			var oTableGantt = this._gantt1
			var oDataModel = oTableGantt.getModel("mGlobal");
			oDataModel.setProperty(sBindingPath + "/StartDate", formatter.abapDateTime(aNewTime[0]), true);
			oDataModel.setProperty(sBindingPath + "/EndDate", formatter.abapDateTime(aNewTime[1]), true);
			
			this.updateGanttOrders();
		},
		
		onRemoveConstraints: function(){
			var treeTable = this._treeTableGantt
			var selectedIndices = treeTable.getSelectedIndices();
			var operationsSelected = [];
			
			var countOp = 0;
			for (var i = 0; i < selectedIndices.length; i++) {
				var path = this._treeTableGantt.getContextByIndex(selectedIndices[i]).getPath();
				var actualObject = this._treeTableGantt.getContextByIndex(selectedIndices[i]).getObject();
				if (actualObject.Activity) {
					if (actualObject.ConstraintTypeStart || actualObject.ConstraintTypeFinish){
						countOp++
						this.deleteOperationConstraint(actualObject)
					}
				}
			}
			if (countOp) this.updateGanttOrders()
		},
		
		deleteOperationConstraint: function(oOperation){
			oOperation.StartDate = "00000000000000";
			oOperation.EndDate = "00000000000000";
			oOperation.DatesRestriction = false;
			oOperation.ConstraintTypeFinish = "";
			oOperation.ConstraintTypeStart = "";
			oOperation.StrokeColor = "";
			oOperation.StrokeWidth = 0;
			oOperation.StrokeDash = "";
		},
		
		openContextMenu: function(){
			var oView = this.getView();
			
			if (!this._pContextMenu){
				this._pContextMenu = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.ContextMenu",
					controller: this
				}).then(function(oMenu){
					// oView.addDependent(oMenu)
					// oMenu.setModel(this.oJSONModel)
					this.oContextMenu = oMenu
					return oMenu
				}.bind(this))
			}
			
			return this._pContextMenu
		},
		
		
		
		itemSelectedShapeContextMenu: function(oEvent){
			var oItem = oEvent.getParameter("item");
			var oParent = oItem.getParent();
			
			var clearIcon = function (oParent) {
				oParent.getItems().forEach(function (oItem) { oItem.setIcon(""); });
			};
			clearIcon(oParent);

			var oShape = this.oContextMenuShape.selectedShape;
			var sShapeId = oShape.getShapeId();
			var aOrders = this.get("/OrdersGantt");
			
			if (oItem.getText() === "Delete constraint") {
				aOrders.forEach(function (oOrder) {
					oOrder.Operations.forEach(function (oOperation) {
						if (oOperation.ObjectID === sShapeId && (oOperation.ConstraintTypeStart || oOperation.ConstraintTypeFinish) ) {
							this.deleteOperationConstraint(oOperation)
						}
					}.bind(this));	
				}.bind(this));
				this.set("/OrdersGantt", aOrders);
			}
			this.updateGanttOrders()
			this.oContextMenuShape.close();
		},
		
		onShapeContextMenu: function(oEvent) {
			var oShape = oEvent.getParameter("shape");
			var iPageX = oEvent.getParameter("pageX");
			var iPageY = oEvent.getParameter("pageY");
			
			if (!this.oContextMenuShape) {
				let aItems = [ 	new sap.m.MenuItem({ text: "Delete constraint", icon: "" }) ]
				this.oContextMenuShape = new sap.m.Menu({
					items: aItems,
					itemSelected: this.itemSelectedShapeContextMenu.bind(this)
				});
			}

			if (oShape instanceof Relationship) {
				var sType = oShape.getType();
				var pContMenu = this.openContextMenu()
				pContMenu.then(function(){
					this.oContextMenu.getItems()[1].getItems().filter(function (item) { return item.getText() == sType; })[0].setIcon("sap-icon://accept");
					this.oContextMenu.selectedShape = oShape;
					var oPlaceHolder = new sap.m.Label();
					var oPopup = new sap.ui.core.Popup(oPlaceHolder, false, true, false);
					var eDock = sap.ui.core.Popup.Dock;
					var sOffset = (iPageX + 1) + " " + (iPageY + 1);
					oPopup.open(0, eDock.BeginTop, eDock.LeftTop, null , sOffset);
					this.oContextMenu.openBy(oPlaceHolder);
				}.bind(this))
				
			}
			
			if (oShape instanceof sap.gantt.simple.BaseRectangle) {
				this.oContextMenuShape.selectedShape = oShape;
				var oPlaceHolder = new sap.m.Label();
				var oPopup = new sap.ui.core.Popup(oPlaceHolder, false, true, false);
				var eDock = sap.ui.core.Popup.Dock;
				var sOffset = (iPageX + 1) + " " + (iPageY + 1);
				oPopup.open(0, eDock.BeginTop, eDock.LeftTop, null , sOffset);
				this.oContextMenuShape.openBy(oPlaceHolder);
			}
		},
		
		onItemSelectedContextMenu: function(oEvent){
			var oItem = oEvent.getParameter("item");
			var oParent = oItem.getParent();
			var clearIcon = function (oParent) {
				oParent.getItems().forEach(function (oItem) { oItem.setIcon(""); });
			};
			clearIcon(oParent);

			var oShape = this.oContextMenu.selectedShape;
			var sShapeId = oShape.getShapeId();
			var relationships = this.get("/Relationships");
			if (oItem.getText() === "Delete") {
				relationships = relationships.filter(function (r) { return r.RelationID !== sShapeId; });
				this.set("/Relationships", relationships);
								this.updateGanttOrders()

			} else if (oItem.getText() === "Change Offset"){
					var aOrders = this.get("/OrdersGantt")
					var operationsSelected = []
					var aObjIds = sShapeId.split("-")
					var treeTable = this._treeTableGantt

					for (var i = 0; i <= 3; i++){
						if (i%2 == 0){
							var indOrd = aOrders.findIndex(elem => elem.ID == aObjIds[i])
							var aOrdOps = aOrders[indOrd].Operations
							var indOp = aOrdOps.findIndex(elem => elem.ID == aObjIds[i + 1] || elem.ID == aObjIds[i] + " / " + aObjIds[i + 1])
							var oOp = aOrdOps[indOp]
							var path = "/OrdersGantt/" + indOrd + "/Operations/" + oOp
							operationsSelected.push({Operation: oOp, Path: path})
						}
					}
					
					var rel = relationships[relationships.findIndex(elem => elem.RelationID === sShapeId)]
					//this.set("/RelationInputVisible", false)
					this.set("/RelationInputVisible", true)
					this.set("/RelationTypeSelected", rel.RelationType)
					this.set("/OperationsSelected", operationsSelected)
					this.set("/RelationTimeUnitSelected", rel.DurationRelationUnit ? rel.DurationRelationUnit : "H")
					this.set("/RelationTime", rel.DurationRelation ? rel.DurationRelation : "0")
					this.openOperationRelations();
				} else {
					var sType = sap.gantt.simple.RelationshipType[oItem.getText()];
					var relationToEdit = relationships.find(function (r) { return r.RelationID === sShapeId; });
					relationToEdit.RelationType = sType;
					this.set("/Relationships", relationships);
					this.updateGanttOrders()

				}
			this.oContextMenu.close();
		},
		
		onClosedContextMenu: function(oEvent){
			var clearIcon = function (oParent) {
				oParent.getItems().forEach(function (oItem) { oItem.setIcon(""); });
			};
			clearIcon(this.oContextMenu.getItems()[1]);
		},
		
		onShapePress: function(oEvent){
			var oShape = oEvent.getParameter('shape');
			var oGantt = this._gantt1
			var oContainer = oGantt.getParent();
			if (oShape){
				//oContainer.setStatusMessage(oShape.getTitle());
			} else {
				//oContainer.setStatusMessage("");
			}
		},

		onShapeConnect: function(oEvent) {
			var oTableGantt = this._gantt1
			var sFromShapeUid = oEvent.getParameter("fromShapeUid");
			var sToShapeUid = oEvent.getParameter("toShapeUid");
			var iType = oEvent.getParameter("type");

			var fnParseUid = sap.gantt.misc.Utility.parseUid;

			var oParsedUid = fnParseUid(sFromShapeUid);
			var sShapeId = oParsedUid.shapeId;
			var sRowId = fnParseUid(oParsedUid.rowUid).rowId;
			var toParsedUid = fnParseUid(sToShapeUid);
			
			var objectFrom = this.get(oParsedUid.shapeDataName);
			var objectTo = this.get(toParsedUid.shapeDataName);
			var relationships = this.get("/Relationships");
			relationships = relationships ? relationships : []; 
			
			var newRelation = {};
			var id = objectFrom.ObjectID + "-" + objectTo.ObjectID;
			newRelation.ObjectID = id;
			newRelation.RelationID = id;
			newRelation.ParentObjectID = sRowId;
			newRelation.PredecTaskID = sShapeId;
			newRelation.SuccTaskID = fnParseUid(sToShapeUid).shapeId;
			newRelation.RelationType = iType;
			newRelation.shapeTypeStart = "VerticalRectangle";
			newRelation.shapeTypeEnd = "Diamond";
			
			relationships.push(newRelation);
			
			this.set("/Relationships", relationships);
			
			this.updateGanttOrders();
		},
		
		onExportPDF: async function () {
			
			var diferenciaDias = function(fecha1, fecha2) {
			  const diferenciaTiempo = fecha2.getTime() - fecha1.getTime();
			  const unDiaEnMilisegundos = 24 * 60 * 60 * 1000;
			  return Math.round(diferenciaTiempo / unDiaEnMilisegundos);
			}
			var fRemToPx = function(sWidith){
				if (typeof sWidith !== 'string') return 0
				if (sWidith.includes('rem')) {
				    let iRemWidith = parseFloat(sWidith.replace('rem',''))
				    return iRemWidith * parseFloat(getComputedStyle(document.documentElement).fontSize);
				}
				return sWidith
			}
			
			var sTime = this.get("/minDate" ) 
			var startDate = new Date(sTime.substring(0, 4), sTime.substring(4, 6) - 1, sTime.substring(6, 8));
			var eTime = this.get("/maxDate" ) 
			var endDate = new Date(eTime.substring(0, 4), eTime.substring(4, 6) - 1, eTime.substring(6, 8));
			startDate = new Date( startDate.setDate(startDate.getDate() - 2) )
			endDate = new Date( endDate.setDate(endDate.getDate() + 2) )
			
			let iCnantidadDiasTotal = diferenciaDias(startDate,endDate)
			
			if (iCnantidadDiasTotal>75){
				await this.MessageBox("Select a shorter period in the gantt printing pannel.",
				{
					icon: sap.m.MessageBox.Icon.WARNING,
					title: "Alert",
				});
			}
			
			
			this.setBusy(true)
			this._zoomStrategy.setZoomLevel(1)
			this._zoomStrategy2.setZoomLevel(1)
			
			var iColumnsWidth = this._gantt1.getTable().getColumns().reduce((iAcumulado,oColumn)=>{
			    if (!oColumn.getVisible()) return iAcumulado
			    return iAcumulado + fRemToPx(oColumn.getWidth())
			}, 0)
			var iTotalSize = this._gantt1._oSplitter.getCalculatedSizes().reduce((iAcum,iSize)=> iAcum + iSize,0)
			if (iColumnsWidth > iTotalSize - 50) iColumnsWidth = iTotalSize - 50
			let sSizeInPx = iColumnsWidth + 'px'
			this._gantt1._oSplitter.getContentAreas()[0].getLayoutData().setSize(sSizeInPx)
			await new Promise(resolve => setTimeout(resolve, 1000));
			this.setBusy(false)
			
			var oGanttPrinting = new GanttPrinting({
				ganttChart: this._gantt1
			});
			
			oGanttPrinting.open();

			oGanttPrinting._oModel.setProperty('/startDate', startDate)
			oGanttPrinting._oModel.setProperty('/endDate', endDate)
			

			oGanttPrinting._updateGanttCanvas();

			window.oGanttPrinting = oGanttPrinting  //debug
			
		},
		
		onPressOrder:function(oEvent){
			var oBinding = this.get( oEvent.getSource().getBindingContext('mGlobal').getPath() )
			var oAction = { Edit: true }
			if (!oBinding.Orderid){
				oAction.sOrderid = oBinding.ParentObjectID
				oAction.sActivity = oBinding.Activity
				oAction.sSubActivity = oBinding.SubActivity
			} else {
				oAction.sOrderid = oBinding.Orderid
			}

			this.orderNavigationPopOver(oAction).openBy(oEvent.getSource())
		},
		
		orderNavigationPopOver: function(oAction){
			this._oAction = oAction
			this.set("/oAction",oAction)
			if (this._orderNavigator) return this._orderNavigator
			
			let ResponsivePopover = this._orderNavigator = new sap.m.ResponsivePopover({
				placement:"Bottom",
				showHeader:false
			})
			
			let ProductSwitch = new sap.f.ProductSwitch({
				change: (oEvent)=>{
					let sTarget = oEvent.getParameter('itemPressed').getTargetSrc()
					let oGo = {
						"GUI": ()=>{ this.openOrderSapGUI(this._oAction.sOrderid, true) },
						"WebGUI": ()=>{ this.openOrderWebGUI(this._oAction.sOrderid, true) },
						"MyPmMenu": ()=>{ this.openMyPmMenu(this._oAction.sOrderid) },
						"Confirm": ()=>{ this.handleNavToOrderConfirm(this._oAction) },
						"Delete": ()=>{ this.deleteOperation(this._oAction) }
					}
					ResponsivePopover.close()
					if (oGo[sTarget]) oGo[sTarget]()
				},
				items:[
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://sap-logo-shape',
						title: "Open Order",
						subTitle: "SAP GUI",
						targetSrc: 'GUI'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://internet-browser',
						title: "Open Order",
						subTitle: "Web GUI",
						targetSrc: 'WebGUI'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://show',
						title: "My PM Menu",
						subTitle: "View Order Detail",
						targetSrc: 'MyPmMenu'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://bbyd-active-sales',
						title: "Confirm Operation",
						targetSrc: 'Confirm',
						visible: "{= !!${/oAction/sActivity} }"
					}).setModel(this.oGlobalModel),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://delete',
						title: "Delete Operation",
						targetSrc: 'Delete',
						visible: "{= !!${/oAction/sActivity} }"
					}).setModel(this.oGlobalModel),
				]
			})
			ResponsivePopover.addContent(ProductSwitch)
			return ResponsivePopover
		},
		
		onPressWorkCenter:function(oEvent){
			var sArbpl = this.get( oEvent.getSource().getBindingContext('mGlobal').getPath() ).Arbpl
			var sWerks = this.get( oEvent.getSource().getBindingContext('mGlobal').getPath() ).Werks
			this.WorkCenterNavigationPopOver(sArbpl, sWerks).openBy(oEvent.getSource())
		},

		WorkCenterNavigationPopOver: function(sArbpl, sWerks){
			this._sArbpl = sArbpl
			this._sWerks = sWerks
			if (this._workCenterNavigator) return this._workCenterNavigator

			let ResponsivePopover = this._workCenterNavigator = new sap.m.ResponsivePopover({
				placement:"Bottom",
				showHeader:false
			})

			//ESTO TIENE UN CSS CUSTOM PORQUE EL CONTROL NO ES RESPONSIVE

			let ProductSwitch = new sap.f.ProductSwitch('_workCenterNavigator', {
				change: (oEvent)=>{
					let sTarget = oEvent.getParameter('itemPressed').getTargetSrc()
					let oGo = {
						"GUI": ()=>{ this.openWorkCenterWebGUI(this._sArbpl, this._sWerks, true) },
						"WebGUI": ()=>{ this.openWorkCenterSapGUI(this._sArbpl, this._sWerks, true) },
					}
					ResponsivePopover.close()
					if (oGo[sTarget]) oGo[sTarget]()
				},
				items:[
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://sap-logo-shape',
						title: "Open Work Center",
						subTitle: "SAP GUI",
						targetSrc: 'GUI'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://internet-browser',
						title: "Open Work Center",
						subTitle: "Web GUI",
						targetSrc: 'WebGUI'
					})
				]
			})

			ResponsivePopover.addContent(ProductSwitch)
			return ResponsivePopover
		},
		
		deleteOperation: function(oProps){
			sap.m.MessageBox.confirm( this.getOwnerComponent().getModel("i18n").getResourceBundle().getText('CONFIRM_OPERATION_DELETE', [oProps.sOrderid+" / "+oProps.sActivity] ), {
				onClose: function (sAction) {
					if (sAction != sap.m.MessageBox.Action.OK) return;
					var oChangeData = {aOperation:[{ 
						'Number': oProps.sOrderid, 
						'Activity': oProps.sActivity, 
						'SubActivity': oProps.sSubActivity, 
						'Action': 'D'
					}]}
					
					this.setBusy(true)
					var aPendingPromises = oDataAction.saveOrdesChanges.call(this, oChangeData )    
					
					Promise.allSettled(aPendingPromises)
					.finally(function(){
						this.openMessagePopover()
						this.refreshOrderList(oChangeData.aOrder).finally(function(){
							this.setGanttData();
							this.setBusy(false);
						}.bind(this))
					}.bind(this))
				}.bind(this)
			});
		},
		
		onRefreshAll: function(){
			this.setBusy(true);
			var aOrdersGantt = [... this.get("/OrdersGantt") ]
			let pRefresh = this.refreshOrderList(aOrdersGantt)
			pRefresh.finally(function(){
				this.setGanttData();
				this.setBusy(false);
			}.bind(this))
			return pRefresh
		},
		
		handleNavToOrderConfirm: function (oProps) {
			let ushell = parent.sap.ushell || sap.ushell;
			if (!ushell) return 
			let oCrossAppNav = ushell.Container.getService("CrossApplicationNavigation");
			if (!oCrossAppNav) return
				
			var navData = {history: window.history.state.sap.history.length};
			sessionStorage.setItem("navigationDataMyPMMenu", JSON.stringify(navData));

			let sURL = oCrossAppNav.hrefForExternal({
				target: {
					semanticObject: "confirmmaintenanceorder",
					action: "Display"
				},
				params: {
					Orderid: oProps.sOrderid,
					Operid: oProps.sActivity
				}
			});
			window.open(sURL, '_blank');
		},
		
	});
});