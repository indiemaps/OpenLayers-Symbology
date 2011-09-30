/**
* @requires ol.thematic.js
*/

OpenLayers.Thematic.Choropleth = OpenLayers.Class( OpenLayers.Thematic.ThematicBase, 
{
	
	
	
	
	
	
	CLASS_NAME: "OpenLayers.Thematic.Choropleth"
});



















/*
if (!OpenLayers.Symbologies) OpenLayers.Symbologies = {};

OpenLayers.Symbologies.ChoroplethStyle = OpenLayers.Class( OpenLayers.Style,
{
		
});

if (!OpenLayers.Thematic) OpenLayers.Thematic = {};

OpenLayers.Thematic.Choropleth = function()
{
	var choro = {};
	
	
	
	return choro;
};



OpenLayers.Layer.Choropleth = OpenLayers.Class( OpenLayers.Layer,
{
	
	
	
	initialize : function( name, options )
	{
		
	}
	
});




OpenLayers.Layer.Vector=OpenLayers.Class(OpenLayers.Layer,
{
	EVENT_TYPES:["beforefeatureadded","beforefeaturesadded","featureadded","featuresadded","beforefeatureremoved","beforefeaturesremoved","featureremoved","featuresremoved","beforefeatureselected","featureselected","featureunselected","beforefeaturemodified","featuremodified","afterfeaturemodified","vertexmodified","vertexremoved","sketchstarted","sketchmodified","sketchcomplete","refresh"],
	isBaseLayer:false,
	isFixed:false,
	features:null,
	filter:null,
	selectedFeatures:null,
	unrenderedFeatures:null,
	reportError:true,
	style:null,
	styleMap:null,
	strategies:null,
	protocol:null,
	renderers:['SVG','VML','Canvas'],
	renderer:null,
	rendererOptions:null,
	geometryType:null,
	drawn:false,
	
	initialize:function(name,options)
	{
		this.EVENT_TYPES=OpenLayers.Layer.Vector.prototype.EVENT_TYPES.concat(OpenLayers.Layer.prototype.EVENT_TYPES);
		OpenLayers.Layer.prototype.initialize.apply(this,arguments);
		if(!this.renderer||!this.renderer.supported()){this.assignRenderer();}
		if(!this.renderer||!this.renderer.supported()){this.renderer=null;this.displayError();}
		if(!this.styleMap){this.styleMap=new OpenLayers.StyleMap();}
		this.features=[];
		this.selectedFeatures=[];
		this.unrenderedFeatures={};
		if(this.strategies)
		{
			for(var i=0,len=this.strategies.length;i<len;i++)
			{
				this.strategies[i].setLayer(this);
			}
		}
	},
	
	destroy:function()
	{
		if(this.strategies)
		{
			var strategy,i,len;
			for(i=0,len=this.strategies.length;i<len;i++)
			{
				strategy=this.strategies[i];
				if(strategy.autoDestroy){strategy.destroy();}
			}
			this.strategies=null;
		}
		if(this.protocol)
		{
			if(this.protocol.autoDestroy){this.protocol.destroy();}
			this.protocol=null;
		}
		this.destroyFeatures();
		this.features=null;
		this.selectedFeatures=null;
		this.unrenderedFeatures=null;
		if(this.renderer){this.renderer.destroy();}
		this.renderer=null;
		this.geometryType=null;
		this.drawn=null;
		OpenLayers.Layer.prototype.destroy.apply(this,arguments);
	},
	
	clone:function(obj)
	{
		if(obj==null)
		{
			obj=new OpenLayers.Layer.Vector(this.name,this.getOptions());}
obj=OpenLayers.Layer.prototype.clone.apply(this,[obj]);var features=this.features;var len=features.length;var clonedFeatures=new Array(len);for(var i=0;i<len;++i){clonedFeatures[i]=features[i].clone();}
obj.features=clonedFeatures;return obj;},refresh:function(obj){if(this.calculateInRange()&&this.visibility){this.events.triggerEvent("refresh",obj);}},assignRenderer:function(){for(var i=0,len=this.renderers.length;i<len;i++){var rendererClass=this.renderers[i];var renderer=(typeof rendererClass=="function")?rendererClass:OpenLayers.Renderer[rendererClass];if(renderer&&renderer.prototype.supported()){this.renderer=new renderer(this.div,this.rendererOptions);break;}}},displayError:function(){if(this.reportError){OpenLayers.Console.userError(OpenLayers.i18n("browserNotSupported",{'renderers':this.renderers.join("\n")}));}},setMap:function(map){OpenLayers.Layer.prototype.setMap.apply(this,arguments);if(!this.renderer){this.map.removeLayer(this);}else{this.renderer.map=this.map;this.renderer.setSize(this.map.getSize());}},afterAdd:function(){if(this.strategies){var strategy,i,len;for(i=0,len=this.strategies.length;i<len;i++){strategy=this.strategies[i];if(strategy.autoActivate){strategy.activate();}}}},removeMap:function(map){this.drawn=false;if(this.strategies){var strategy,i,len;for(i=0,len=this.strategies.length;i<len;i++){strategy=this.strategies[i];if(strategy.autoActivate){strategy.deactivate();}}}},onMapResize:function(){OpenLayers.Layer.prototype.onMapResize.apply(this,arguments);this.renderer.setSize(this.map.getSize());},moveTo:function(bounds,zoomChanged,dragging){OpenLayers.Layer.prototype.moveTo.apply(this,arguments);var ng=(OpenLayers.Renderer.NG&&this.renderer instanceof OpenLayers.Renderer.NG);if(ng){dragging||this.renderer.updateDimensions(zoomChanged);}else{var coordSysUnchanged=true;if(!dragging){this.renderer.root.style.visibility="hidden";this.div.style.left=-parseInt(this.map.layerContainerDiv.style.left)+"px";this.div.style.top=-parseInt(this.map.layerContainerDiv.style.top)+"px";var extent=this.map.getExtent();coordSysUnchanged=this.renderer.setExtent(extent,zoomChanged);this.renderer.root.style.visibility="visible";if(OpenLayers.IS_GECKO===true){this.div.scrollLeft=this.div.scrollLeft;}
if(!zoomChanged&&coordSysUnchanged){for(var i in this.unrenderedFeatures){var feature=this.unrenderedFeatures[i];this.drawFeature(feature);}}}}
if(!this.drawn||(!ng&&(zoomChanged||!coordSysUnchanged))){this.drawn=true;var feature;for(var i=0,len=this.features.length;i<len;i++){this.renderer.locked=(i!==(len-1));feature=this.features[i];this.drawFeature(feature);}}},redraw:function(){if(OpenLayers.Renderer.NG&&this.renderer instanceof OpenLayers.Renderer.NG){this.drawn=false;}
return OpenLayers.Layer.prototype.redraw.apply(this,arguments);},display:function(display){OpenLayers.Layer.prototype.display.apply(this,arguments);var currentDisplay=this.div.style.display;if(currentDisplay!=this.renderer.root.style.display){this.renderer.root.style.display=currentDisplay;}},addFeatures:function(features,options){if(!(OpenLayers.Util.isArray(features))){features=[features];}
var notify=!options||!options.silent;if(notify){var event={features:features};var ret=this.events.triggerEvent("beforefeaturesadded",event);if(ret===false){return;}
features=event.features;}
var featuresAdded=[];for(var i=0,len=features.length;i<len;i++){if(i!=(features.length-1)){this.renderer.locked=true;}else{this.renderer.locked=false;}
var feature=features[i];if(this.geometryType&&!(feature.geometry instanceof this.geometryType)){var throwStr=OpenLayers.i18n('componentShouldBe',{'geomType':this.geometryType.prototype.CLASS_NAME});throw throwStr;}
feature.layer=this;if(!feature.style&&this.style){feature.style=OpenLayers.Util.extend({},this.style);}
if(notify){if(this.events.triggerEvent("beforefeatureadded",{feature:feature})===false){continue;}
this.preFeatureInsert(feature);}
featuresAdded.push(feature);this.features.push(feature);this.drawFeature(feature);if(notify){this.events.triggerEvent("featureadded",{feature:feature});this.onFeatureInsert(feature);}}
if(notify){this.events.triggerEvent("featuresadded",{features:featuresAdded});}},removeFeatures:function(features,options){if(!features||features.length===0){return;}
if(features===this.features){return this.removeAllFeatures(options);}
if(!(OpenLayers.Util.isArray(features))){features=[features];}
if(features===this.selectedFeatures){features=features.slice();}
var notify=!options||!options.silent;if(notify){this.events.triggerEvent("beforefeaturesremoved",{features:features});}
for(var i=features.length-1;i>=0;i--){if(i!=0&&features[i-1].geometry){this.renderer.locked=true;}else{this.renderer.locked=false;}
var feature=features[i];delete this.unrenderedFeatures[feature.id];if(notify){this.events.triggerEvent("beforefeatureremoved",{feature:feature});}
this.features=OpenLayers.Util.removeItem(this.features,feature);feature.layer=null;if(feature.geometry){this.renderer.eraseFeatures(feature);}
*/