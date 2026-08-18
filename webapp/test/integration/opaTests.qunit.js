sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'zveobrequest/test/integration/FirstJourney',
		'zveobrequest/test/integration/pages/VendorRequestList',
		'zveobrequest/test/integration/pages/VendorRequestObjectPage'
    ],
    function(JourneyRunner, opaJourney, VendorRequestList, VendorRequestObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('zveobrequest') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheVendorRequestList: VendorRequestList,
					onTheVendorRequestObjectPage: VendorRequestObjectPage
                }
            },
            opaJourney.run
        );
    }
);