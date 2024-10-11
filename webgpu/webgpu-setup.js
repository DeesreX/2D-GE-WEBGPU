export function createTilePipeline(device) {
    const shaderModule = device.createShaderModule({
        code: `
            struct VertexInput {
                @location(0) position: vec2<f32>,
                @location(1) offset: vec2<f32>,
                @location(2) color: vec4<f32>,
            };

            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) vUV: vec2<f32>,
                @location(1) vColor: vec4<f32>,
            };

            @group(0) @binding(0)
            var<uniform> uCanvasSize: vec2<f32>;

            @group(0) @binding(1)
            var<uniform> uTileSize: f32;

            @vertex
            fn vertex_main(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                let pos = (input.position * vec2<f32>(uTileSize, uTileSize) + input.offset) / uCanvasSize * 2.0 - 1.0;
                output.position = vec4<f32>(pos * vec2<f32>(1.0, -1.0), 0.0, 1.0); // Flip Y-axis
                output.vUV = input.position;
                output.vColor = input.color;
                return output;
            }

            @fragment
            fn fragment_main(@location(0) vUV: vec2<f32>, @location(1) vColor: vec4<f32>) -> @location(0) vec4<f32> {
                return vColor;
            }
        `,
    });

    // Create buffers and bind group layout as before
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            // Remove the binding for uColor
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }, // uCanvasSize
            { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }, // uTileSize
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
                {
                    // Vertex buffer (quad vertices)
                    arrayStride: 2 * 4, // 2 floats per vertex
                    attributes: [
                        { shaderLocation: 0, format: 'float32x2', offset: 0 }, // position
                    ],
                },
                {
                    // Instance buffer (offsets and colors)
                    arrayStride: (2 + 4) * 4, // 2 floats for offset, 4 floats for color
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 1, format: 'float32x2', offset: 0 },       // offset
                        { shaderLocation: 2, format: 'float32x4', offset: 2 * 4 },   // color
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

    // Create vertex buffer for a quad (each vertex is a vec2<f32>)
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

    if (vertexBuffer) {
        new Float32Array(vertexBuffer.getMappedRange()).set(vertexData);
        vertexBuffer.unmap();
    } else {
        console.error("Failed to create vertex buffer.");
    }
    const canvasSizeUniformBuffer = device.createBuffer({
        size: 2 * 4, // vec2<f32>
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create the uniform buffer for TILE_SIZE
    const tileSizeUniformBuffer = device.createBuffer({
        size: 4, // single float for tile size
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: canvasSizeUniformBuffer } },
            { binding: 1, resource: { buffer: tileSizeUniformBuffer } },
        ],
    });

    return {
        pipeline,
        bindGroupLayout,
        bindGroup,
        vertexBuffer, // Now properly defined and created
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
