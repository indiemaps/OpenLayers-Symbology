/**
* @requires ol.thematic.js, ol.classification.js & ol.propsymbol.js
*/

ol.thematic.Cartogram = OpenLayers.Class( ol.thematic.ProportionalSymbol, 
{
	/* this determines whether features will scale up/down as the user zooms in/out */
	resizeOnZoom : false,
	
	initialize : function( map, options )
	{
		ol.thematic.ProportionalSymbol.prototype.initialize.apply( this, arguments );
		
		if ( this.resizeOnZoom == false )
		{
			// register a listener on all zoom events
			this.map.events.register( 'zoomend', this, function()
			{
				this.applyClassification();
			});
			
		}
	},
	
	addFeatures : function( features )
	{
		ol.thematic.LayerBase.prototype.addFeatures.apply( this, arguments );
	},
	
	applyClassification : function( options )
	{
		this.updateOptions(options);
		
		var features = this.layer.features, 
			feature,
			geometry,
			centroid,
			area, desiredArea, scale;
		
		for (var i = 0; i < features.length; i++) 
		{
			feature = features[i],
				geometry = feature.geometry,
				centroid = geometry.getCentroid(),
        		area = geometry.getArea() / Math.pow( this.map.getResolution(), 2 );
        	
        	desiredArea = feature.attributes.desiredArea;
        	
        	desiredScale = Math.sqrt( desiredArea / area ); 
        	feature.geometry.resize( desiredScale, centroid );
		};
		
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.Cartogram",
	IS_OVERLAY_SYMBOLOGY : false
});