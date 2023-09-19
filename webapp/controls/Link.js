sap.ui.define([
	"sap/m/Link"
], function (
	ManagedObject
) {
	"use strict";
	var Link = ManagedObject.extend("com.blueboot.smartplanning.controls.Link", {
		metadata: {
			properties: {

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
		renderer: {}
	});

	return Link
});