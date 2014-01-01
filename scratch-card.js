(function(){
	var isPC = ('ontouchstart' in window) ? false : true;

	// Constructor of scratch card
	function ScratchCard(options){
		this.options = options;
		this.scratchActivated = false;
		this.initialize();
	};

	// prototype of constructor ScratchCard
	ScratchCard.prototype = {
		events: {
			mousedown: isPC ? 'mousedown' : 'touchstart',
			mousemove: isPC ? 'mousemove' : 'touchmove',
			mouseup: isPC ? 'mouseup' : 'touchend'
		},
		initialize: function(){
			var options = this.options,
				self = this;

			if(this.isOptionsAvailable(options)){
				this.setImage(options, function(){
					self.setContainer(options);
					self.setCanvas(options);
					self.setCanvasContext();
					self.bindCanvasEvents();
				});
			};
		},

		// Check options, ensure it is available
		isOptionsAvailable: function(options){
			var container = options.container,
				img = options.imgSrc,
				size = options.size,
				validArea = options.validArea,
				percentage = options.percentage;

			if(!(container && container instanceof HTMLElement)){
				throw new Error('Param [container] must be given and must be a dom element.');
				return false;
			}

			if(!(img && typeof img == 'string')){
				throw new Error('Param [imgSrc] must be given and must be a string.');
				return false;
			}

			if(size && !(size instanceof Array)){
				throw new Error('Param [size] must be an array like [{width}, {height}].');
				return false;
			}

			if(validArea && !(validArea instanceof Array)){
				throw new Error('Param [validArea] must be an array like [{left}, {top}, {width}, {height}].');
				return false;
			}

			if(percentage && typeof percentage != 'number' && typeof percentage != 'string'){
				throw new Error('Param [percentage] must be a number or string like 0.8 or "0.8".');
				return false;
			}

			return true;
		},

		// Set container
		setContainer: function(options){
			var container = options.container,
				curSize = this.curSize,
				cssText = 'display: inline-block; position: relative;';

			container.style.cssText = cssText;
			container.style.width = this.curSize[0] +'px';
			container.style.height = this.curSize[1] +'px';

			this.container = container;
		},

		// Set image to the container
		setImage: function(options, callback){
			var img = new Image(),
				self = this,
				cssText = 'position: relative; z-index: 1; vertical-align: middle;';

			img.onload = function(){
				var curSize = self.getCurSize(options);

				self.origSize = [img.width, img.height];
				self.curSize = curSize;
				img.width = curSize[0];
				img.height = curSize[1];

				callback && callback();

				img.style.cssText = cssText;
				options.container.appendChild(img);
			}

			img.src = options.imgSrc;


			this.img = img;
		},

		// Set canvas to the container
		setCanvas: function(options){
			var container = options.container,
				canvas = document.createElement('canvas'),
				cssText = 'position: absolute; z-index: 2; top: 0; left: 0;'

			canvas.innerHTMl = 'Sorry, your browser dose not sypport [Canvas], please use a higher version browser and try again.'
			canvas.width = this.curSize[0];
			canvas.height = this.curSize[1];
			canvas.style.cssText = cssText;
			container.appendChild(canvas);

			this.canvas = canvas;

			// HTML5 tag shim, use this hack to set canvas's style
			// in browsers which do not support Canvas.
			document.createElement('canvas');
		},

		setCanvasContext: function(){
			var canvas = this.canvas,
				ctx = this.ctx = canvas.getContext('2d');

			this.canvasOffset = this.getOffset(canvas);

			ctx.globalCompositeOperation = "source-over";

			ctx.fillStyle = '#e0e0e0';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.lineWidth = 30; 
		},

		// get the dom(container, image, canvas) size[{width}, {height}]
		// we choosed finally
		getCurSize: function(options){
			var size = options.size,
				origSize = options.origSize;

			return (size || origSize).slice();
		},

		getOffset: function(elem){
			var offset = [elem.offsetLeft, elem.offsetTop],
				parent = elem.offsetParent;

			while(parent){
				offset[0] += parent.offsetLeft;
				offset[1] += parent.offsetTop;
				parent = parent.offsetParent;
			}

			return offset;
		},

		getScratchedPercentage: function(){
			var ctx = this.ctx,
				canvas = this.canvas,
				options = this.options,
				validArea = options.validArea || [0, 0, canvas.width, canvas.height],
				imageData = this.ctx.getImageData.apply(this.ctx, validArea).data,
				validScratchedPx = 0;
			

			for(var i = 0, len = imageData.length; i < len; i += 4){
				if(imageData[i] == 0) validScratchedPx++;
			}

			return validScratchedPx / (len / 4);
		},

		bindCanvasEvents: function(){
			var canvas = this.canvas,
				events = this.events,
				self = this;

			console.log(events['mousedown'])

			canvas.addEventListener(events['mousedown'], function(e){
				self.mousedownHandler(e);
			});

			canvas.addEventListener(events['mousemove'], function(e){
				self.mousemoveHandler(e);
			});

			canvas.addEventListener(events['mouseup'], function(e){
				self.mouseupHandler(e);
			});

			canvas.addEventListener('mouseout', function(e){
				self.mouseupHandler(e);
				self.mouseoutHandler(e);
			});
		},

		mousedownHandler: function(e){
			var ctx = this.ctx,
				canvasOffset = this.canvasOffset;

			this.scratchActivated = true;
			ctx.beginPath();
			ctx.moveTo(e.pageX - canvasOffset[0], e.pageY - canvasOffset[1]);
		},

		mousemoveHandler: function(e){
			if(!this.scratchActivated) return;

			var ctx = this.ctx,
				canvasOffset = this.canvasOffset;

			e.preventDefault();

			ctx.lineTo(e.pageX - canvasOffset[0], e.pageY - canvasOffset[1]);
			ctx.globalCompositeOperation = "destination-out";
			ctx.stroke();
		},

		mouseupHandler: function(e){
			var ctx = this.ctx;

			this.scratchActivated = false;
			ctx.closePath();

			this.isOktoShowAll(this.getScratchedPercentage());
		},

		mouseoutHandler: function(e){
			this.scratchActivated = false;
		},

		isOktoShowAll: function(curPercentage){
			var percentage = this.options.percentage;

			percentage = percentage || 0.8;
			if(curPercentage >= percentage){
				this.showAll();
			}
		},

		showAll: function(){
			this.canvas.style.display = 'none';
		}
	};

	window.ScratchCard = ScratchCard;
})();