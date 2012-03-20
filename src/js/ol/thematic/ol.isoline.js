/**
* @requires ol.thematic.js
*/

ol.thematic.Isoline = OpenLayers.Class( ol.thematic.LayerBase, 
{
	/* isoline specific */
	interval 		: 10,
	baseLine 		: 0,
	triangles 		: null,
	
	showTriangles 	: false,
	showPoints		: false,
	
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
				this.updateIsolineFeatures();
				this.calculateIsolines();
			}
			
			
		}
	},
	
	/*
	 * this overrides the default method
	 * 
	 * should add line features (instead of points)
	 */
	addFeatures : function( features )
	{
		/*
		var tri, triFeature, triGeom, triPoints,
			triFeatures = [];
		
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
		
		this.layer.addFeatures( triFeatures );
		*/
		
		if ( this.showPoints )
		{
			var pointsToAdd = [];
			
			var feature, geometry, attributes;
			for ( var i = 0; i < features.length; i++ )
			{
				feature = features[i],
				geometry = feature.geometry,
				attributes = feature.attributes;
				
				if ( geometry == null ) continue;
				
				feature = new OpenLayers.Feature.Vector( geometry.getCentroid(), attributes );
				
				pointsToAdd.push( feature );
			}
			
			this.layer.addFeatures( pointsToAdd );
		}
	},
	
	/* this would need to be done if the attribute or interval changed */
	updateIsolineFeatures : function()
	{
		var interval = this.interval,
			intervalValue = Math.floor( this.distribution.minVal / interval ) * interval,
			isolineFeature = null;
		
		this.layer.removeFeatures( this.isolineFeatures );
		this.isolineFeatures = [];
		
		while ( ( intervalValue += interval ) <= this.distribution.maxVal )
		{
			if ( this.layer.getFeatureBy( 'isolineValue', intervalValue ) == null ) // TODO: remove. this check is unnecessary
			{
				isolineFeature = new OpenLayers.Feature.Vector( new OpenLayers.Geometry.MultiLineString(), { isolineValue : intervalValue });
				isolineFeature.isolineValue = intervalValue;
				this.isolineFeatures.push( isolineFeature );
			}
		}
		
		this.layer.addFeatures( this.isolineFeatures );
	},
	
	updateClassification : function() 
	{
		this.calculateDelaunay();
		this.updateIsolineFeatures();
		this.calculateIsolines();
	},
	
	/* this only needs to be done once for a given point field */
	calculateDelaunay : function()
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
		
	},
	
	/* this calculates values along edges and then strings isolines between them */
	calculateIsolines : function()
	{
		var triangle,v0value, v1value, minEdgeValue, maxEdgeValue, x, y;
		
		for ( var i = 0; i < this.triangles.length; i++ )
		{
			triangle = this.triangles[i];
			
			triangle.intervals = {};
			
			// there are 3 edges
			var edges = [
				new Edge( triangle.v0, triangle.v1 ),
				new Edge( triangle.v1, triangle.v2 ),
				new Edge( triangle.v2, triangle.v0 )
			];
			
			for ( var e = 0; e < edges.length; e++ )
			{
				edge = edges[e];
				
				v0value = edge.v0.feature.attributes[ this.indicator ];
				v1value = edge.v1.feature.attributes[ this.indicator ];
				minEdgeValue = Math.min( v0value, v1value );
				maxEdgeValue = Math.max( v0value, v1value );
				
				// lets just get an array of the isoline interval values that are on this edge
				var isolineInterval = Math.floor( minEdgeValue / this.interval ) * this.interval;
				if ( isolineInterval != minEdgeValue )
				{
					isolineInterval += this.interval;
				}
				
				while ( isolineInterval <= maxEdgeValue )
				{
					// find the x/y location along the edge for this interval value
					x = (( isolineInterval - v0value ) / ( v1value - v0value )) * ( edge.v1.x - edge.v0.x ) + edge.v0.x;
					y = (( isolineInterval - v0value ) / ( v1value - v0value )) * ( edge.v1.y - edge.v0.y ) + edge.v0.y;
					
					// edge.intervals[ isolineInterval ] = new Vertex(x,y);
					if ( !triangle.intervals[ isolineInterval ] )
					{
						triangle.intervals[ isolineInterval ] = [ new Vertex(x,y) ];
					}
					else
					{
						triangle.intervals[ isolineInterval ].push( new Vertex(x,y) );
					}
					
					isolineInterval += this.interval;
				}
				
			}
			
			var vertex0, vertex1, isoFeature;
			for ( isolineInterval in triangle.intervals )
			{
				if ( triangle.intervals.hasOwnProperty( isolineInterval ) )
				{
					vertex0 = triangle.intervals[ isolineInterval ][0];
					vertex1 = triangle.intervals[ isolineInterval ][1];
					
					isoFeature = this.layer.getFeatureBy( 'isolineValue', isolineInterval );
					
					isoFeature.geometry.addComponents(
						[ 
							new OpenLayers.Geometry.LineString( 
								[
								new OpenLayers.Geometry.Point( vertex0.x, vertex0.y ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") ), 
								new OpenLayers.Geometry.Point( vertex1.x, vertex1.y ).transform( this.map.getProjectionObject(), new OpenLayers.Projection("EPSG:4326") )
								]
							) 
						]
					);
				}
				
			}
			
		}
		
	},
	
	CLASS_NAME: "ol.thematic.Isoline",
	IS_OVERLAY_SYMBOLOGY : true
	
});