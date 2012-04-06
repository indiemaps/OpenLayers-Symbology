/**
* @requires ol.thematic.js
*/

ol.thematic.Isoline = OpenLayers.Class( ol.thematic.LayerBase, 
{
	/* isoline specific */
	interval 		: 10,
	baseLine 		: 0,
	
	showTIN 	: false,
	
	initialize : function( map, options )
	{
		ol.thematic.LayerBase.prototype.initialize.apply( this, arguments );
	},
	
	/*
	 * this changes options for this symbology
	 * 
	 * ex. isoline interval
	 */
	updateOptions : function( newOptions )
	{
		// snag a copy of the current options
		var oldOptions = OpenLayers.Util.extend( {}, this.options );
		
		// call superclass method, merge new options with existing
		this.addOptions( newOptions );
		
		
		if ( newOptions )
		{
			if ( newOptions.indicator != oldOptions.indicator )
			{
				this.updateDistribution();
			}
			
			if ( newOptions.indicator != oldOptions.indicator ||
					newOptions.interval != oldOptions.interval )
			{
				// some features should be turned invisible
				this.updateIsolineFeatures( ( newOptions.indicator != oldOptions.indicator ) );
				this.updateInterpolation( ( newOptions.indicator != oldOptions.indicator ) );
			}
		}
	},
	
	/*
	 * this overrides the default method
	 * 
	 * we can't add features yet, b/c the distribution/classification hasn't been calculated
	 */
	addFeatures : function( features )
	{
		// nada
	},
	
	/* this would need to be done if the attribute or interval changed */
	updateIsolineFeatures : function( indicatorChanged )
	{
		indicatorChanged = indicatorChanged || false;
		
		var isolineFeature;
		
		// first, turn any invisible that we don't need
		for ( var i = 0; i < this.layer.features.length; i++ )
		{
			isolineFeature = this.layer.features[i];
			
			if ( isolineFeature.isolineValue % this.interval > 0 )
			{
				if ( isolineFeature.style == null ) isolineFeature.style = {};
				isolineFeature.style.display = 'none';
			}
			
			if ( indicatorChanged )
			{
				isolineFeature.geometry.removeComponents( isolineFeature.geometry.components );
			}
		}
	},
	
	updateClassification : function() 
	{
		this.updateDelaunay();
		//this.updateIsolineFeatures();
		this.updateInterpolation();
		//this.updateIsolines();
	},
	
	/* this only needs to be done once for a given point field */
	updateDelaunay : function()
	{
		var features = this.features,
			vertices = [],
			projectedPt,
			vertex;
		
		for ( var i = 0; i < features.length; i++ )
		{
			projectedPt = features[i].geometry.transform( new OpenLayers.Projection("EPSG:4326"), this.map.getProjectionObject() );
			vertex = new Vertex( projectedPt.x, projectedPt.y );
			
			vertex.feature = features[i];
			
			vertices.push( vertex );
		}
		
		var tris = Triangulate( vertices );
				
		this.triangles = [];
		for ( i = 0; i < tris.length; i++ )
		{
			if ( tris[i] != null )
			{
				this.triangles.push( tris[i] );
			}
		}
		
		// draw TIN if option is set to true
		if ( this.showTIN )
		{
			this.drawTIN();
		}
	},
	
	drawTIN : function()
	{
		var tri, triFeature, triGeom, triPoints,
			triFeatures = [];
		
		var triLayer = new OpenLayers.Layer.Vector( 'TIN', 
		{
			projection : new OpenLayers.Projection("EPSG:4326"),
			style : { strokeColor : "#ffffff", strokeOpacity : 1 }
		});
		map.addLayer( triLayer );
			
		for ( var i = 0; i < this.triangles.length; i++ )
		{
			tri = this.triangles[i];
			
			triPoints = [ 
				new OpenLayers.Geometry.Point( tri.v0.x, tri.v0.y ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") ), 
				new OpenLayers.Geometry.Point( tri.v1.x, tri.v1.y ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") ), 
				new OpenLayers.Geometry.Point( tri.v2.x, tri.v2.y ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") )
			];
			
			triGeom = new OpenLayers.Geometry.LineString( triPoints );
			triFeature = new OpenLayers.Feature.Vector( triGeom );
						
			triFeatures.push( triFeature );
		}
		
		triLayer.addFeatures( triFeatures );
	},
	
	/* this calculates values along edges and then strings isolines between them */
	updateInterpolation : function( indicatorChanged )
	{
		indicatorChanged = indicatorChanged || false;
		
		// begin new try 2
		
		var intervalValue = Math.ceil( this.distribution.minVal / this.interval ) * this.interval,
			isolineFeature,
			triangle,
			featuresToAdd = [],
			triangle, 
			minTriangleValue, maxTriangleValue,
			val0, val1, val2,
			edge1 = new Edge(), edge2 = new Edge(),
			x1, y1, x2, y2;
			
		while ( intervalValue <= this.distribution.maxVal )
		{
			isolineFeature = this.layer.getFeatureBy( 'isolineValue', intervalValue );
			
			if ( isolineFeature == null )
			{
				isolineFeature = new OpenLayers.Feature.Vector( new OpenLayers.Geometry.MultiLineString(), { isolineValue : intervalValue });
				isolineFeature.isolineValue = intervalValue;
				featuresToAdd.push( isolineFeature );
			}
			else
			{
				// make sure it is visible
				isolineFeature.style = null;
				
				// and continue
				if ( !indicatorChanged )
				{
					intervalValue += this.interval;
					continue;
				}
			}
			
			// now loop through all the tri's
			for ( var i = 0; i < this.triangles.length; i++ )
			{
				triangle = this.triangles[i];
				
				val0 = triangle.v0.feature.attributes[this.indicator];
				val1 = triangle.v1.feature.attributes[this.indicator];
				val2 = triangle.v2.feature.attributes[this.indicator];
				
				minTriangleValue = Math.min( val0, val1, val2 );
				maxTriangleValue = Math.max( val0, val1, val2 );
				
				if ( intervalValue <= maxTriangleValue && intervalValue >= minTriangleValue )
				{
					edge1.v0 = triangle.v0;
					edge2.v0 = triangle.v2;
					
					// if the interval value is EQUAL TO one of the triangle vertex values
					if ( intervalValue == val0 || intervalValue == val1 || intervalValue == val2 )
					{
						if ( !Number.between( val0, val1, intervalValue ) || !Number.between( val0, val2, intervalValue ) || !Number.between( val1, val2, intervalValue ) )
						{
							continue;
						}
						else
						{
							edge1.v1 = ( Number.between( val0, val1, intervalValue ) ) ? triangle.v1 : triangle.v2;
							edge2.v1 = ( Number.between( val1, val2, intervalValue ) && ( val1 != intervalValue ) ) ? triangle.v1 : triangle.v0;
						}
					}
					// if the interval value is NOT equal to one of the triangle vertex values
					else
					{
						edge1.v1 = ( Number.between( val0, val1, intervalValue ) ) ? triangle.v1 : triangle.v2;
						edge2.v1 = ( Number.between( val1, val2, intervalValue ) ) ? triangle.v1 : triangle.v0;
					}
					
					// find the interpolated point along the first edge
					x1 = (( intervalValue - edge1.v0.feature.attributes[this.indicator] ) / ( edge1.v1.feature.attributes[this.indicator] - edge1.v0.feature.attributes[this.indicator] )) * ( edge1.v1.x - edge1.v0.x ) + edge1.v0.x;
					y1 = (( intervalValue - edge1.v0.feature.attributes[this.indicator] ) / ( edge1.v1.feature.attributes[this.indicator] - edge1.v0.feature.attributes[this.indicator] )) * ( edge1.v1.y - edge1.v0.y ) + edge1.v0.y;
					
					// find the interpolated point along the second edge
					x2 = (( intervalValue - edge2.v0.feature.attributes[this.indicator] ) / ( edge2.v1.feature.attributes[this.indicator] - edge2.v0.feature.attributes[this.indicator] )) * ( edge2.v1.x - edge2.v0.x ) + edge2.v0.x;
					y2 = (( intervalValue - edge2.v0.feature.attributes[this.indicator] ) / ( edge2.v1.feature.attributes[this.indicator] - edge2.v0.feature.attributes[this.indicator] )) * ( edge2.v1.y - edge2.v0.y ) + edge2.v0.y;
					
					// now add this segment to the isoline feature
					isolineFeature.geometry.addComponents(
						[ 
							new OpenLayers.Geometry.LineString( 
								[
								new OpenLayers.Geometry.Point( x1, y1 ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") ), 
								new OpenLayers.Geometry.Point( x2, y2 ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") )
								]
							) 
						]
					);
				}
			}
			
			intervalValue += this.interval;
		}
		
		this.layer.addFeatures( featuresToAdd );
	},
	
	CLASS_NAME: "ol.thematic.Isoline",
	IS_OVERLAY_SYMBOLOGY : true
	
});