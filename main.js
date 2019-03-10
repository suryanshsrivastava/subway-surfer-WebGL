var cubeRotation = 0.0;

var t1 = [];
var t2 = [];
var t3 = [];
var textureTrack;

var coins = [];
var textureCoins;

var trains = [];
var textureTrains;

var jets = [];
var textureJets;

var superSneakers = [];
var textureSneakers;

var walls = [];
var textureWall;
main();

//
// Start here
//

var jake;
var texturePlayer;
var fsSource;
var flag;
var gray_scale_flag=0;
var Up;
var speed;
var shaderProgram;
var programInfo;

function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  jake = new player(gl, [0, 0.5, -10.0]);
  texturePlayer = loadTexture(gl, 'surfer.png');
  
  var i;
  for (i=0; i<100; i++) {
    walls.push(new wall(gl, [0, 0.0, -50*i]));
  }
  textureWall = loadTexture(gl, 'brick-wall.png');
  
  
  var trackLength = 1000;
  for (i=0; i<trackLength; i++) {
    t1.push(new track(gl, [-5, -1, -i*(5.0)]));
  }
  for (i=0; i<trackLength; i++) {
    t2.push(new track(gl, [0, -1, -i*(5.0)]));
  }
  for (i=0; i<trackLength; i++) {
    t3.push(new track(gl, [5, -1, -i*(5.0)]));
  }
  textureTrack = loadTexture(gl, 'track.png');

  for (i=0; i<100; i++) {
    coins.push(new coin(gl, [0, 1, -i*(5.0)]));
  }
  textureCoins = loadTexture(gl, 'coin.png');
  
  for (i=0; i<100; i++) {
    trains.push(new train(gl, [-5, 1, -i*(50.0)]));
  }
  textureTrains = loadTexture(gl, 'train.png');

  for (i=0; i<100; i++) {
    jets.push(new jetpack(gl, [5, 1, -i*(50.0)]));
  }
  textureJets = loadTexture(gl, 'jetpack.png');

  for (i=0; i<100; i++) {
    superSneakers.push(new superSneaker(gl, [5, 1, -i*(20.0)]));
  }
  textureSneakers = loadTexture(gl, 'SuperSneakers.png');
  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program
  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vTextureCoord = aTextureCoord;

      // Apply lighting effect

      highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
      highp vec3 directionalLightColor = vec3(1, 1, 1);
      highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

      highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);
    }
  `;

  var then = 0;

  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    // Fragment shader program
    var colorgradient;
    if(gray_scale_flag) {
      colorgradient = `precision highp float;
      vec4 color = texture2D(uSampler, vTextureCoord);
      float gray = dot(color.rgb,vec3(0.299,0.587,0.114));
      gl_FragColor = vec4(vec3(gray),1.0);}`
    }
    else {
      colorgradient = `gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);}`
    }
    fsSource = `
      varying highp vec2 vTextureCoord;
      varying highp vec3 vLighting;

      uniform sampler2D uSampler;

      void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);` + colorgradient;
    
    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  
    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
    programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
    },
  };

    drawScene(gl, programInfo, deltaTime);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, deltaTime) {
  gl.clearColor(127.0/255.0, 218.0/255.0, 255.0/255.0, 1);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  var cameraMatrix = mat4.create();
  mat4.translate(cameraMatrix, cameraMatrix, [0, 5, 5]);
  var cameraPosition = [
    cameraMatrix[12],
    cameraMatrix[13]+2,
    cameraMatrix[14]+jake.pos[2]+10,
  ];
  var up = [0, 1, 0];
  mat4.lookAt(cameraMatrix, cameraPosition, [0,0,jake.pos[2]], up);
  var viewMatrix = cameraMatrix;//mat4.create();
  //mat4.invert(viewMatrix, cameraMatrix);
  var viewProjectionMatrix = mat4.create();
  mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

  window.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) {
      return; // Do nothing if the event was already processed
    }
    // console.log(event.key);
    switch (event.key) {
      // case "ArrowDown":        
      //   down = 1;
      //   break;
      case " ":
        Up = 1;
        break;
      case "ArrowLeft":
        flag = 1;
        break;
      case "ArrowRight":
        flag = 2;
        break;
      case "ArrowUp":
        // if(gray_scale_flag == 0){
          gray_scale_flag = 1;
          console.log("lights off")
        // }
        break;
      case "ArrowDown":
      // gray_scale_flag = 1;
          // if(gray_scale_flag){
            gray_scale_flag = 0;
            console.log("lights on");
          // }
        break;
      default:
        return; // Quit when this doesn't handle the key event.
            }
    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
  }, true);
  console.log(gray_scale_flag);
  //move left and right on the tracks  
  if(flag==1) {
    if(jake.pos[0] <= -5) {
      flag = 0;
    }
    else{
      jake.pos[0]-=0.5;
    }
  }
  if(flag==2) {
    if(jake.pos[0] >= 5) {
      flag = 0;
    }
    else{
      jake.pos[0]+=0.5;
    }
  }
  if ((jake.pos[0] >= 5) || (jake.pos[0] <= -5)  || (jake.pos[0] >= -0.1 && jake.pos[0] <= 0.1) ) flag=0;
  
  //Constantly keep moving forward on the tracks
  speed = 0.5;
  jake.pos[2]-=speed;

  jump = 0.5;
  gravity = 0.3;

  if (Up == 1) {
    // console.log('up:'+Up); 
    if(jake.pos[1] >= 7){
      Up = 0;
      // console.log('upto:'+jake.pos[1]);
    }
    else{
      jake.pos[1] += jump;
      console.log('position:'+jake.pos[1]);
    }
  }
  if(jake.pos[1] >= 1 && Up == 0){
    console.log(jake.pos[1]);
    jake.pos[1]-=gravity;
  }

  jake.drawPlayer(gl, viewProjectionMatrix, programInfo, deltaTime);
  
  var i;
  for (i=0; i<t1.length; i++) {
    t1[i].drawTrack(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<t2.length; i++) {
    t2[i].drawTrack(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<t3.length; i++) {
    t3[i].drawTrack(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<coins.length; i++) {
    coins[i].drawCoin(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<walls.length; i++) {
    walls[i].drawWall(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<trains.length; i++) {
    trains[i].drawTrain(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<jets.length; i++) {
    jets[i].drawJet(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
  for (i=0; i<superSneakers.length; i++) {
    superSneakers[i].drawSuperSneaker(gl, viewProjectionMatrix, programInfo, deltaTime)
  }
}

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
      //  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
       // No, it's not a power of 2. Turn off mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
