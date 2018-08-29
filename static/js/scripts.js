
// THREEJS RELATED VARIABLES

var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, 
	renderer, container, controls, raycaster, sphere_radius, helper,
	INTERSECTED, HEIGHT, WIDTH;

//SCREEN & MOUSE VARIABLES
var mousePos = { x: 0, y: 0 },
	hoverMousePos = { x: 0, y: 0 };

// TONEJS + AUDIO THINGS
var mic;
var average_fft = 0.1;
var fft_hits = 0;
var average_session_fft = 0;

// GENERAL STUFF
var is_debugging = false;

var domain;
var server_data;
var server_data_list;
if (is_debugging) {
	domain = "";
	server_data = main_data;
	server_data_list = main_data;

}else {
	domain = "https://summon.project9.co.kr/";
}

var data_to_post;
var added_data;
var location_data = {"country":"", "city":"", "sublocality_level_1" : "", "sublocality_level_2" : ""}
var search_attr = 'city';
var autocomplete_data = [];
var autocomplete_filtered = [];

var disable_intro = false;
var k = 3;
var ripple_rate = 200;
var blob_time = performance.now() * 0.0002;
var custom_blob_time;

var land_opacity = 0.06;
var sea_opacity = 0.15;

var onMoon = true;
var onRecordUI = false;	
var isRecording = false;
var viewingList = false;
var isIntro = true;
var is_daytime = false;



// GET DATA FROM SERVER
function getData() {
	$.ajax({
	  method: "GET",
	  url: domain+"/music",
	  crossDomain: true
	}).done(function(json, textStatus, jqXHR) {
	    // print the output from the endpoint
	    console.log('getData data:', json.data);
	    server_data = json.data;
	    // assign list data seperately
	    server_data_list = json.data;
	    
	    // run everything once data is ready 

		createScene();
		// createLights();
		createSea();
		createIsland(0, false);
		createReflection();
		if (window.orientation == undefined) {
			createMirror();
		} else {
			createMirror();
		}

		// init gmaps for user's location
		initMap()

		// check time of day to update form
		checkTime();

		$('.loading_message').fadeOut();
		$('.splash_ui').fadeIn();

		$('.start_intro').click(function() {
			getUserMedia();
			
		});
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
	    console.log("HTTP Request Failed",jqXHR);
	})
	.always(function() {
		console.log('getData() request made')
	});
}


// CHECK TIME OF DAY AND SET VARIABLES

function checkTime() {

	console.log('checking time')

	var timeofday = new Date();
	if ( timeofday.getHours() < 19) {
		is_daytime = true;
	}

	if (is_daytime) {
		sea.mesh.geometry = new THREE.SphereGeometry(1,16,16);
	} else {
		sea.mesh.geometry = new THREE.SphereGeometry(1,8,8);
	}

	// start daytime
	if (timeofday.getHours() == 7 || timeofday.getHours() == 8) {
		ripple_rate = 50;
		custom_blob_time = 0.0009;
	}
	else if (timeofday.getHours() == 9 || timeofday.getHours() == 10) {
		ripple_rate = 70;
		custom_blob_time = 0.0009;
	}
	else if (timeofday.getHours() == 11 || timeofday.getHours() == 12) {
		ripple_rate = 100;
		custom_blob_time = 0.0009;
	}
	else if (timeofday.getHours() == 13 || timeofday.getHours() == 14) {
		ripple_rate = 140;
		custom_blob_time = 0.0003;
	}
	else if (timeofday.getHours() == 15 || timeofday.getHours() == 16) {
		ripple_rate = 170;
		custom_blob_time = 0.0003;
	}
	else if (timeofday.getHours() == 17 || timeofday.getHours() == 18) {
		ripple_rate = 180;
		custom_blob_time = 0.0003;
	}
	// start nighttime
	else if (timeofday.getHours() == 19 || timeofday.getHours() == 20) {
		ripple_rate = 240;
		custom_blob_time = 0.0007;
	}
	else if (timeofday.getHours() == 21 || timeofday.getHours() == 22) {
		ripple_rate = 250;
		custom_blob_time = 0.0007;
	}
	else if (timeofday.getHours() == 23 || timeofday.getHours() == 0) {
		ripple_rate = 260;
		custom_blob_time = 0.0007;
	}
	else if (timeofday.getHours() == 1 || timeofday.getHours() == 2) {
		ripple_rate = 270;
		custom_blob_time = 0.0007;
	}
	else if (timeofday.getHours() == 3 || timeofday.getHours() == 4) {
		ripple_rate = 280;
		custom_blob_time = 0.0007;
	}
	else if (timeofday.getHours() == 5 || timeofday.getHours() == 6) {
		ripple_rate = 300;
		custom_blob_time = 0.0007;
	}


}



//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	scene = new THREE.Scene();
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
	fieldOfView,
	aspectRatio,
	nearPlane,
	farPlane
	);
	scene.fog = new THREE.Fog(0x141414, 100, 5000);

	camera.position.x = 0;
	if (window.orientation == undefined) {
		camera.position.z = 1900;	
	} else {
		camera.position.z = 2000;
	}
	
	camera.position.y = 850;

	renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
	renderer.setSize(WIDTH, HEIGHT);
	renderer.setClearColor(0x141414, 1);
	container = document.getElementById('world');
	container.appendChild(renderer.domElement);

	raycaster = new THREE.Raycaster();

	window.addEventListener('resize', handleWindowResize, false);
}

// HANDLE SCREEN EVENTS

function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}


// LIGHTS

var ambientLight, hemisphereLight, shadowLight;

function createLights() {
	var lights = [];
	var light_settings = new THREE.PointLight( 0xffffda, 0.5, 0 );
	lights[ 0 ] = new THREE.PointLight( 0xffffda, 0.4, 0 );
	lights[ 1 ] = new THREE.PointLight( 0xffffda, 0.4, 0 );
	lights[ 2 ] = new THREE.PointLight( 0xffffda, 0.4, 0 );
	lights[ 3 ] = new THREE.PointLight( 0xffffda, 0.4, 0 );
	lights[ 4 ] = new THREE.PointLight( 0xffffda, 0.4, 0 );
	lights[ 5 ] = new THREE.PointLight( 0xffffda, 0.4, 0 );

	lights[ 6 ] = new THREE.AmbientLight( 0xffffda, 0.6 )

	lights[ 0 ].position.set( 0, 3000, 0 );
	lights[ 1 ].position.set( 0, -3000, 0 );
	lights[ 2 ].position.set( -3000, 0, 0 );
	lights[ 3 ].position.set( 3000, 0, 0 );
	lights[ 4 ].position.set( 0, 0, 3000 );
	lights[ 5 ].position.set( 0, 0, -3000 );

	scene.add( lights[ 0 ] );
	scene.add( lights[ 1 ] );
	scene.add( lights[ 2 ] );
	scene.add( lights[ 3 ] );
	scene.add( lights[ 4 ] );
	scene.add( lights[ 5 ] );
	scene.add( lights[ 6 ] );

}

