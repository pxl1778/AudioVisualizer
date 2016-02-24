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
		var average = 0; //Average of the sound information: Low sounds are ~30, Loud sounds are ~110, most music is 65-90
		var lineDotPositions = [0, 30, -100, 200, 10, -20]; //Positions of lights on lines
		var lineDotForward = [true, false, true, false, true, true]; //Whether the lights are moving forward or back
		var invert = false, tintRed = false, noise = false, lines = false;
		
		function init(){
			//initializing variables
			canvas = document.querySelector('canvas');
			ctx = canvas.getContext("2d");
			maxRadius = 200;
			audioElement = document.querySelector('audio');
			analyserNode = createWebAudioContextWithAnalyserNode(audioElement);
			
			//hook up circle radius slider
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
			
			setupUI();
			playStream(audioElement,SOUND_1);
			update();
		}
		
		function update() { 
			requestAnimationFrame(update);
			
			// create a new array of 8-bit integers (0-255)
			var data = new Uint8Array(NUM_SAMPLES/2); 
			
			// populate the array with the frequency data
			// notice these arrays can be passed "by reference" 
			analyserNode.getByteFrequencyData(data);
			for(var i=0; i<data.length; i++)
			{
				average += data[i];
			}
			average = average/data.length;
			// OR
			//analyserNode.getByteTimeDomainData(data); // waveform data
			
			ctx.clearRect(0,0,800,600);  
			/*var barWidth = 4;
			var barSpacing = 1;
			var barHeight = 100;
			var topSpacing = 50;*/
			
			
			rotatingLines(lineDotPositions.length);
			
			for(var i=0; i<data.length; i++) { 
				ctx.fillStyle = 'rgba(0,255,0,0.6)'; 
				ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
				
				/*ctx.lineCap = "round";
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
				*/
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
		
		
		function createWebAudioContextWithAnalyserNode(audioElement) {
			var audioCtx, analyserNode, sourceNode;
			audioCtx = new (window.AudioContext || window.webkitAudioContext);
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
		
		function makeColor(red, green, blue, alpha){
   			var color='rgba('+red+','+green+','+blue+', '+alpha+')';
   			return color;
		}
		
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
		};
		
		//Takes a number of lines to be created.
		//Must be the length of both the lineDotPositions array and
		//the lineDotForward array.
		function rotatingLines(numLines){
			for(var i=0; i< numLines; i++)
			{
				var speed = (average * .1) - 2;
				ctx.save();
				ctx.translate(canvas.width/2, canvas.height/2);
				ctx.rotate(Math.PI / numLines * i);
				ctx.strokeStyle = "rgb(18, 3, 25)";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(-canvas.width/2, -canvas.height/2);
				ctx.lineTo(canvas.width/2, canvas.height/2);
				ctx.closePath();
				ctx.stroke();
				if(lineDotForward[i] == true)
				{
					lineDotPositions[i] += speed;
				}
				else
				{
					lineDotPositions[i] -= speed;
				}
				if(lineDotPositions[i] > canvas.width/2)
				{
					lineDotForward[i] = false;
				}
				if(lineDotPositions[i] < -canvas.width/2)
				{
					lineDotForward[i] = true;
				}
				var x = lineDotPositions[i];
				var y = lineDotPositions[i] * (canvas.height/canvas.width);
				//ctx.arc(x, y, 5, 0, Math.PI * 2);
				//ctx.arc(x+5, y, 10, Math.PI, Math.PI*2 /3);
				//ctx.arc(x, y+5, 10, 0, Math.PI/2);
				
				ctx.fill();
				ctx.save();
				ctx.beginPath();
				ctx.rotate(Math.atan(y/x)/300);
				ctx.translate(x, y);
				var grd = ctx.createRadialGradient(20,20*canvas.height/canvas.width, 0, 20,20*canvas.height/canvas.width, 15);
				grd.addColorStop(0, "rgb(193, 154, 227)");
				grd.addColorStop(1, "rgba(18, 3, 25, 0)")
				ctx.fillStyle = grd;
				ctx.strokeStyle = grd;
				ctx.moveTo(0, 0);
				ctx.lineTo(40, 40 * canvas.height/canvas.width);
				ctx.closePath();
				ctx.lineWidth = 5;
				ctx.stroke();
				ctx.restore();
				ctx.restore();
			}
		}
		
		window.addEventListener("load",init);
	}());