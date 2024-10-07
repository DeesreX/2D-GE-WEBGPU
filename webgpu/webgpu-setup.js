
export async function initializeWebGPU() {
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
    const canvas = document.getElementById("gameCanvas");
    const context = canvas.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });
    return { device, context, format };
}

export function createTilePipeline(device, color) {
    const shaderModule = device.createShaderModule({
        code: `
            @vertex
            fn vertex_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
                var positions = array<vec2<f32>, 6>(
                    vec2<f32>(0.0, 0.0),
                    vec2<f32>(1.0, 0.0),
                    vec2<f32>(0.0, 1.0),
                    vec2<f32>(0.0, 1.0),
                    vec2<f32>(1.0, 0.0),
                    vec2<f32>(1.0, 1.0)
                );
                let pos = positions[vertexIndex];
                return vec4<f32>(pos * 2.0 - 1.0, 0.0, 1.0);
            }

            @fragment
            fn fragment_main() -> @location(0) vec4<f32> {
                return vec4<f32>(${color.r}, ${color.g}, ${color.b}, ${color.a});
            }
        `
    });

    return device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main"
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
        },
        primitive: {
            topology: "triangle-list"
        }
    });
}