// function to get random sphere point
function randomSpherePoint(x0,y0,z0,radius){
   var u = Math.random();
   var v = Math.random();
   var theta = 2 * Math.PI * u;
   var phi = Math.acos(2 * v - 1);
   var x = x0 + (radius * Math.sin(phi) * Math.cos(theta));
   var y = y0 + (radius * Math.sin(phi) * Math.sin(theta));
   var z = z0 + (radius * Math.cos(phi));
   return [x,y,z];
}

Island = function(){
	this.mesh = new THREE.Object3D();
	this.mesh.name = "Islands";
	// choose a number of clouds to be scattered in the sky
	// this.nLands = 100;

	this.lands = [];

	// To distribute the clouds consistently,
	// we need to place them according to a uniform angle
	
	for(var i = 0; i < server_data.length; i++){
		var c = new Land(i);
		this.lands.push(c);

		var randPos = randomSpherePoint(0,0,0,sphere_radius);
		c.mesh.position.y = randPos[1];
		c.mesh.position.x = randPos[0];
		c.mesh.position.z = randPos[2];

		c.mesh.lookAt( 0, 0, 0 );

		// do not forget to add the mesh of each cloud in the scene
		this.mesh.add(c.mesh);
	}
}

Land = function(land_index){
	this.mesh = new THREE.Object3D();
	this.mesh.name = "land_obj3d";


	var land_geom;

	var land_mat = new THREE.MeshBasicMaterial({
		color:0xffffff,
		wireframe:false,
		transparent:true,
		opacity:land_opacity,
	});


	var randomHeight = Math.floor(Math.random() * 150) + 80;
	var randomBase = Math.floor(Math.random() * 4) + 0;

	//land_geom = new THREE.CylinderGeometry( 1, 10, randomHeight, 16 );
	if (window.orientation == undefined) {
		land_geom = new THREE.ConeGeometry( 10, 50, 8, 8 );
	} else {
		land_geom = new THREE.ConeGeometry( 5, 30, 4, 4 );
	}
	
	
	// make cylinders rotate 90degs on x axis
	land_geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));	

	var m = new THREE.Mesh(land_geom.clone(), land_mat);
	m.name = "Land";
	m.nameid = "land_"+server_data[land_index].thenum;
	m.numid = server_data[land_index].thenum;
	m.location = server_data[land_index].location;
	m.sound = server_data[land_index].mediafname;
	m.position.x = 0;
	//m.position.y = randomHeight / 2 - 20;
	m.position.y = 0;
	m.position.z = -randomHeight / 2 + 50;
	//m.rotation.z = Math.random()*Math.PI*2;
	m.rotation.y = Math.PI*2 * sphere_radius;

	this.mesh.add(m);



}


Sea = function(){

	sphere_radius = 600
	// radius top, radius bottom, height, number of segments on the radius, number of segments vertically
	var sphere_geom = new THREE.SphereGeometry(1,4,4);
	// rotate the geometry on the x axis
	//sphere_geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));	

	// important: by merging vertices we ensure the continuity of the waves
	sphere_geom.mergeVertices();

	// get the vertices
	var l = sphere_geom.vertices.length;

	// create an array to store new data associated to each vertex
	this.waves = [];

	for (var i=0; i<l; i++){
		// get each vertex
		var v = sphere_geom.vertices[i];

		// store some data associated to it
		this.waves.push({
			y:v.y,
			x:v.x,
			z:v.z,
			// a random angle
			ang:Math.random()*Math.PI*2,
			// a random distance
			amp:5 + Math.random()*15,
			// a random speed between 0.016 and 0.048 radians / frame
			speed:0.016 + Math.random()*0.032
		});
	};


	var mat = new THREE.MeshBasicMaterial({
		color:0xffffff,
		transparent:true,
		opacity:sea_opacity,
		wireframe:true
	});
	this.mesh = new THREE.Mesh(sphere_geom, mat);
	this.mesh.name = "sea";

}


function blob_anim() {
	blob_time = performance.now() * custom_blob_time;

	// animate blob
	if (sea != undefined) {
		for (var i = 0; i < sea.mesh.geometry.vertices.length; i++) {
		    var p = sea.mesh.geometry.vertices[i];
		    p.normalize().multiplyScalar(600 + ripple_rate * noise.perlin3(p.x * k + blob_time, p.y * k + blob_time, p.z * k + blob_time));
		    //console.log(p)
		}

		sea.mesh.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
		sea.mesh.geometry.computeVertexNormals();
		sea.mesh.geometry.normalsNeedUpdate = true;


	}

	// animate islands
	if (island != undefined) {
		for (var ci = 0; ci < island.lands.length; ci++) {

			for (var cz = 0; cz < island.lands[ci].mesh.children[0].geometry.vertices.length; cz++) {
			    var p = island.lands[ci].mesh.children[0].geometry.vertices[cz];
			    p.normalize().multiplyScalar(50 + 200 * noise.perlin3(p.x * k + blob_time, p.y * k + blob_time, p.z * k + blob_time));
			    //console.log(p)
			}

			island.lands[ci].mesh.children[0].geometry.verticesNeedUpdate = true; //must be set or vertices will not update
			island.lands[ci].mesh.children[0].geometry.computeVertexNormals();
			island.lands[ci].mesh.children[0].geometry.normalsNeedUpdate = true;

		}

	}

	



}


Reflection = function(){
	// radius top, radius bottom, height, number of segments on the radius, number of segments vertically
	
	if (window.orientation == undefined) {
		var geom_reflect = new THREE.PlaneGeometry(5000,5000,16,16);
	} else {
		var geom_reflect = new THREE.PlaneGeometry(4000,4000,8,8);
	}
	// rotate the geometry on the x axis
	geom_reflect.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));	

	// important: by merging vertices we ensure the continuity of the waves
	geom_reflect.mergeVertices();

	// get the vertices
	var l = geom_reflect.vertices.length;

	// create an array to store new data associated to each vertex
	this.waves = [];

	for (var i=0; i<l; i++){
		// get each vertex
		var v = geom_reflect.vertices[i];

		// store some data associated to it
		this.waves.push({
			y:v.y,
			x:v.x,
			z:v.z,
			// a random angle
			ang:Math.random()*Math.PI*2,
			// a random distance
			amp:5 + Math.random()*15,
			// a random speed between 0.016 and 0.048 radians / frame
			speed:0.016 + Math.random()*0.032
		});
	};


	var mat_reflect = new THREE.MeshBasicMaterial({
		color:0xffffff,
		transparent:true,
		opacity:0.1,
		wireframe:true
	});
	this.mesh = new THREE.Mesh(geom_reflect, mat_reflect);
	this.mesh.name = 'reflection';

	this.mesh.scale.set( 1, 1, 1 )



}

