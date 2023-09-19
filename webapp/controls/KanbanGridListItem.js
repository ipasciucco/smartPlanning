sap.ui.define([
	"sap/f/GridListItem",
	"sap/f/GridListItemRenderer",
], function (
	GridListItem,
	GridListItemRenderer
) {
	"use strict";
	var ManagedObject = GridListItem.extend("com.blueboot.smartplanning.controls.KanbanGridListItem", {
		metadata: {
			properties: {
				color: {type: "string", group: "Appearance", defaultValue: ""},
			},
			events: {
				"rightPress": {}
			}
		},
		oncontextmenu: function (oEvent) {
			this.fireRightPress(oEvent)
			oEvent.preventDefault()
			return true
		},
		renderer: function(oRm, oCard){
			GridListItemRenderer.render.apply(this, arguments);
		},
		
		setColor: function(sColor){
			this.setProperty("color", sColor)
			this.setBackgroundColor()
		},
		
		setBackgroundColor: function(){
			if (!this.getDomRef()) return
			let sColor = this.getColor() ? this.getColor() : ''
			this.getDomRef().style['background-color'] = sColor;
		}		
	});
	
	var onAfterRendering = ManagedObject.prototype.onAfterRendering
	ManagedObject.prototype.onAfterRendering = function(oEvent){
		this.setBackgroundColor()
	}

	return ManagedObject
});