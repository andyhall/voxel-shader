"use strict"

var shell = require("gl-now")()
var createTexture = require("gl-texture2d")
var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var glm = require("gl-matrix")
var ndarray = require("ndarray")
var fill = require("ndarray-fill")
var ops = require("ndarray-ops")
var createAOMesh = require("ao-mesher")
var createAOShader = require("../aoshader.js")
var mat4 = glm.mat4

//The shader
var shader

//Tile texture
var texture

//Mesh data variables
var vao, vertexCount

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shader
  shader = createAOShader(gl)
  
  //Create some voxels
  var voxels = ndarray(new Uint16Array(32*32*32), [32,32,32])
  fill(voxels, function(i,j,k) {
    var x = Math.abs(i - 16)
    var y = Math.abs(j - 16)
    var z = Math.abs(k - 16)
    return (x*x+y*y+z*z) < 30 ? 1<<15 : 0
    //return Math.max(x,y,z) < 8 ? 1<<15 : 0
  })
  
  //Compute mesh
  var vert_data = createAOMesh(voxels)
  
  //Convert mesh to WebGL buffer
  vertexCount = Math.floor(vert_data.length/8)
  var vert_buf = createBuffer(gl, vert_data.buffer.subarray(0, vert_data.length))
  vao = createVAO(gl, undefined, [
    { "buffer": vert_buf,
      "type": gl.UNSIGNED_BYTE,
      "size": 4,
      "offset": 0,
      "stride": 8,
      "normalized": false
    },
    { "buffer": vert_buf,
      "type": gl.UNSIGNED_BYTE,
      "size": 4,
      "offset": 4,
      "stride": 8,
      "normalized": false
    }
  ])
  
  //Just create all white texture for now
  var texture_buf = ndarray(new Uint8Array(256*256*4), [256,256,4])
  ops.assigns(texture_buf, 255)
  texture = createTexture(gl, texture_buf)
})

shell.on("gl-render", function(t) {
  var gl = shell.gl

  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  //Bind the shader
  shader.bind()
  
  //Set shader attributes
  shader.attributes.attrib0.location = 0
  shader.attributes.attrib1.location = 1
  
  //Set up camera parameters
  var A = new Float32Array(16)
  shader.uniforms.projection = mat4.perspective(A, Math.PI/4.0, shell.width/shell.height, 1.0, 1000.0)
  
  var t = 0.0001*Date.now()
  
  
  shader.uniforms.view = mat4.lookAt(A, [30*Math.cos(t) + 16,20,30*Math.sin(t)+16], [16,16,16], [0, 1, 0])

  //Set tile size
  shader.uniforms.tileSize = 1.0/16.0
  
  //Set texture
  if(texture) {
    shader.uniforms.tileMap = texture.bind()
  }
  
  //Draw instanced mesh
  shader.uniforms.model = mat4.identity(A)
  vao.bind()
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount)
  vao.unbind()
})
