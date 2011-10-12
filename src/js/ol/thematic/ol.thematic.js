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

/*
 * 
 * base class for all thematic symbologies
 * 
 */

if ( !ol ) var ol = {};

ol.thematic = {};

ol.thematic.LayerBase = OpenLayers.Class(
{
	
	layer : null,
	format : null,
	url : null,
	features : null,
	
	classed : false,
	
	requestSuccess: function(request) {},
	
	indicator : null,
	
	/* TODO this should be implemented in all symbologies 
	 * 
	 * ex: function( feature ) { return feature.population / feature.area; };
	 */
	valuator : null,
	
	defaultSymbolizer : {},
	
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
			style.rules = rules;
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


// TODO ALL THE BELOW classes & constants


ol.thematic.Distribution = OpenLayers.Class({
	
	values: null,

    nbVal: null,
    
    minVal: null,
    
    maxVal: null,
    
    initialize: function(values) {
        this.values = values;
        this.nbVal = values.length;
        this.minVal = this.nbVal ? Array.min( values ) : 0;
        this.maxVal = this.nbVal ? Array.max( values ) : 0;
    },
    
    classifyWithBounds: function(bounds) {
        var bins = [];
        var binCount = [];
        var sortedValues = [];
        for (var i = 0; i < this.values.length; i++) {
            sortedValues.push(this.values[i]);
        }
        sortedValues.sort(function(a,b) {return a-b;});
        var nbBins = bounds.length - 1;

        for (var i = 0; i < nbBins; i++) {
            binCount[i] = 0;
        }
        
        for (var i = 0; i < nbBins - 1; i) {
            if (sortedValues[0] < bounds[i + 1]) {
                binCount[i] = binCount[i] + 1;
                sortedValues.shift();
            } else {
                i++;
            }
        }
        binCount[nbBins - 1] = this.nbVal - Array.sum( binCount );
        
        for (var i = 0; i < nbBins; i++) {
            var label = bounds[i].toFixed(3) + ' - ' + bounds[i + 1].toFixed(3);
            bins[i] = new ol.thematic.Bin(binCount[i], label, bounds[i], bounds[i + 1],
                i == (nbBins - 1));
        }
        
        return new ol.thematic.Classification(bins);
    },
    
    classifyByEqIntervals: function(nbBins) {
        var bounds = [];
        
        for(var i = 0; i <= nbBins; i++) {
            bounds[i] = this.minVal + 
                i*(this.maxVal - this.minVal) / nbBins;
        }
        
        return this.classifyWithBounds(bounds);           
    },
    
    classifyByQuantile: function(nbBins) {
        var values = this.values;
        values.sort(function(a,b) {return a-b;});
        var binSize = Math.round(this.values.length / nbBins);
        
        var bounds = [];
        var binLastValPos = (binSize == 0) ? 0 : binSize;
        
        if (values.length > 0) {
            bounds[0] = values[0];
            for (i = 1; i < nbBins; i++) {
                bounds[i] = values[binLastValPos];
                binLastValPos += binSize;
            }
            bounds.push(values[values.length - 1]);
        }
        
        return this.classifyWithBounds(bounds);
    },
    
    sturgesRule: function() {
        return Math.floor(1 + 3.3 * Math.log(this.nbVal, 10));
    },
    
    classify: function(method, nbBins, bounds) {
        var classification = null;
        if (!nbBins) {
            nbBins = this.sturgesRule();
        }
        
        switch (method) {
	        case ol.thematic.Distribution.CLASSIFY_WITH_BOUNDS:
	            classification = this.classifyWithBounds(bounds);
	            break;
	        case ol.thematic.Distribution.CLASSIFY_BY_EQUAL_INTERVALS:
	            classification = this.classifyByEqIntervals(nbBins);
	            break;
	        case ol.thematic.Distribution.CLASSIFY_BY_QUANTILE :
	            classification = this.classifyByQuantile(nbBins);
	            break;
	        default:
	            OpenLayers.Console.error("unsupported or invalid classification method");
        }
        return classification;
    },
    
    CLASS_NAME: "ol.thematic.Distribution"


});


ol.thematic.Distribution.CLASSIFY_WITH_BOUNDS = 'classify with bounds';
ol.thematic.Distribution.CLASSIFY_BY_EQUAL_INTERVALS = 'classify by equal intervals';
ol.thematic.Distribution.CLASSIFY_BY_QUANTILE = 'classify by quantile';
ol.thematic.Distribution.CLASSIFY_MANUAL = 'classify manual';

ol.thematic.Distribution.CLASSIFICATION_METHODS = {
	'equal intervals' : {
		'pretty' : 'Equal Interval',
		'value' : ol.thematic.Distribution.CLASSIFY_BY_EQUAL_INTERVALS
	},
	
	'quantiles' : {
		'pretty' : 'Quantile',
		'value' : ol.thematic.Distribution.CLASSIFY_BY_QUANTILE
	}
};


ol.thematic.Bin = OpenLayers.Class({
	label: null,
    nbVal: null,
    lowerBound: null,
    upperBound: null,
    isLast: false,
    
    initialize: function(nbVal, label, lowerBound, upperBound, isLast) {
        this.nbVal = nbVal;
        this.label = label;
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
        this.isLast = isLast;
    },
    
    CLASS_NAME: "ol.thematic.Bin"
});

ol.thematic.Classification = OpenLayers.Class({
	bins: [],
    
    initialize: function(bins) {
        this.bins = bins;
    },
    
    getBoundsArray: function() {
        var bounds = [];
        for (var i = 0; i < this.bins.length; i++) {
            bounds.push(this.bins[i].lowerBound);
        }
        if (this.bins.length > 0) {
            bounds.push(this.bins[this.bins.length - 1].upperBound);
        }
        return bounds;
    },
    
    CLASS_NAME: "ol.thematic.Classification"
});


