import { TILE_TYPES } from "../components/constants.js";
export function createTilePipeline(device, textureArray, sampler) {
    const shaderModule = device.createShaderModule({
      code: `
      // Uniforms
      @group(0) @binding(0)
      var<uniform> uCanvasSize: vec2<f32>;
  
      @group(0) @binding(1)
      var<uniform> uTileSize: f32;
  
      // Texture array binding
      @group(0) @binding(2)
      var tileTextures: texture_2d_array<f32>;
  
      // Sampler
      @group(0) @binding(3)
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
        let textureIndex = i32(vTextureIndex);
        let color = textureSample(
          tileTextures,
          tileSampler,
          vUV,
          textureIndex
        );
  
        return color;
      }
      `,
    });
  
  
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          // Uniform buffers
          { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      
          // Texture array binding
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      
          // Sampler
          { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
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
    
          // Texture array binding
          { binding: 2, resource: textureArray.createView({ dimension: '2d-array' }) },
    
          // Sampler
          { binding: 3, resource: sampler },
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
    const textureUrls = TILE_TYPES.map((tileType) => tileType.textureUrl);
  
    const textureArray = await loadTextureArray(device, textureUrls);
    return textureArray;
  }
  
  async function loadTextureArray(device, textureUrls) {
    // Load all images
    const imageBitmaps = await Promise.all(
      textureUrls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch texture at ${url}: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return await createImageBitmap(blob);
      })
    );
  
    // Find the maximum width and height
    let maxWidth = 0;
    let maxHeight = 0;
    for (const bitmap of imageBitmaps) {
      if (bitmap.width > maxWidth) maxWidth = bitmap.width;
      if (bitmap.height > maxHeight) maxHeight = bitmap.height;
    }
  
    // Resize or pad all images to have the same dimensions
    const resizedBitmaps = await Promise.all(
      imageBitmaps.map(async (bitmap) => {
        if (bitmap.width !== maxWidth || bitmap.height !== maxHeight) {
          // Resize the image
          return await createImageBitmap(bitmap, {
            resizeWidth: maxWidth,
            resizeHeight: maxHeight,
            resizeQuality: 'high',
          });
  
          // Alternatively, pad the image to avoid distortion
          // return await padImageBitmap(bitmap, maxWidth, maxHeight);
        } else {
          return bitmap;
        }
      })
    );
  
    const width = maxWidth;
    const height = maxHeight;
    const depth = resizedBitmaps.length; // Number of textures
  
    const texture = device.createTexture({
      size: [width, height, depth],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
      dimension: '2d',
    });
  
    for (let i = 0; i < depth; i++) {
      device.queue.copyExternalImageToTexture(
        { source: resizedBitmaps[i] },
        { texture: texture, origin: [0, 0, i] },
        [width, height, 1]
      );
    }
  
    return texture;
  }
  

  