Reflection.prototype.moveWaves = function (){
	// get the vertices
	var verts = this.mesh.geometry.vertices;
	var l = verts.length;
	for (var i=0; i<l; i++){
		var v = verts[i];

		// get the data associated to it
		var vprops = this.waves[i];

		// update the position of the vertex
		v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;

		// increment the angle for the next frame
		vprops.ang += vprops.speed;
	}
	this.mesh.geometry.verticesNeedUpdate=true;
	//reflection.mesh.rotation.z += .0009;
}


// 3D Models
var sea;
var island;
var reflection;
var groundMirror;


function createSea(){
	sea = new Sea();
	sea.mesh.position.y = 0;
	scene.add(sea.mesh);
}
function createIsland(ypos, visiblity){
	// first delete all instances of islands
	delete3DOBJ('Islands');
	// then create
	island = new Island();
	island.mesh.position.y = ypos;
	island.mesh.visible = visiblity;
	scene.add(island.mesh);
}
function createReflection(){
	reflection = new Reflection();
	reflection.mesh.position.y = 20;
	scene.add(reflection.mesh);
}

function createMirror() {
	// reflectors/mirrors

	var mirWIDTH = window.innerWidth;
	var mirHEIGHT = window.innerHeight;
	if (window.orientation == undefined) {
		var geom_mirror = new THREE.PlaneBufferGeometry( 5000.1, 5000.1 );
	} else {
		var geom_mirror = new THREE.PlaneBufferGeometry( 4000.1, 4000.1 );
	} 
	groundMirror = new THREE.Reflector( geom_mirror, {
	clipBias: 0.003,
	textureWidth: mirWIDTH * window.devicePixelRatio,
	textureHeight: mirHEIGHT * window.devicePixelRatio,
	color: 0x777777,
	transparent:true,
	opacity:0,
	recursion: 1
	} );
	groundMirror.name = "groundMirror";
	groundMirror.position.y = 0;
	groundMirror.rotateX( - Math.PI / 2 );
	scene.add( groundMirror );
}

function playApollo() {
	// play recording
	apollo_bgm = new Audio('sound/apollo.mp3');
	apollo_bgm.volume = 0.2;
	apollo_bgm.addEventListener('ended', function() {
	    this.currentTime = 0;
	    this.play();
	}, false);
	apollo_bgm.play();	

}

function fadeApollo(inout) {  

	console.log(inout)
	if (inout == "out"){
	    fadeAudioInterval = setInterval(function(){
	        apollo_bgm.volume = (parseFloat(apollo_bgm.volume) - 0.2).toFixed(1);

	        if (apollo_bgm.volume == 0) {
	        	clearInterval(fadeAudioInterval)
	        }
	    }, 100);		
	} else {
	    fadeAudioInterval = setInterval(function(){
	        apollo_bgm.volume = (parseFloat(apollo_bgm.volume) + 0.2).toFixed(1);

	        if (apollo_bgm.volume == 1) {
	        	clearInterval(fadeAudioInterval)
	        }
	    }, 100);		
	}

}

function loop(){	



	if (!onMoon && !onRecordUI && !viewingList) {
		blob_anim()	

		if (window.orientation == undefined) {
			sea.mesh.rotation.y += 0.003;
			sea.mesh.rotation.x += 0.003;
			sea.mesh.rotation.z += 0.003;

			if (island != undefined) {
				island.mesh.rotation.y += 0.003;
				island.mesh.rotation.x += 0.003;
				island.mesh.rotation.z += 0.003;				
			}


			reflection.mesh.rotation.y += 0.005;
		} else {
		    sea.mesh.rotation.y += gamma / 50;
		    sea.mesh.rotation.x += beta / 50;

		    if (island != undefined) {
				island.mesh.rotation.y += gamma / 50;
				island.mesh.rotation.x += beta/ 50;
			}

			reflection.mesh.rotation.y += 0.003;
		}

		reflection.moveWaves();
	}

	
	
	renderer.render(scene, camera);
	requestAnimationFrame(loop);
	


	

	// required if controls.enableDamping or controls.autoRotate are set to true
	// if (controls != undefined) {
	// 	controls.update();	
	// }
	
	camera.lookAt ( 0,0,0 );
	stats.update();


	// if mic is open 
	//draw the waveform
	if (getUserMediaState == 'open' ) {
		var canvasWidth = context.canvas.width;
		var canvasHeight = context.canvas.height;
		//draw the waveform
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		var values = analyser.getValue();
		//console.log(values)
		
		context.beginPath();
		context.lineJoin = "round";
		context.lineWidth = 1.5;
		context.strokeStyle = "#717171";
		context.moveTo(0, (values[0] + 1) / 2 * canvasHeight);


		for (var i = 1, len = values.length; i < len; i++){
			var val = (values[i] + 1) / 2;
			var x = canvasWidth * (i / (len - 1));
			var y = val * canvasHeight;
			context.lineTo(x, y);
		}
		context.stroke();
	}

}

function findIntersections(mouseP) {
	// find intersections
	raycaster.setFromCamera( mouseP, camera );

	var intersects = raycaster.intersectObjects( scene.children, true );

	if ( intersects.length > 0  ) {

		if ( INTERSECTED != intersects[ 0 ].object ) {

			if ( INTERSECTED ) {
				console.log('[R1]', INTERSECTED)
				INTERSECTED.material.color = {r: 1, g: 1, b: 1}
				INTERSECTED.material.opacity = land_opacity;	
				reflection.mesh.material.opacity = 0.1;	
				reflection.mesh.material.color = {r: 1, g: 1, b: 1}
				// keep latest data always highlighted
				island.mesh.children[island.mesh.children.length-1].children[0].material.opacity = 0.2;
			}

			INTERSECTED = intersects[ 0 ].object;
			if ( INTERSECTED.name == 'Land') {

				var randColor = Math.floor(Math.random() * 4) + 0;
				var colorRange = [0xff0000, 0xffffff, 0x1e00ff, 0xfff000]

				INTERSECTED.currentHex = INTERSECTED.material.color = {r: 1, g: 1, b: 1}
				INTERSECTED.material.color = new THREE.Color( colorRange[randColor] );	
				INTERSECTED.material.opacity = 0.05;	
				reflection.mesh.material.color = {r: 1, g: 1, b: 1}	
				// keep latest data always highlighted
				island.mesh.children[island.mesh.children.length-1].children[0].material.opacity = 0.2;




				console.log('[R2]', INTERSECTED)
				//console.log(colorRange[randColor] )

				if (is_debugging) {
					var myAudioObject = new Audio(domain+'sound/'+INTERSECTED.sound);	
				} else {
					var myAudioObject = new Audio(domain+'/musicfile/'+INTERSECTED.sound);
				}
				
				myAudioObject.volume = 0.1;
				myAudioObject.play();	
			}

		}

	} else {

		if ( INTERSECTED ) {
			console.log('[R3]', INTERSECTED)
			INTERSECTED.material.color = {r: 1, g: 1, b: 1};
			INTERSECTED.material.opacity = land_opacity;	
			reflection.mesh.material.opacity = 0.1;	
			reflection.mesh.material.color = {r: 1, g: 1, b: 1}
			// keep latest data always highlighted
			island.mesh.children[island.mesh.children.length-1].children[0].material.opacity = 0.2;
		} 

		INTERSECTED = null;

	}
};


