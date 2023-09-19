
sap.ui.define([
], function() {
	"use strict";
	return {
		
		generateShortcutIn:function(ticket){
			var langs = ['en','es','zh-CN'];
			var isValidLang = false;
			var browserLang = sap.ui.getCore().getConfiguration().getLanguage();
			for(var iter = 0; iter<langs.length; iter++){
				var re = new RegExp("^" + langs[iter] +"((_|-)\\w+)*$");
				isValidLang = isValidLang || re.test(browserLang);
			}
			
			var shortcutlang = isValidLang? browserLang.substring(0,2).toUpperCase() : "EN";
			
			var shortcutText = "[System]\n" +
				"Name=MYSYSTEM\n" +
				"GuiParm=ROUTESTRING\n" +
				"Client=MYCLIENT\n" +
				"[User]\n" +
				"Name=SSO\n" +
				"at=\"MYSAPSSO2=" + ticket + "\"\n" +
				"Language="+ shortcutlang +"\n" +
				"[Function]\n" +
				"Command=TRANSACTION\n" +
				"[Configuration]\n" +
				"GuiSize=Maximized\n" +
				"[Options]\n" +
				"Reuse=1\n";
			return shortcutText;
		},
		
		downloadFile: function (filename, data) {
			var blob = new Blob([data], {
				type: 'text/csv'
			});
			if (window.navigator.msSaveOrOpenBlob) {
				window.navigator.msSaveBlob(blob, filename);
			} else {
				var elem = window.document.createElement('a');
				elem.href = window.URL.createObjectURL(blob);
				elem.download = filename;
				document.body.appendChild(elem);
				elem.click();
				document.body.removeChild(elem);
			}
		},
		
		downloadFromLink:function(sTransaction = ''){
					
					var ECC_URL = sap.ui.getCore().getModel('mGlobal').getProperty('/ECC_URL')
					var domain = ECC_URL.replace("https://","")
					var routeString = ""
					if (domain.indexOf("sfmw2hcyp5") >-1 ||  domain.indexOf("erp360dev.invista.com") >-1){
							routeString = "/H/sapde2.dtinet.net/S/3201 /UPDOWNLOAD_CP=1160" //DEV
						}
						else if (domain.indexOf("lgi5li9px8") >-1 ||  domain.indexOf("erp360qa.invista.com") >-1){
							routeString = "/M/sapae2.dtinet.net/S/3600/G/PUBLIC /UPDOWNLOAD_CP=1160" //QAS
						}
						else if (domain.indexOf("h0497bee0") >-1 ||  domain.indexOf("erp360.invista.com") >-1){
							routeString = "/M/sappe2.dtinet.net/S/3601/G/PUBLIC /UPDOWNLOAD_CP=1160"; //PRD
						} 
					
					var that = this;
					
					$.ajax({
						//url: /*"/sap/fiori/txssoshortcut/"*/ "/" + "ECC" + "/sap/bc/zgetssoticket",
						//url: "/sap/fiori/initsapsso/DE2/sap/bc/zgetssoticket",
						url: "/ECC/sap/bc/zgetssoticket",
						type: "GET",
						headers: {
							Accept: "text/plain; charset=utf-8",
							"Content-Type": "text/plain; charset=utf-8"
						},
						success: function (data) {
							var shortcutText = that.generateShortcutIn(data);
							shortcutText = shortcutText.replace("MYSYSTEM", "ECC") //siempre
			 											   .replace("ROUTESTRING", routeString) 
			 											   .replace("TRANSACTION", sTransaction) 
			 											   .replace("MYCLIENT", "010"); //siempre
							try {
								that.downloadFile("ECC" + ".sap", shortcutText);
							} catch (e) {
								alert("Not able to generate SSO Ticket");
							}
						},
						error: function (data) {
							if (data.status == 200) {
								if (typeof (data) == "object" && data.responseText) {
		
									var shortcutText = that.generateShortcutIn(data.responseText);
									shortcutText = shortcutText.replace("MYSYSTEM", "ECC")
			 											   .replace("ROUTESTRING", routeString)
			 											   .replace("TRANSACTION", sTransaction)
			 											   .replace("MYCLIENT", "010"); //siempre
									try {
										that.downloadFile("ECC" + ".sap", shortcutText);
									} catch (e) {
										alert("Not able to generate SSO Ticket");
									}
								}
							}
						}
				},
				function() {});
			
			
		}
	};
});