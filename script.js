(function(){
		"use strict";
		
		var NUM_SAMPLES = 256;
		var SOUND_1 = 'media/New Adventure Theme.mp3';
		var SOUND_2 = 'media/Peanuts Theme.mp3';
		var SOUND_3 = 'media/The Picard Song.mp3';
		var audioElement;
		var analyserNode;
		var canvas,ctx;
		var maxRadius;
		var invert = false, tintRed = false, noise = false, lines = false;
		
		function init(){
			// set up canvas stuff
			canvas = document.querySelector('canvas');
			ctx = canvas.getContext("2d");
			maxRadius = 200;
			
			// get reference to <audio> element on page
			audioElement = document.querySelector('audio');
			
			//hook up circle radius
			document.querySelector('#circleRadiusSlider').onchange = function(e){
				maxRadius = e.target.value;
			};
			
			//hookup checkboxes
			document.querySelector('#tintRedCheckbox').onchange = function(e){
				tintRed = e.target.checked;
			}
			document.querySelector('#invertCheckbox').onchange = function(e){
				invert = e.target.checked;
			}
			document.querySelector('#noiseCheckbox').onchange = function(e){
				noise = e.target.checked;
			}
			document.querySelector('#linesCheckbox').onchange = function(e){
				lines = e.target.checked;
			}
			
			// call our helper function and get an analyser node
			analyserNode = createWebAudioContextWithAnalyserNode(audioElement);
			
			// get sound track <select> and Full Screen button working
			setupUI();
			
			// load and play default sound into audio element
			playStream(audioElement,SOUND_1);
			
			// start animation loop
			update();
		}
		
		
		function createWebAudioContextWithAnalyserNode(audioElement) {
			var audioCtx, analyserNode, sourceNode;
			// create new AudioContext
			// The || is because WebAudio has not been standardized across browsers yet
			// http://webaudio.github.io/web-audio-api/#the-audiocontext-interface
			audioCtx = new (window.AudioContext || window.webkitAudioContext);
			
			// create an analyser node
			analyserNode = audioCtx.createAnalyser();
			
			/*
			We will request NUM_SAMPLES number of samples or "bins" spaced equally 
			across the sound spectrum.
			
			If NUM_SAMPLES (fftSize) is 256, then the first bin is 0 Hz, the second is 172 Hz, 
			the third is 344Hz. Each bin contains a number between 0-255 representing 
			the amplitude of that frequency.
			*/ 
			
			// fft stands for Fast Fourier Transform
			analyserNode.fftSize = NUM_SAMPLES;
			
			// this is where we hook up the <audio> element to the analyserNode
			sourceNode = audioCtx.createMediaElementSource(audioElement); 
			sourceNode.connect(analyserNode);
			
			// here we connect to the destination i.e. speakers
			analyserNode.connect(audioCtx.destination);
			return analyserNode;
		}
		
		function setupUI(){
			document.querySelector("#trackSelect").onchange = function(e){
				playStream(audioElement,e.target.value);
			};
			
			document.querySelector("#fsButton").onclick = function(){
				requestFullscreen(canvas);
			};
		}
		
		function playStream(audioElement,path){
			audioElement.src = path;
			audioElement.play();
			audioElement.volume = 0.2;
			document.querySelector('#status').innerHTML = "Now playing: " + path;
		}
		
		function update() { 
			// this schedules a call to the update() method in 1/60 seconds
			requestAnimationFrame(update);
			
			/*
				Nyquist Theorem
				http://whatis.techtarget.com/definition/Nyquist-Theorem
				The array of data we get back is 1/2 the size of the sample rate 
			*/
			
			// create a new array of 8-bit integers (0-255)
			var data = new Uint8Array(NUM_SAMPLES/2); 
			
			// populate the array with the frequency data
			// notice these arrays can be passed "by reference" 
			analyserNode.getByteFrequencyData(data);
		
			// OR
			//analyserNode.getByteTimeDomainData(data); // waveform data
			
			// DRAW!
			ctx.clearRect(0,0,800,600);  
			var barWidth = 4;
			var barSpacing = 1;
			var barHeight = 100;
			var topSpacing = 50;
			
			// loop through the data and draw!
			for(var i=0; i<data.length; i++) { 
				ctx.fillStyle = 'rgba(0,255,0,0.6)'; 
				ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
				// the higher the amplitude of the sample (bin) the taller the bar
				// remember we have to draw our bars left-to-right and top-down
				/*ctx.fillRect(i * (barWidth + barSpacing),topSpacing + 256-data[i],barWidth,barHeight); 
				ctx.fillRect(640 - i * (barWidth + barSpacing), topSpacing + 256 - data[i] - 20, barWidth, barHeight);
				*/
				ctx.lineCap = "round";
				ctx.lineWidth = 20;
				ctx.beginPath();
				ctx.moveTo(i*(barWidth + barSpacing), topSpacing + 256 - data[i]);
				ctx.lineTo(i*(barWidth + barSpacing), topSpacing + 256 - data[i]+barHeight);
				ctx.closePath();
				ctx.stroke();
				
				ctx.strokeStyle = 'rgba(0, 0, 255, 0.2)';
				ctx.lineWidth = 20;
				ctx.beginPath();
				ctx.moveTo(640 - i*(barWidth + barSpacing), topSpacing + 256 - data[i]);
				ctx.lineTo(640-i*(barWidth + barSpacing), topSpacing + 256 - data[i]+barHeight);
				ctx.closePath();
				ctx.stroke();
				//red circles
				var percent = data[i] / 255;
				var circleRadius = percent * maxRadius;
				ctx.beginPath();
				ctx.fillStyle = makeColor(255, 111, 111, .34 - percent/ 3.0);
				ctx.arc(canvas.width/2, canvas.height/2, circleRadius, 0, 2*Math.PI, false);
				ctx.fill();
				ctx.closePath();
				//blue circles
				ctx.beginPath();
				ctx.fillStyle = makeColor(0, 0, 255, .10 - percent/10.0);
				ctx.arc(canvas.width/2, canvas.height/2, circleRadius * 1.5, 0, 2*Math.PI);
				ctx.fill();
				ctx.closePath();
				//yellow circles
				ctx.save();
				ctx.beginPath();
				ctx.fillStyle = makeColor(200, 200, 0, .5 - percent/5.0);
				ctx.arc(canvas.width/2, canvas.height/2, circleRadius * .5, 0, 2*Math.PI);
				ctx.fill();
				ctx.closePath();
				ctx.restore();
			}
			document.querySelector("#sliderResults").innerHTML = maxRadius;
			manipulatePixels();
		} 
		
		function manipulatePixels(){
			var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			var data = imageData.data;
			var length = data.length;
			var width = imageData.width;
			for(var i=0; i<length; i+=4)
			{
				if(tintRed){
					data[i] = data[i] + 100;
				}
				if(invert){
					var red = data[i], green = data[i+1], blue = data[i+2];
					data[i] = 255 - red;
					data[i+1] = 255 - green;
					data[i+2] = 255 - blue;
				}
				if(noise && Math.random() < .10){
					data[i] = data[i+1] = data[i+2] = 128;
					//data[i] = data[i+1] = data[i+2] = 255;
					//data[i] = data[i+1] = data[i+2] = 0;
				}
				if(lines){
					var row = Math.floor(i/4/width);
					if(row % 50 == 0)
					{
						data[i] = data[i+1] = data[i+2] = data[i+3] = 255;
						data[i + (width*4)] = data[i + (width*4)+1] = data[i + (width*4)+2] = data[i + (width*4)+3];
					}
				}
			}
			ctx.putImageData(imageData, 0, 0);
		}
		// HELPER
		function makeColor(red, green, blue, alpha){
   			var color='rgba('+red+','+green+','+blue+', '+alpha+')';
   			return color;
		}
		
		 // FULL SCREEN MODE
		function requestFullscreen(element) {
			if (element.requestFullscreen) {
			  element.requestFullscreen();
			} else if (element.mozRequestFullscreen) {
			  element.mozRequestFullscreen();
			} else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
			  element.mozRequestFullScreen();
			} else if (element.webkitRequestFullscreen) {
			  element.webkitRequestFullscreen();
			}
			// .. and do nothing if the method is not supported
		};
		
		
		window.addEventListener("load",init);
	}());