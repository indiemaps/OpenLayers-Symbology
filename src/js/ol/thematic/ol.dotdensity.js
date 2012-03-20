/**
* @requires ol.thematic.js
*/

ol.thematic.DotDensity = OpenLayers.Class( ol.thematic.LayerBase, 
{
	// TODO: default should be smarter
	dotValue : null,
	
	initialize : function( map, options )
	{
		ol.thematic.LayerBase.prototype.initialize.apply( this, arguments );
	},
	
	addFeatures : function( features )
	{
		this.dotFeatures = [];
		
		var feature, geometry, attributes;
		for ( var i = 0; i < features.length; i++ )
		{
			feature = features[i],
				attributes = feature.attributes,
				attributes.polygonGeometry = feature.geometry,
				geometry = new OpenLayers.Geometry.MultiPoint();
			feature = new OpenLayers.Feature.Vector( geometry, attributes );
			
			this.dotFeatures.push( feature );
		}
				
		this.layer.addFeatures( this.dotFeatures );
	},
	
	// this will actually create/add or remove dots from each multipoint feature
	applyClassification : function( options )
	{
		this.updateOptions(options);
		
		if ( this.dotValue == null )
		{
			this.dotValue = Math.round( this.maxVal / 250 );
		}
		
		var features = this.dotFeatures, 
			feature, dotGeometry,
			value, numDots_has, numDots_needs, 
			polyGeometry, polyBounds,
			point, 
			containsPt = false;
		
		for (var i = 0; i < features.length; i++) 
		{
			feature = features[i],
				dotGeometry = feature.geometry,
				value = feature.attributes[ this.indicator ],
				numDots_needs = Math.round( value / this.dotValue ),
				numDots_has = dotGeometry.components.length,
				polyGeometry = feature.attributes.polygonGeometry,
				polyBounds = polyGeometry.getBounds(),
				point = null;
				
			while ( numDots_needs != numDots_has )
			{
				if ( numDots_needs > numDots_has )
				{
					
					point = new OpenLayers.Geometry.Point( polyBounds.left + Math.random() * polyBounds.getWidth(), polyBounds.bottom + Math.random() * polyBounds.getHeight() ),
						containsPt = false;
					// multipolygon?
					if ( polyGeometry.components != null )
					{
						for ( var c = 0; c < polyGeometry.components.length; c++ )
						{
							if ( polyGeometry.components[c].containsPoint( point ) )
							{
								containsPt = true;
								
								break;
							}
						}
					}
					
					// just a single polygon geometry
					else
					{
						if ( polyGeometry.containsPoint( point ) )
						{
							containsPt = true;
						}
					}
					
					if ( containsPt )
					{
						dotGeometry.addPoint( point );
					}
				}
				else
				{
					dotGeometry.removePoint( dotGeometry.components[ numDots_has - 1 ] );
				}
				
				numDots_has = dotGeometry.components.length;
			}
		}
		
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	
	CLASS_NAME: "ol.thematic.DotDensity",
	IS_OVERLAY_SYMBOLOGY : true
});