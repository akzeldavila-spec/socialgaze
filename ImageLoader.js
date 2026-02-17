// ImageLoader.js
// Handles preloading and storing images

class ImageLoader {
    constructor() {
        this.images = {};
    }
    
    // Preload all images for the charts
    preloadChartImages(charts, callback) {
        let imagesToLoad = charts.length * 5; // 5 images per chart
        let imagesLoaded = 0;
        
        if (imagesToLoad === 0) {
            callback();
            return;
        }
        
        // Function called when each image finishes
        function imageFinished() {
            imagesLoaded = imagesLoaded + 1;
            if (imagesLoaded === imagesToLoad) {
                callback();
            }
        }
        
        // Load images for each chart
        for (let i = 0; i < charts.length; i++) {
            let chart = charts[i];
            let chartKey = 'chart' + chart.id;
            
            // Initialize storage for this chart's images
            this.images[chartKey] = {};
            
            // Load sample image
            this.loadImage(chart.sample, function(img) {
                this.images[chartKey].sample = img;
                imageFinished();
            }.bind(this), imageFinished);
            
            // Load choice1 image
            this.loadImage(chart.choice1, function(img) {
                this.images[chartKey].choice1 = img;
                imageFinished();
            }.bind(this), imageFinished);
            
            // Load choice2 image
            this.loadImage(chart.choice2, function(img) {
                this.images[chartKey].choice2 = img;
                imageFinished();
            }.bind(this), imageFinished);
            
            // Load result1 image
            this.loadImage(chart.result1, function(img) {
                this.images[chartKey].result1 = img;
                imageFinished();
            }.bind(this), imageFinished);
            
            // Load result2 image
            this.loadImage(chart.result2, function(img) {
                this.images[chartKey].result2 = img;
                imageFinished();
            }.bind(this), imageFinished);
        }
    }
    
    // Preload symbol images
    preloadSymbolImages(symbols, callback) {
        let imagesToLoad = symbols.length;
        let imagesLoaded = 0;
        
        if (imagesToLoad === 0) {
            callback();
            return;
        }
        
        // Function called when each image finishes
        function imageFinished() {
            imagesLoaded = imagesLoaded + 1;
            if (imagesLoaded === imagesToLoad) {
                callback();
            }
        }
        
        // Initialize symbols storage
        this.images.symbols = {};
        
        // Load each symbol
        for (let i = 0; i < symbols.length; i++) {
            let symbol = symbols[i];
            this.loadImage(symbol.path, function(img) {
                this.images.symbols['symbol' + symbol.id] = img;
                imageFinished();
            }.bind(this), imageFinished);
        }
    }
    
    // Load a single image
    loadImage(path, onSuccess, onError) {
        let img = new Image();
        
        img.onload = function() {
            console.log('Loaded: ' + path);
            onSuccess(img);
        };
        
        img.onerror = function() {
            console.warn('Failed to load: ' + path);
            onError();
        };
        
        img.src = path;
    }
    
    // Get image for a specific chart
    getChartImage(chartId, imageType) {
        let chartKey = 'chart' + chartId;
        if (this.images[chartKey] && this.images[chartKey][imageType]) {
            return this.images[chartKey][imageType];
        }
        return null;
    }
    
    // Get symbol image
    getSymbolImage(symbolId) {
        if (this.images.symbols && this.images.symbols['symbol' + symbolId]) {
            return this.images.symbols['symbol' + symbolId];
        }
        return null;
    }
}