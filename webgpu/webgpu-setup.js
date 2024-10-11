export function createTilePipeline(device, textures, sampler) {
    const shaderModule = device.createShaderModule({
      code: `
      
      // Uniforms
@group(0) @binding(0)
var<uniform> uCanvasSize: vec2<f32>;

@group(0) @binding(1)
var<uniform> uTileSize: f32;

// Individual texture bindings
@group(0) @binding(2)
var floorTexture: texture_2d<f32>;

@group(0) @binding(3)
var wallTexture: texture_2d<f32>;

@group(0) @binding(4)
var waterTexture: texture_2d<f32>;

@group(0) @binding(5)
var lavaTexture: texture_2d<f32>;

@group(0) @binding(6)
var playerTexture: texture_2d<f32>;

@group(0) @binding(7)
var objectTexture: texture_2d<f32>;

@group(0) @binding(8)
var hoverTexture: texture_2d<f32>;

// Sampler at binding 9
@group(0) @binding(9)
var tileSampler: sampler;

// Define VertexInput struct
struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) offset: vec2<f32>,
  @location(2) textureIndex: f32,
};

// Define VertexOutput struct
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) vUV: vec2<f32>,
  @location(1) vTextureIndex: f32,
};

@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let pos = (input.position * uTileSize + input.offset) / uCanvasSize * 2.0 - 1.0;
  output.position = vec4<f32>(pos.x, -pos.y, 0.0, 1.0); // Flip Y-axis
  output.vUV = input.position;
  output.vTextureIndex = input.textureIndex;
  return output;
}

@fragment
fn fragment_main(
  @location(0) vUV: vec2<f32>,
  @location(1) vTextureIndex: f32
) -> @location(0) vec4<f32> {
  // Sample all textures unconditionally
  let floorColor = textureSample(floorTexture, tileSampler, vUV);
  let wallColor = textureSample(wallTexture, tileSampler, vUV);
  let waterColor = textureSample(waterTexture, tileSampler, vUV);
  let lavaColor = textureSample(lavaTexture, tileSampler, vUV);
  let playerColor = textureSample(playerTexture, tileSampler, vUV);
  let objectColor = textureSample(objectTexture, tileSampler, vUV);
  let hoverColor = textureSample(hoverTexture, tileSampler, vUV);

  // Convert textureIndex to integer
  let textureIndex = i32(vTextureIndex);

  // Initialize color
  var color: vec4<f32> = vec4<f32>(0.0);

  // Select the correct color without branching
  color += floorColor * f32(textureIndex == 0);
  color += wallColor * f32(textureIndex == 1);
  color += waterColor * f32(textureIndex == 2);
  color += lavaColor * f32(textureIndex == 3);
  color += playerColor * f32(textureIndex == 4);
  color += objectColor * f32(textureIndex == 5);
  color += hoverColor * f32(textureIndex == 6);

  return color;
}



      `,
    });
  
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          // Uniform buffers
          { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      
          // Individual texture bindings
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 7, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 8, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      
          // Sampler
          { binding: 9, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        ],
      });
  
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
  
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertex_main',
        buffers: [
            // Vertex buffer (positions)
            {
              arrayStride: 2 * 4, // position (vec2<f32>)
              attributes: [{ shaderLocation: 0, format: 'float32x2', offset: 0 }],
            },
            // Instance buffer (offsets and texture indices)
            {
              arrayStride: (2 + 1) * 4, // offset (vec2<f32>) + textureIndex (f32)
              stepMode: 'instance',
              attributes: [
                { shaderLocation: 1, format: 'float32x2', offset: 0 }, // offset
                { shaderLocation: 2, format: 'float32', offset: 2 * 4 }, // textureIndex
              ],
            },
          ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragment_main',
        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });
  
    const vertexData = new Float32Array([
      0.0, 0.0, // Bottom-left
      1.0, 0.0, // Bottom-right
      0.0, 1.0, // Top-left
      1.0, 1.0, // Top-right
    ]);
  
    const vertexBuffer = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
  
    new Float32Array(vertexBuffer.getMappedRange()).set(vertexData);
    vertexBuffer.unmap();
  
    const canvasSizeUniformBuffer = device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  
    const tileSizeUniformBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          // Uniform buffers
          { binding: 0, resource: { buffer: canvasSizeUniformBuffer } },
          { binding: 1, resource: { buffer: tileSizeUniformBuffer } },
      
          // Bind each texture individually
          { binding: 2, resource: textures.floor.createView() },
          { binding: 3, resource: textures.wall.createView() },
          { binding: 4, resource: textures.water.createView() },
          { binding: 5, resource: textures.lava.createView() },
          { binding: 6, resource: textures.player.createView() },
          { binding: 7, resource: textures.object.createView() },
          { binding: 8, resource: textures.hover.createView() },
      
          // Sampler
          { binding: 9, resource: sampler },
        ],
      });
      
  
    return {
      pipeline,
      bindGroup,
      vertexBuffer,
      canvasSizeUniformBuffer,
      tileSizeUniformBuffer,
    };
  }
  
  
  export async function initializeWebGPU(canvas) {
    if (!navigator.gpu) {
      console.error("WebGPU is not supported on this browser.");
      return;
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error("Failed to get GPU adapter.");
      return;
    }
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });
    return { device, context, format };
  }
  export async function loadTextures(device) {
    const textures = {};
    
    textures.floor = await loadTexture(device, './textures/floor.png'); // Add this line
    textures.wall = await loadTexture(device, './textures/wall.png');
    textures.water = await loadTexture(device, './textures/water.png');
    textures.lava = await loadTexture(device, './textures/lava.png');
    textures.player = await loadTexture(device, './textures/player.png');
    textures.object = await loadTexture(device, './textures/object.png');
    textures.hover = await loadTexture(device, './textures/hover.png');
    return textures;
  }
  

  async function loadTexture(device, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch texture at ${url}: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
  
      const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT, // Added RENDER_ATTACHMENT
      });
  
      device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture },
        [imageBitmap.width, imageBitmap.height, 1]
      );
  
      return texture;
    } catch (error) {
      console.error(`Error loading texture from ${url}:`, error);
      return null;
    }
  }
  