/**
 * if 'ol' doesn't exist, make it exist
 * and add thematic object that will contain everything else
 */
if ( !ol ) var ol = {};
if ( !ol.thematic ) ol.thematic = {};


/**
 * basic numerical distribution class, with a few classification options
 */
ol.thematic.Distribution = OpenLayers.Class({
	
	values: null,
    nbVal: null,
    minVal: null,
    maxVal: null,
    range : null,
    
    initialize: function(values) {
        this.values = values;
        this.nbVal = values.length;
        this.minVal = this.nbVal ? Array.min( values ) : 0;
        this.maxVal = this.nbVal ? Array.max( values ) : 0;
        this.range = this.maxVal - this.minVal;
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