function delete3DOBJ(objName){
    var selectedObject = scene.getObjectByName(objName);
    scene.remove( selectedObject );
}


// HANDLE MOUSE EVENTS

function handleMouseMove(event) {
	event.preventDefault()
	var tx = -1 + (event.clientX / WIDTH)*2;
	var ty = 1 - (event.clientY / HEIGHT)*2;
	hoverMousePos = {x:tx, y:ty};

	findIntersections(hoverMousePos);
}

var beta = 0;
var gamma = 0;

function handleGyro(event) {
	event.preventDefault()

    beta   = event.beta / 100;
    gamma  = event.gamma / 100;


	// console.log('b:'+beta / 1000)

	var tx = gamma / 50;
	var ty = 1 - (event.clientY / HEIGHT)*2;

    //console.log('b:'+beta+' g:'+gamma)
	// console.log(tx);
}

function handleClick(event) {
	event.preventDefault()
	if ( event.type == 'touchstart' ) {
		var tx = -1 + (event.changedTouches[0].pageX / WIDTH)*2;
		var ty = 1 - (event.changedTouches[0].pageY / HEIGHT)*2;
		mousePos = {x:tx, y:ty};
		console.log('touch',mousePos);

		findIntersections(mousePos);

	} else if ( event.type == 'click' ) {
		var tx = -1 + (event.clientX / WIDTH)*2;
		var ty = 1 - (event.clientY / HEIGHT)*2;
		mousePos = {x:tx, y:ty};

		console.log('click',mousePos)

	}

	//console.log('touched', event.changedTouches[0].pageX)

}


window.addEventListener('load', init, false);


	// FPS STATS
	var stats = new Stats();
	container = document.createElement( 'div' );
	container.classList.add("stats_ui");
	document.body.appendChild( container );
	container.appendChild( stats.dom );



