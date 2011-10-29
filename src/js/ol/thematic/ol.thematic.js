/**
 * Array class static methods that will be helpful
 */
Array.max = function( array ){
    return Math.max.apply( Math, array );
};
Array.min = function( array ){
    return Math.min.apply( Math, array );
};
Array.sum = function( array ){
	for(var i=0,sum=0;i<array.length;sum+=array[i++]);
	return sum;
};

/**
 * if 'ol' doesn't exist, make it exist
 * and add thematic object that will contain everything else
 */
if ( !ol ) var ol = {};
if ( !ol.thematic ) ol.thematic = {};


/*
 * 
 * base class for all thematic symbologies
 * 
 */
ol.thematic.LayerBase = OpenLayers.Class(
{
	// basic
	layer : null,
	format : null,
	url : null,
	features : null,
	requestSuccess: function(request) {},
	valuator : null,
	defaultSymbolizer : {},
	
	// distribution/classification-related
	distribution : null,
	classification : null,
	
	// options
	indicator 	: null,
	classed 	: false,
	method 		: ol.thematic.Distribution.CLASSIFY_BY_QUANTILE,
	numClasses 	: 5,
	classBreaks	: null,
		
	initialize : function( map, options )
	{
		this.map = map;
		this.addOptions( options );
		
		if ( !this.layer )
		{
			var styleMap = new OpenLayers.StyleMap({
				'default' : new OpenLayers.Style(
					OpenLayers.Util.applyDefaults(
						this.defaultSymbolizer,
						OpenLayers.Feature.Vector.style['default']
					)
				)
			});
			var layer = new OpenLayers.Layer.Vector( 'thematic', 
			{
				projection : new OpenLayers.Projection("EPSG:4326"),
				displayInLayerSwitcher : false,
				visibility : false,
				styleMap : styleMap
			});
			map.addLayer( layer );
			this.layer = layer;
		}
		
		if ( this.url )
		{
			OpenLayers.loadURL(
				this.url, '', this, this.onSuccess
			)
		}
	},
	
	onSuccess : function( request )
	{
		var doc = request.responseXML;
		if ( !doc || !doc.documentElement )
		{
			doc = request.responseText;
		}
		var format = this.format || new OpenLayers.Format.GeoJSON();
		
		format.externalProjection = new OpenLayers.Projection("EPSG:4326");
		format.internalProjection = this.map.getProjectionObject();
		
		this.features = format.read( doc );
		
		var feature, attribute;
		for ( var i = 0; i < this.features.length; i++ )
		{
			feature = this.features[i];
			
			$.each( feature.attributes, function( key, value )
			{
				if ( value && value.value )
				{
					feature.attributes[ key ] = value.value;
				}
			});
		}
		
		this.addFeatures( this.features );
		
		this.updateDistribution();
		this.updateClassification();
		this.applyClassification();
		
		this.requestSuccess(request);
	},
	
	addFeatures : function( features )
	{
		this.layer.addFeatures( features );
	},
	
	updateOptions : function( newOptions )
	{
		this.addOptions( newOptions );
	},
	
	addOptions : function( newOptions )
	{
		if ( newOptions )
		{
			if ( !this.options )
			{
				this.options = {};
			}
			
			OpenLayers.Util.extend( this.options, newOptions );
			OpenLayers.Util.extend( this, newOptions );
		}
	},
	
	extendStyle: function( rules, symbolizer, context ) 
	{
		var style = this.layer.styleMap.styles['default'];
		if (rules) 
		{
			style.addRules( rules );
		}
		if (symbolizer) 
		{
			style.setDefaultStyle( OpenLayers.Util.applyDefaults( symbolizer, style.defaultStyle ) );
		}
		if (context) 
		{
			if (!style.context) 
			{
				style.context = {};
			}
			OpenLayers.Util.extend(style.context, context);
			
			style.rules = [];
		}
	},
	
	updateDistribution : function()
	{
		var values = [];
		var features = this.layer.features;
		for (var i = 0; i < features.length; i++) 
		{
			values.push(features[i].attributes[this.indicator]);
		}
		this.distribution = new ol.thematic.Distribution(values);
	},
	
	updateClassification : function() 
	{
		if ( this.classed )
		{
			this.classification = this.distribution.classify(
				this.method,
				this.numClasses,
				this.classBreaks
			);
		}
	},
	
	applyClassification : function( options )
	{
		this.layer.renderer.clear();
		this.layer.redraw();
		this.layer.setVisibility( true );
	},
	
	
	CLASS_NAME: "ol.thematic.LayerBase"
	
});