/*** RECORDING CODE ***/


	//webkitURL is deprecated but nevertheless
	URL = window.URL || window.webkitURL;

	var gumStream; 						//stream from getUserMedia()
	var recorder; 						//WebAudioRecorder object
	var input; 							//MediaStreamAudioSourceNode  we'll be recording
	var encodeAfterRecord = true;       // when to encode

	// shim for AudioContext when it's not avb. 
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext; //new audio context to help us record

	var canvas_ctx = $("#live_wave");
	var context = canvas_ctx.get(0).getContext("2d");


	var getUserMediaState = 'not_open';
	
	var analyser;

	//add events to those 2 buttons
	$("#recordButton").click(function() {
		beginRecording();
	})
	$("#stopButton").click(function() {
		stopRecording();
	})
	$("#submitButton").click(function() {
		submitAudio();
	})

	function getUserMedia() {

		console.log('getUserMedia ran')

		// Tone.js inits
		mic = new Tone.UserMedia();
		analyser = new Tone.Waveform(256);
		mic.connect(analyser);

		navigator.mediaDevices.getUserMedia({ audio: true, video:false }).then(function(stream) {
			getUserLocation();
			console.log("getUserMedia() success, stream created, initializing WebAudioRecorder...");

			// open Tone.js mic
			mic.open();

			getUserMediaState = 'open';

			//

			audioContext = new AudioContext();

			analyser_vol = audioContext.createAnalyser();

			//assign to gumStream for later use
			gumStream = stream;
			
			/* use the stream */
			input = audioContext.createMediaStreamSource(stream);

			javascriptNode = audioContext.createScriptProcessor(256, 1, 1);
			analyser_vol.smoothingTimeConstant = 0.8;
			analyser_vol.fftSize = 64;

			input.connect(analyser_vol);
			analyser_vol.connect(javascriptNode);
			javascriptNode.connect(audioContext.destination);

			javascriptNode.onaudioprocess = function() {

				if (isRecording) {
					var array = new Uint8Array(analyser_vol.frequencyBinCount);
					analyser_vol.getByteFrequencyData(array);
					var values = 0;

					var length = array.length;
					for (var i = 0; i < length; i++) {
					  values += (array[i]);
					}

					average_fft = values / length; 
					fft_hits += 1;
					average_session_fft += average_fft;

					//console.log(average_fft);					
					//console.log(average_fft, fft_hits)
				}


			} // end fn stream

		}).catch(function(err) {
			console.log(err)
			alert(err)
		});


	}

	function beginRecording() {

		navigator.mediaDevices.getUserMedia({ audio: true, video:false }).then(function(stream) {
			console.log("getUserMedia() success, stream created, initializing WebAudioRecorder...");


			/*
				create an audio context after getUserMedia is called
				sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
				the sampleRate defaults to the one set in your OS for your playback device

			*/

			audioContext = new AudioContext();

			//assign to gumStream for later use
			gumStream = stream;
			
			/* use the stream */
			// input = audioContext.createMediaStreamSource(stream);

			//get the encoding 
			encodingType = "mp3";

			fft_hits = 0;
			average_session_fft = 0;
			console.log('fft_hits & average_session_fft should reset',fft_hits, average_session_fft)

			recorder = new WebAudioRecorder(input, {
			  workerDir: "js/", // must end with slash
			  encoding: encodingType,
			  numChannels:2, //2 is the default, mp3 encoding supports only 2
			  onEncoderLoading: function(recorder, encoding) {
			    // show "loading encoder..." display
			    console.log("Loading "+encoding+" encoder...");
			  },
			  onEncoderLoaded: function(recorder, encoding) {
			    // hide "loading encoder..." display
			    console.log(encoding+" encoder loaded");
				//start the recording process
				recorder.startRecording();
				console.log("Recording started");
				isRecording = true;
			  }
			});

			recorder.onComplete = function(recorder, blob) { 
				console.log("Encoding complete");
				createDownloadLink(blob,recorder.encoding);
			}

			recorder.setOptions({
			  timeLimit:120,
			  encodeAfterRecord:encodeAfterRecord,
			  mp3: {bitRate: 320}
			});


			//start the recording process
			recorder.startRecording();
			console.log("Recording started");



			// empty recording list
			$('#recordingsList').empty();
			$("#recordButton").text('Recording...');
			$('#submitButton').hide();
			$('#recordingsList').hide();

			$('#live_wave').show();

			// stop recording after 3 seconds
			setTimeout(function(){ 
				stopRecording() 
			}, 5200);



			$("#stopButton").removeClass('disabled');
			$("#recordButton").addClass('disabled');



		}).catch(function(err) {
		  	//enable the record button if getUSerMedia() fails
			$("#stopButton").addClass('disabled');
			$("#recordButton").removeClass('disabled');

		});
		
	}

	function stopRecording() {
		console.log("stopRecording() called");
		
		//stop microphone access
		gumStream.getAudioTracks()[0].stop();
		
		//tell the recorder to finish the recording (stop recording + encode the recorded audio)
		recorder.finishRecording();

		console.log('Recording stopped');
		isRecording = false;

		$('#live_wave').hide();

		$("#recordButton").text('Encoding Audio. Please Wait...');
		// $('#recordingsList').html('');
	}

	// audio blob url
	var blob_link;
	var au_gl;
	var audio_blob;

	function createDownloadLink(blob,encoding) {
		

		// audio data to send to server
		audio_blob = blob;
		console.log(audio_blob)

		var url = URL.createObjectURL(blob);
		blob_link = URL.createObjectURL(blob);
		console.log(blob_link)
		var au = document.createElement('audio');
		var li = document.createElement('li');
		var link = document.createElement('a');

		// get average volume of recorded audio [0-255 range]
		average_session_fft = average_session_fft / fft_hits
		console.log('RECORDING AVERAGE FFT:', average_session_fft)

		//add controls to the <audio> element
		au.controls = true;
		au.controlsList = "nodownload";

		au.src = url;

		//link the a element to the blob
		link.href = url;
		link.download = new Date().toISOString() + '.'+encoding;
		link.innerHTML = link.download;

		//add the new audio and a elements to the li element
		li.appendChild(au);
		// li.appendChild(link);

		//add the li element to the ordered list
		$('#recordingsList').html(li);
		$("#recordButton").text('Re-Record');
		$(".record_ui .text_wrap p").html('You can re-record the snippet if you wish.<br>Click on <strong>SUBMIT</strong> to continue.');
		$('#submitButton').show();
		$('#recordingsList').show();

		$("#stopButton").addClass('disabled');
		$("#recordButton").removeClass('disabled');
	}


	var geocoder;
	var address_results;
	var built_address = '';

	function initMap() {
		geocoder = new google.maps.Geocoder;
	}

	function getUserLocation() {

		// request to allow user position 
	    if (navigator.geolocation) {

			// START INTRO IF USER ALLOWS LOCATION
			loop();
			if (disable_intro == false ) {
				intro_anim();	
			} else {
				alert('NO-INTRO ROUTE NOT MADE YET')
			}
			$('.splash').fadeOut();

			$('.start_rec').removeClass('disabled')
			$('.start_rec').text('BEGIN')

	    	console.log('L1')
	        navigator.geolocation.getCurrentPosition(showPosition);
			function showPosition(position) {

				console.log('L2')
				//console.log(position.coords.latitude, position.coords.latitude)

				// USE GOOGLE API TO CONVERT COOORDINATES TO ADDRESS
				geocoder  = new google.maps.Geocoder();             // create a geocoder object
				var location  = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);    // turn coordinates into an object          
				geocoder.geocode({'latLng': location}, function (results, status) {
					if(status == google.maps.GeocoderStatus.OK) { 
						address_results = results[0]; // if address found, pass to processing function
						//console.log(address_results)

						// loop throught google address components and build town level address
						function buildAddress() {

							for (var i = 0; i < results[0].address_components.length; i++) {
								if( results[0].address_components[i].types.includes('sublocality_level_2')  ) {
									var add_part1 = results[0].address_components[i].long_name.replace(/\s/g, '*');
									built_address += add_part1;

									location_data.sublocality_level_2 = results[0].address_components[i].long_name;
								}
								if( results[0].address_components[i].types.includes('sublocality_level_1')  ) {
									if (built_address != '') {
										built_address += ','
									}
									var add_part2 = results[0].address_components[i].long_name.replace(/\s/g, '*');
									built_address += add_part2

									location_data.sublocality_level_1 = results[0].address_components[i].long_name
								}
								if( results[0].address_components[i].types.includes('administrative_area_level_1')  ) {
									var add_part3 = results[0].address_components[i].long_name.replace(/\s/g, '*');
									built_address += ',' + add_part3;

									location_data.city = results[0].address_components[i].long_name;

								}
								if( results[0].address_components[i].types.includes('country')  ) {
									var add_part4 = results[0].address_components[i].long_name.replace(/\s/g, '*');
									built_address += ',' + add_part4;

									location_data.country = results[0].address_components[i].long_name;
								}
							}
								
						}

						buildAddress()

					} 
				})
			}
	    } 

	};




	$('.start_rec').click( function() {
		console.log('start_rec clicked')
		$('.intro_ui').fadeOut();
		$('.record_ui').fadeIn();
		$('#world').fadeIn('slow');
		// fadeApollo("out");
	})

	function submitAudio(){ 

		$('#submitButton').html('SUBMITTING')
		$('#submitButton').addClass('disabled');
		$('#recordButton').addClass('disabled');

		onRecordUI = false;	

		// ORBIT CAMERA
		controls = new THREE.OrbitControls( camera );
		// controls.enableZoom = false;
	    // lock x axis on camera rotation
	    controls.minPolarAngle = 1.202100424136848;
	    controls.maxPolarAngle = 1.202100424136848;

	    controls.minDistance = 1700;
    	controls.maxDistance = 2500;

    	controls.enablePan = false;
		controls.update();

		// stop all mic input
		getUserMediaState = false;
		gumStream.getTracks()[0].stop()
		mic.close()


		// DATA TO POST TO SERVER [JUST FOR REFERENCE. ITS UNUSED]
		// data_to_post = { "location":built_address, "average_vol":average_session_fft}
		// console.log(
		// 	'Time: ', new Date(), 
		// 	'Location: ', built_address, 
		// 	'Average Volume: ', average_session_fft, 
		// 	'Audio Blob: ', audio_blob 
		// 	)


		// POST RECORDER AUDIO TO SERVER
		var fileReader = new FileReader();

		if (is_debugging ) {

			// RECREATE ISLAND
			createIsland(0, true);
			island.mesh.children[island.mesh.children.length-1].children[0].material.opacity = 0.2;

			setTimeout(function(){ 

				$('#pixi_canvas_wrap').fadeOut(1000);
				onMoon = false;

				$('.record_ui').fadeOut();
				$('.menu').fadeIn();
			}, 1000 );


			// REGISTER MOUSE MOVE AND GYRO 
			if (window.orientation == undefined) {
				document.getElementById('world').addEventListener('mousemove', handleMouseMove, false);		
			} else {
				window.addEventListener('deviceorientation', handleGyro, false);
			}

			if (window.orientation != undefined) {
				document.getElementById('world').addEventListener('touchstart', handleClick, false);	
			} else {
				//document.addEventListener('click', handleClick, false);
			}	

		} else {


			// recorded audio and data to server
		    fileReader.onload = function(event){

		        var fd = new FormData();
		        fd.append('fname', 'blob.mp3');
		        fd.append('data', event.target.result);

		        data_to_post = { "location":location_data, "average_vol":average_session_fft, "mp3file":event.target.result}
		        console.log(data_to_post)

			    $.ajax({
			      method: "POST",
			      url: domain+"/musicupload",
			      dataType: "json",
			      contentType: "application/json",
			      data: JSON.stringify(data_to_post),
			      crossDomain: true
		        }).done(function(json, textStatus, jqXHR) {
		            // print the output from the endpoint
		            console.log('data response after added to server',json);
		            console.log( domain+'/musicfile/'+json.mediafname);
		            added_data = json;
		            // add new data to existing server data locally
		            server_data.push(added_data);
		            // server_data_list.push(added_data);
					
					// RECREATE ISLAND
					createIsland(0, true);
					island.mesh.children[island.mesh.children.length-1].children[0].material.opacity = 0.2;

					setTimeout(function(){ 
						$('#pixi_canvas_wrap').fadeOut();
						onMoon = false;

						$('.record_ui').fadeOut();
						$('.menu').fadeIn();
					}, 1000 );
		

					// REGISTER MOUSE MOVE AND GYRO 
					if (window.orientation == undefined) {
						document.getElementById('world').addEventListener('mousemove', handleMouseMove, false);		
					} else {
						window.addEventListener('deviceorientation', handleGyro, false);
					}

					if (window.orientation != undefined) {
						document.getElementById('world').addEventListener('touchstart', handleClick, false);	
					} else {
						//document.addEventListener('click', handleClick, false);
					}	

		        })
				.fail(function(jqXHR, textStatus, errorThrown) {
				    console.log("HTTP Request Failed",jqXHR);
				})
				.always(function() {
				});


		    };      
		    // trigger the read from the reader.
		    fileReader.readAsDataURL(audio_blob);


		}





	}

	function play_thump(vol) {
		// play thump
		var audio_thump = new Audio('sound/thump.mp3');
		audio_thump.volume = vol;
		audio_thump.play();	
	}

	function intro_anim() {
		


		checkTime();

		setInterval(function(){ 
		checkTime();
		}, 60000 * 5);


		$(".intro_ui").fadeIn('slow', function(){
		isIntro = false;
		onRecordUI = true;
		});
	};


	// Show About Popup
	$('.menu_about').click(function() {
		$('.about_ui').fadeIn();
	})

	// Close About Popup
	$('.close_about').click(function(){
		$('.about_ui').fadeOut();
	});


	var has_loaded_once = false;
	// Show List Archive 
	$('.menu_list').click(function() {
		// populate list view
		populateList();

		controls.enabled = false;

		$('.list_ui').fadeIn();
		viewingList = true;

		if (!has_loaded_once) {
			for (var i = 0; i < server_data.length; i++) {
				// wavesurfers[i].drawBuffer();
			}		
		}

		has_loaded_once = true;

	})

	// Close List View
	$('.close_list').click(function(){
		$('.list_ui').fadeOut();
		viewingList = false;
		controls.enabled = true;

		$('.search_set span').removeClass('open');
		$('.search_dropdown ul').fadeOut(100);
	});

	$('.search_set span').click(function() {
		if ( !$(this).hasClass('open') ) {
			$(this).addClass('open');
			$('.search_dropdown ul').fadeIn(100);
		} else {
			$(this).removeClass('open');
			$('.search_dropdown ul').fadeOut(100);
		}

	})
	$('.search_dropdown ul li').click(function() {
		search_attr = $(this).attr('data-id');
		$('.search_set span').html(search_attr+'<img src="img/icn_arrowdown.svg">')
		$('.search_dropdown ul').fadeOut(100);

		// empty search val
		$("#search_input").val('');

		if(search_attr == 'city') {
			$('#search_input').attr("placeholder", "Example: Seoul");
			
			// enable autocomplete for city
			$( "#search_input" ).autocomplete( "enable" );
		    $( "#search_input" ).autocomplete({
		      source: autocomplete_filtered
		    });

		} else {
			$('#search_input').attr("placeholder", "YYYYMMDD");

			// disable autocomplete for datesearch
			$( "#search_input" ).autocomplete( "disable" )
		}
	});

	$('.btn_search').click(function() {

		var search_input_val = $("#search_input").val();
		var search_data;
		var search_url

		if (search_attr == 'city') {
			search_url = "citysearch"
			search_data = { "city": search_input_val }
		} else {
			search_url = "datesearch"
			search_data = { "date": search_input_val }
		}
		
		//console.log('search_data', search_input_val)

		if (is_debugging) {

            populateList();

            if (server_data_list.length == 0) {
            	$('.no_results').show()
            } else {
            	$('.no_results').hide()
            }

		} else {

		    $.ajax({
		      method: "POST",
		      url: domain+"/"+search_url,
		      dataType: "json",
		      contentType: "application/json",
		      headers: { "Content-Type": "application/json; charset=utf-8", },
		      data: JSON.stringify(search_data),
	        }).done(function(json, textStatus, jqXHR) {
	            // print the output from the endpoint
	            console.log('data response after search',json);
	            
	            // add new data to existing server data for list
	            server_data_list = json.data;

	            populateList();

	            if (server_data_list.length == 0) {
	            	$('.no_results').show()
	            } else {
	            	$('.no_results').hide()
	            }

	        })
			.fail(function(jqXHR, textStatus, errorThrown) {
			    console.log("HTTP Request Failed",jqXHR);
			})
			.always(function() {
				console.log('search_data', search_data)
			});


		}




	})


	function playArchiveSound(that) {
		var thisSound = $(that).attr('data-audio');
		//console.log(thisSound)
		if (is_debugging) {
			var soundArchive = new Audio(domain+'sound/'+thisSound);
		} else {
			var soundArchive = new Audio(domain+'/musicfile/'+thisSound);	
		}
		
		soundArchive.volume = 0.5;
		soundArchive.play();
	}


	if (window.orientation == undefined) {


		$(document).on({
		    mouseover: function () {
				var that = this;
				$(that).closest('li').addClass('sound_hovered');
				playArchiveSound(that);

				var data_id = $(this).attr('data-id');
				var data_date = $(this).attr('data-date');
				var data_location = $(this).attr('data-location');

				$('.list_ui').addClass('hovered');
				$('.archive_id').html('Echo '+data_id+'.')
				$('.archive_date').html(data_date+'HRS.')
				$('.archive_location').html(data_location)
		    },

		    mouseleave: function () {
		        mouse_is_inside = false;
		        $(this).closest('li').removeClass('sound_hovered');
		        $('.list_ui').removeClass('hovered');
		    }
		}, '.archive_sound');

	} else {

		$(document).on('click','.archive_sound',function(){
			var that = this;
			playArchiveSound(that);
		});
	}

	$( '.list_ui .text_wrap' ).on( "mousemove", function( event ) {
	  $( ".list_tooltip" ).css({
	    "left" : event.pageX - 20,
	    "top" : event.pageY - 20
	  });
	});


	// POPULATE LIST
	var wavesurfers = []

	function populateList() {
		
		wavesurfers = []	

		$('.list_ui .text_wrap ul').empty();


		for (var i = 0; i < server_data_list.length; i++) {

			var data_item_date = server_data_list[i].added_date;
			var data_item_location = '';

			if (is_debugging) {


			} else {

				function reformatDate() {
					var str = data_item_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
					    chars = str.split('');

					chars.splice(-4, 0, '. ');
					str = chars.join('');
					data_item_date = str;
				}
				reformatDate()
			}

			

			function buildAddress2() {

				if (server_data_list[i].location.sublocality_level_2.length > 0) {
					data_item_location += server_data_list[i].location.sublocality_level_2 + ', ';
				}
				if (server_data_list[i].location.sublocality_level_1.length > 0) {
					data_item_location += server_data_list[i].location.sublocality_level_1 + ', ';
				} 
				if (server_data_list[i].location.city.length > 0) {
					data_item_location += server_data_list[i].location.city + ', ';
				} 
				if (server_data_list[i].location.country.length > 0) {
					data_item_location += server_data_list[i].location.country;
				} 
			}
			buildAddress2()


			$('.list_ui .text_wrap ul').append('\
				<li>\
					<span id="archive_id_sound_'+i+'" class="archive_sound" data-audio="'+server_data_list[i].mediafname+'" data-id="'+server_data_list[i].thenum+'" data-date="'+data_item_date+'" data-location="'+data_item_location+'"><img src="img/icn_wave.svg"></span>\
				</li></\
			');

			
			wavesurfers[i] = WaveSurfer.create({
			    container: '#archive_id_sound_'+i,
			    scrollParent: false,
			    waveColor: '#717171',
			    progressColor: '#717171',
			    responsive: true,
			});
			if (is_debugging) {
				wavesurfers[i].load(domain+'sound/'+server_data_list[i].mediafname);
			} else {
				wavesurfers[i].load(domain+'/musicfile/'+server_data_list[i].mediafname);
			}
			

			// make autocomplete for search
		    for (var y = 0; y < server_data.length; y++) {
		    	autocomplete_data.push(server_data[y].location.city);
		    }
		    //  clear duplicate cities from array
			$.each(autocomplete_data, function(y, el){
			if($.inArray(el, autocomplete_filtered) === -1) autocomplete_filtered.push(el);
			});
			// sort array alphabetically
			autocomplete_filtered.sort();

		    $( "#search_input" ).autocomplete({
		      source: autocomplete_filtered
		    });

		}

	};


	// MOON PIXI FUNCTION

	(function() {
	  
	    window.CanvasSlideshow = function( options ) {

	    
	      //  SCOPE
	      /// ---------------------------      
	      var that  =   this;



	      //  OPTIONS
	      /// ---------------------------      
	      options                     = options || {};
	      options.stageWidth          = options.hasOwnProperty('stageWidth') ? options.stageWidth : 1920;
	      options.stageHeight         = options.hasOwnProperty('stageHeight') ? options.stageHeight : 1080;
	      options.pixiSprites         = options.hasOwnProperty('sprites') ? options.sprites : [];
	      options.fullScreen          = options.hasOwnProperty('fullScreen') ? options.fullScreen : true;
	      options.displaceScale       = options.hasOwnProperty('displaceScale') ? options.displaceScale : [200, 70];
	      options.displacementImage   = options.hasOwnProperty('displacementImage') ? options.displacementImage : '';
	      options.displaceAutoFit     = options.hasOwnProperty('displaceAutoFit')  ?  options.displaceAutoFit : false; 
	      options.wacky               = options.hasOwnProperty('wacky') ? options.wacky : false;
	      options.displaceScaleTo     = ( options.autoPlay === false ) ? [ 0, 0 ] : [ 20, 20 ];
	      options.displacementCenter  = options.hasOwnProperty('displacementCenter') ? options.displacementCenter : false;
	      options.dispatchPointerOver = options.hasOwnProperty('dispatchPointerOver') ? options.dispatchPointerOver : false;
	      


	      //  PIXI VARIABLES
	      /// ---------------------------    
	      var renderer            = new PIXI.autoDetectRenderer(options.stageWidth, options.stageHeight, { transparent: true });
	      var stage               = new PIXI.Container();
	      var slidesContainer     = new PIXI.Container();
	      var displacementSprite  = new PIXI.Sprite.fromImage( options.displacementImage );
	      var displacementFilter  = new PIXI.filters.DisplacementFilter( displacementSprite );

	      

	      //  SLIDES ARRAY INDEX
	      /// ---------------------------    
	      this.currentIndex = 0;



	      /// ---------------------------
	      //  INITIALISE PIXI
	      /// ---------------------------      
	      this.initPixi = function() {

	        // Add canvas to the HTML
	        document.getElementById('pixi_canvas_wrap').appendChild( renderer.view );
	  

	        // Add child container to the main container 
	        stage.addChild( slidesContainer );
	  

	        // Enable Interactions
	        stage.interactive = false;
	        
	  
	        // Fit renderer to the screen
	        if ( options.fullScreen === true ) {
	          renderer.view.style.objectFit = 'cover';
	          renderer.view.style.width     = '100%';
	          renderer.view.style.height    = '100%';
	          renderer.view.style.top       = '50%';
	          renderer.view.style.left      = '50%';
	          renderer.view.style.webkitTransform = 'translate( -50%, -50% ) scale(1.2)';
	          renderer.view.style.transform = 'translate( -50%, -50% ) scale(1.2)';      
	          renderer.view.classList = 'pixi_canvas';
	        } else {
	          renderer.view.style.maxWidth  = '100%';
	          renderer.view.style.top       = '50%';
	          renderer.view.style.left      = '50%';
	          renderer.view.style.webkitTransform = 'translate( -50%, -50% )';
	          renderer.view.style.transform = 'translate( -50%, -50% )';          
	        }
	        
	  
	        displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;


	        // Set the filter to stage and set some default values for the animation
	        stage.filters = [displacementFilter];        

	        if ( options.autoPlay === false ) {
	          displacementFilter.scale.x = 0;
	          displacementFilter.scale.y = 0;
	        }

	        if ( options.wacky === true ) {

	          displacementSprite.anchor.set(0.5);
	          displacementSprite.x = renderer.width / 2;
	          displacementSprite.y = renderer.height / 2; 
	        }

	        displacementSprite.scale.x = 2;
	        displacementSprite.scale.y = 2;
	  
	        // PIXI tries to fit the filter bounding box to the renderer so we optionally bypass
	        displacementFilter.autoFit = options.displaceAutoFit;
	        
	        stage.addChild( displacementSprite );

	      };



	      /// ---------------------------
	      //  LOAD SLIDES TO CANVAS
	      /// ---------------------------          
	      this.loadPixiSprites = function( sprites ) {
	        

	        var rSprites = options.sprites;

	        for ( var i = 0; i < rSprites.length; i++ ) {
	          
	          var texture   = new PIXI.Texture.fromImage( sprites[i] );
	          var image     = new PIXI.Sprite( texture );


	          if ( options.centerSprites === true ) {
	            image.anchor.set(0.5);
	            image.x = renderer.width / 2;
	            image.y = renderer.height / 2;            
	          }
	          //image.transform.scale.x = 1.3;
	          //image.transform.scale.y = 1.3;


	          slidesContainer.addChild( image );

	        } 
	        
	      };
	      


	      /// ---------------------------
	      //  DEFAULT RENDER/ANIMATION
	      /// ---------------------------        
	      if ( options.autoPlay === true ) {

	        var ticker = new PIXI.ticker.Ticker();

	        ticker.autoStart = options.autoPlay;

	        ticker.add(function( delta ) {
	          
	          displacementSprite.x += 1.0 * delta ;
	          displacementSprite.y += 5.0;
	          
	          displacementSprite.x += (average_fft / 10) * delta;
	          displacementSprite.y += (average_fft / 5) * delta;
	          displacementSprite.rotation.x += (average_fft / 10);          
	          	
	          //console.log('displacementx', displacementSprite.x)
	          		
	          renderer.render( stage );

	        });

	      }  else {

	          var render = new PIXI.ticker.Ticker();

	          render.autoStart = true;

	          render.add(function( delta ) {
	            renderer.render( stage );
	          });        
	        
	      }    
	      



	      /// ---------------------------
	      //  INIT FUNCTIONS
	      /// ---------------------------     
	      this.init = function() {

	        
	        that.initPixi();
	        that.loadPixiSprites( options.pixiSprites );

	        /*
	        if ( options.fullScreen === true ) {
	          window.addEventListener("resize", function( event ){ 
	            scaleToWindow( renderer.view );
	          });
	          scaleToWindow( renderer.view );  
	        }
	        */
	        

	      };

	      
	      
	      /// ---------------------------
	      //  CENTER DISPLACEMENT
	      /// ---------------------------
	      if ( options.displacementCenter === true ) {
	        displacementSprite.anchor.set(0.5);
	        displacementSprite.x = renderer.view.width / 2;
	        displacementSprite.y = renderer.view.height / 2;        
	      }
	      
	      
	      /// ---------------------------
	      //  START 
	      /// ---------------------------           
	      this.init();

	      
	      /// ---------------------------
	      //  HELPER FUNCTIONS
	      /// ---------------------------
	      function scaleToWindow( canvas, backgroundColor ) {
	        var scaleX, scaleY, scale, center;
	      
	        //1. Scale the canvas to the correct size
	        //Figure out the scale amount on each axis
	        scaleX = window.innerWidth / canvas.offsetWidth;
	        scaleY = window.innerHeight / canvas.offsetHeight;
	      
	        //Scale the canvas based on whichever value is less: `scaleX` or `scaleY`
	        scale = Math.min(scaleX, scaleY);
	        canvas.style.transformOrigin = "0 0";
	        canvas.style.transform = "scale(" + scale + ")";
	      
	        //2. Center the canvas.
	        //Decide whether to center the canvas vertically or horizontally.
	        //Wide canvases should be centered vertically, and 
	        //square or tall canvases should be centered horizontally
	        if (canvas.offsetWidth > canvas.offsetHeight) {
	          if (canvas.offsetWidth * scale < window.innerWidth) {
	            center = "horizontally";
	          } else {
	            center = "vertically";
	          }
	        } else {
	          if (canvas.offsetHeight * scale < window.innerHeight) {
	            center = "vertically";
	          } else {
	            center = "horizontally";
	          }
	        }
	      
	        //Center horizontally (for square or tall canvases)
	        var margin;
	        if (center === "horizontally") {
	          margin = (window.innerWidth - canvas.offsetWidth * scale) / 2;
	          canvas.style.marginTop = 0 + "px";
	          canvas.style.marginBottom = 0 + "px";
	          canvas.style.marginLeft = margin + "px";
	          canvas.style.marginRight = margin + "px";
	        }
	      
	        //Center vertically (for wide canvases) 
	        if (center === "vertically") {
	          margin = (window.innerHeight - canvas.offsetHeight * scale) / 2;
	          canvas.style.marginTop = margin + "px";
	          canvas.style.marginBottom = margin + "px";
	          canvas.style.marginLeft = 0 + "px";
	          canvas.style.marginRight = 0 + "px";
	        }
	      
	        //3. Remove any padding from the canvas  and body and set the canvas
	        //display style to "block"
	        canvas.style.paddingLeft = 0 + "px";
	        canvas.style.paddingRight = 0 + "px";
	        canvas.style.paddingTop = 0 + "px";
	        canvas.style.paddingBottom = 0 + "px";
	        canvas.style.display = "block";
	      
	        //4. Set the color of the HTML body background
	        document.body.style.backgroundColor = backgroundColor;
	      
	        //Fix some quirkiness in scaling for Safari
	        var ua = navigator.userAgent.toLowerCase();
	        if (ua.indexOf("safari") != -1) {
	          if (ua.indexOf("chrome") > -1) {
	            // Chrome
	          } else {
	            // Safari
	            //canvas.style.maxHeight = "100%";
	            //canvas.style.minHeight = "100%";
	          }
	        }
	      
	        //5. Return the `scale` value. This is important, because you'll nee this value 
	        //for correct hit testing between the pointer and sprites
	        return scale;
	      } // http://bit.ly/2y1Yk2k      

	      
	    };

	  })(); 



	  imagesLoaded(document.body, () => document.body.classList.remove('loading'));

	  var spriteImages = document.querySelectorAll( '.slide-item__image' );
	  var spriteImagesSrc = [];
	  var texts = [];

	  for ( var i = 0; i < spriteImages.length; i++ ) {
	    var img = spriteImages[i];

	    spriteImagesSrc.push( img.getAttribute('src' ) );
	  }







	// INIT FUNCTIONS	

	function init(event){

		if (is_debugging ) {
			createScene();
			// createLights();
			createSea();
			createIsland(0, true);
			createReflection();
			if (window.orientation == undefined) {
				createMirror();
			} else {
				createMirror();
			}

			// init gmaps for user's location
			initMap()

			// check time of day to update form
			checkTime();

			$('.loading_message').fadeOut();
			$('.splash_ui').fadeIn();

			$('.start_intro').click(function() {
				getUserMedia();
				// playApollo();
			});
		} else {
			getData()	
		}
		
		var initMoonRipple = new CanvasSlideshow({
			sprites: spriteImagesSrc,
			displacementImage: 'img/ripple.jpg',
			autoPlay: true,
		});


	}

