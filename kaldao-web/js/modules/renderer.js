// Enhanced WebGL Renderer with Comprehensive Debug Uniform Support
// This module serves as the critical "translation layer" between JavaScript parameters and GPU mathematics
// 
// CONCEPTUAL FRAMEWORK:
// Think of this renderer as a sophisticated telephone operator from the early 20th century.
// We have many different "callers" (JavaScript parameters) who want to speak to many different
// "recipients" (shader uniform variables). The renderer's job is to efficiently route these
// conversations and ensure every parameter reaches its corresponding mathematical function in the shader.
//
// The challenge is that JavaScript and GPU/shader code operate in fundamentally different ways:
// - JavaScript: Dynamic, flexible, can examine and modify variables at runtime
// - GPU/Shader: Static, massively parallel, must know all variables at compile time
//
// This renderer bridges these two computational worlds intelligently and efficiently.

export class Renderer {
    constructor() {
        // Core WebGL infrastructure
        this.gl = null;                    // The WebGL rendering context - our gateway to GPU
        this.canvas = null;                // The HTML canvas where visuals appear
        this.program = null;               // The compiled shader program (vertex + fragment shaders)
        this.uniforms = {};                // Our "directory" of uniform locations - like phone numbers for GPU variables
        this.app = null;                   // Reference to main app for accessing color manager
        
        // Enhanced tracking for debug system
        this.uniformStats = {              // Statistics about uniform usage for optimization and debugging
            totalUniforms: 0,              // How many uniforms we're managing
            activeUniforms: 0,             // How many are actually being used
            debugUniforms: 0,              // How many are debug-specific
            missingUniforms: []            // Which uniforms couldn't be found (for development)
        };
        
        // Performance monitoring for mathematical complexity awareness
        this.renderingMetrics = {
            lastRenderTime: 0,             // How long the last frame took to render
            uniformUpdateTime: 0,          // How long parameter updates took
            totalFramesRendered: 0         // Total frames since initialization
        };
    }

    // INITIALIZATION SYSTEM
    // This orchestrates the complex process of setting up the WebGL environment
    // and preparing it to receive both artistic and mathematical parameters
    async init() {
        try {
            console.log('🎨 Initializing Enhanced Renderer with Debug Uniform Support...');
            
            // PHASE 1: Establish basic WebGL infrastructure
            this.setupCanvas();
            this.setupWebGLContext();
            
            // PHASE 2: Load and compile shaders (vertex + fragment)
            // This is where we bridge from JavaScript to GPU mathematics
            await this.setupShaders();
            
            // PHASE 3: Set up geometry for full-screen rendering
            // We render fractals on a simple quad that covers the entire screen
            this.setupGeometry();
            
            // PHASE 4: Create uniform connections (JavaScript ↔ GPU parameter bridge)
            // This is the heart of our parameter system - creating channels for data flow
            this.setupUniforms();
            
            // PHASE 5: Development and debugging aids
            this.setupDevelopmentFeatures();
            
            console.log(`✅ Renderer initialized successfully with ${this.uniformStats.totalUniforms} uniforms`);
            console.log(`📊 Debug uniforms: ${this.uniformStats.debugUniforms}, Standard uniforms: ${this.uniformStats.activeUniforms}`);
            
        } catch (error) {
            throw new Error(`Renderer initialization failed: ${error.message}`);
        }
    }

    // CANVAS AND WEBGL SETUP
    // This establishes our "drawing surface" and connects to the GPU
    setupCanvas() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found - check HTML structure');
        }
        
        // Set canvas to fill the viewport for immersive fractal experience
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        console.log(`📐 Canvas initialized: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    setupWebGLContext() {
        // Try to get WebGL2 first (more features), fall back to WebGL1 if necessary
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported - modern browser required for fractal visualization');
        }
        
        // Detect WebGL capabilities for optimization hints
        const webglVersion = this.gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1';
        console.log(`🔧 ${webglVersion} context established`);
        
        // Configure WebGL for optimal fractal rendering
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    // SHADER LOADING AND COMPILATION SYSTEM
    // This is where we bridge from external GLSL files to executable GPU code
    async setupShaders() {
        try {
            // Load shader source code from external files
            // This separation keeps our mathematical GLSL code organized and editable
            const vertexShaderSource = await this.loadShader('../shaders/vertex.glsl');
            const fragmentShaderSource = await this.loadShader('../shaders/fragment.glsl');
            
            // Compile individual shaders
            const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
            
            // Link shaders into a complete program
            this.program = this.createProgram(vertexShader, fragmentShader);
            
            console.log('✅ Shaders compiled and linked successfully');
            
        } catch (error) {
            console.warn('⚠️ External shader loading failed, using fallback shaders');
            this.setupFallbackShaders();
        }
    }

    // SHADER FILE LOADING WITH INTELLIGENT FALLBACK
    // This handles loading GLSL code from external files with graceful degradation
    async loadShader(url) {
        // Try the original path first
        const pathsToTry = [
            url,                           // Original path
            url.replace('../', './'),      // Adjusted for subfolder deployment
            url.replace('../', '')         // Direct relative path
        ];
        
        for (const path of pathsToTry) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    return await response.text();
                }
            } catch (error) {
                console.warn(`Failed to load shader from ${path}, trying next path...`);
            }
        }
        
        // If all paths fail, fall back to embedded shaders
        console.warn(`All shader paths failed for ${url}, using fallback`);
        throw new Error(`Failed to load shader: ${url}`);
    }
    
    // FALLBACK SHADER SYSTEM
    // When external shader files can't be loaded, this provides basic functionality
    // This ensures development can continue even if the file server isn't working properly
    setupFallbackShaders() {
        console.log('🔄 Setting up fallback shaders for development continuity...');
        
        // Simple vertex shader for full-screen quad
        const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        // Comprehensive fallback fragment shader with ALL debug uniforms
        // This ensures the parameter system works even in fallback mode
        const fragmentShaderSource = this.getFallbackFragmentShader();
        
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        console.log('✅ Fallback shaders operational');
    }

    // COMPREHENSIVE FALLBACK FRAGMENT SHADER
    // This provides a complete shader implementation that includes ALL debug uniforms
    // Even in fallback mode, the debug parameter system remains fully functional
    getFallbackFragmentShader() {
        return `
            precision highp float;
            
            // CORE SYSTEM UNIFORMS
            // These drive the basic fractal mathematics and are essential for any visualization
            uniform vec2 u_resolution;           // Screen resolution for aspect ratio correction
            // u_time removed - not used in shader
            uniform float u_camera_position;     // Position along the tunnel path
            uniform float u_rotation_time;       // Accumulated rotation for pattern spinning
            uniform float u_plane_rotation_time; // Per-layer rotation accumulation
            uniform float u_color_time;          // Color cycling time
            
            // ARTISTIC PARAMETER UNIFORMS
            // These correspond to the user-friendly creative controls
            // Speed uniforms removed - JavaScript handles time accumulation
            uniform float u_contrast;            // Edge sharpness and detail visibility
            uniform float u_kaleidoscope_segments; // Number of radial mirror segments
            uniform float u_layer_count;         // How many depth layers to render
            uniform float u_truchet_radius;      // Size of circular pattern elements
            uniform float u_center_fill_radius;  // Central area fill control
            uniform float u_zoom_level;          // Magnification level
            uniform float u_color_intensity;     // Overall brightness multiplier
            uniform float u_camera_tilt_x;       // Camera horizontal tilt
            uniform float u_camera_tilt_y;       // Camera vertical tilt
            uniform float u_camera_roll;         // Camera rotation around view axis
            uniform float u_path_stability;      // Curvature vs straightness of tunnel path
            uniform float u_path_scale;          // Overall scale of path movements
            
            // DEBUG PARAMETER UNIFORMS - MATHEMATICAL CONTROL LAYER
            // These expose the internal mathematical constants for deep exploration
            
            // Layer System Mathematics - Controls how multiple rendering layers interact
            uniform float u_layer_distance;      // Spatial separation between rendered layers
            uniform float u_layer_fade_start;    // Distance where layers begin fading
            uniform float u_layer_fade_near;     // Near-field fade control
            uniform float u_layer_alpha_base;    // Base transparency for layer blending
            uniform float u_layer_alpha_range;   // Transparency variation range
            uniform float u_layer_cutoff;        // Rendering optimization cutoff threshold
            
            // Camera Path Harmonics - Mathematical frequencies that generate organic movement
            uniform float u_path_freq_primary;   // Primary frequency (default: √2 ≈ 1.414)
            uniform float u_path_freq_secondary; // Secondary frequency (default: √0.75 ≈ 0.866)
            uniform float u_path_freq_tertiary;  // Tertiary frequency (default: √0.5 ≈ 0.707)
            uniform float u_path_amplitude;      // Overall amplitude of path curvature
            
            // Kaleidoscope Mathematics - Precision controls for radial symmetry
            uniform float u_kaleidoscope_smoothing; // Edge smoothing factor
            uniform float u_kaleidoscope_smooth_scale; // Scale factor for smoothing calculation
            
            // Pattern Generation Mathematics - Controls truchet pattern probability distribution
            uniform float u_pattern_threshold_full;     // Threshold for complex patterns
            uniform float u_pattern_threshold_partial_a; // First partial pattern threshold
            uniform float u_pattern_threshold_partial_b; // Second partial pattern threshold
            uniform float u_pattern_offset_scale;       // Scale for pattern randomization
            uniform float u_pattern_base_offset;        // Base offset for pattern positioning
            
            // Random Seed Mathematics - Hash function multipliers for pseudo-randomness
            uniform float u_hash_seed_rotation;  // Seed for rotation randomization
            uniform float u_hash_seed_offset;    // Seed for position randomization
            uniform float u_hash_seed_speed;     // Seed for speed randomization
            
            // Field of View Mathematics - 3D projection and perspective control
            uniform float u_fov_base;            // Base field of view setting
            uniform float u_fov_distortion;      // Perspective distortion amount
            uniform float u_perspective_curve;   // Curvature factor for depth perception
            
            // Rendering Quality Mathematics - Anti-aliasing and visual precision
            uniform float u_aa_multiplier;       // Anti-aliasing intensity multiplier
            uniform float u_line_width_base;     // Base width for pattern lines
            uniform float u_detail_frequency;    // Frequency for fine detail generation
            uniform float u_truchet_diagonal_threshold; // Threshold for diagonal pattern elements
            
            // COLOR SYSTEM UNIFORMS
            // These control the mathematical color generation and post-processing
            // u_use_color_palette and u_use_layer_colors removed - replaced by u_color_mode  
            uniform float u_invert_colors;       // Apply color inversion post-processing
            uniform float u_color_mode;          // Color mode: 0=B&W, 1=Original/Palette, 2=Layer
            uniform vec3 u_palette_a;            // Color palette coefficient A
            uniform vec3 u_palette_b;            // Color palette coefficient B
            uniform vec3 u_palette_c;            // Color palette coefficient C
            uniform vec3 u_palette_d;            // Color palette coefficient D
            
            // Layer colors from JSON presets
            uniform vec3 u_layer_color_0;
            uniform vec3 u_layer_color_1;
            uniform vec3 u_layer_color_2;
            uniform vec3 u_layer_color_3;
            uniform vec3 u_layer_color_4;
            uniform vec3 u_layer_color_5;
            uniform vec3 u_layer_color_6;
            uniform vec3 u_layer_color_7;
            uniform vec3 u_layer_color_8;
            uniform vec3 u_layer_color_9;
            uniform vec3 u_layer_color_10;
            uniform vec3 u_layer_color_11;
            uniform int u_layer_color_count;
            
            #define PI 3.14159265359
            
            // MATHEMATICAL UTILITY FUNCTIONS
            // These provide the fundamental mathematical operations for fractal generation
            
            // 2D rotation matrix - essential for kaleidoscope and animation effects
            mat2 ROT(float a) {
                return mat2(cos(a), sin(a), -sin(a), cos(a));
            }
            
            // Procedural color generation using Inigo Quilez's palette technique
            // This mathematical approach creates smooth, controllable color gradients
            vec3 palette(float t) {
                return u_palette_a + u_palette_b * cos(6.28318 * (u_palette_c * t + u_palette_d));
            }
            
            // SIMPLIFIED FRACTAL EFFECT FOR FALLBACK MODE
            // This ensures basic functionality even when external shaders aren't available
            vec3 simpleFractalEffect(vec2 p) {
                // Create a basic kaleidoscope effect using available debug parameters
                float segments = u_kaleidoscope_segments;
                float angle = atan(p.y, p.x);
                
                // Apply kaleidoscope mirroring with debug-controlled smoothing
                float segmentAngle = 2.0 * PI / segments;
                angle = mod(angle, segmentAngle);
                if (mod(floor(angle / segmentAngle), 2.0) == 1.0) {
                    angle = segmentAngle - angle;
                }
                
                // Recreate position from modified angle
                float radius = length(p);
                vec2 fractalP = vec2(cos(angle), sin(angle)) * radius;
                
                // Create truchet-inspired pattern with debug parameter control
                fractalP *= u_zoom_level;
                fractalP += u_rotation_time; // u_rotation_speed removed from shader
                
                float pattern = sin(fractalP.x * u_detail_frequency) * cos(fractalP.y * u_detail_frequency);
                pattern = smoothstep(-u_aa_multiplier * 0.01, u_aa_multiplier * 0.01, pattern - u_truchet_radius);
                
                return vec3(pattern);
            }
            
            void main() {
                // Normalize screen coordinates to standard range
                vec2 q = gl_FragCoord.xy / u_resolution.xy;
                vec2 p = -1.0 + 2.0 * q;
                p.x *= u_resolution.x / u_resolution.y; // Correct aspect ratio
                
                // Generate fractal pattern using simplified mathematics
                vec3 col = simpleFractalEffect(p);
                
                // Apply color palette based on color mode
                if (u_color_mode > 0.5 && u_color_mode < 1.5) { // Mode 1: Original Palette System
                    float t = length(col) + u_color_time;
                    col = palette(t) * length(col);
                }
                
                // Apply color intensity and inversion
                col *= u_color_intensity;
                if (u_invert_colors > 0.5) {
                    col = vec3(1.0) - col;
                }
                
                gl_FragColor = vec4(col, 1.0);
            }
        `;
    }

    // SHADER COMPILATION SYSTEM
    // This transforms human-readable GLSL code into executable GPU instructions
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        // Check for compilation errors with detailed feedback
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            
            // Provide helpful context for shader debugging
            const shaderType = type === this.gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            throw new Error(`${shaderType} shader compilation failed:\n${error}`);
        }
        
        return shader;
    }

    // SHADER PROGRAM LINKING
    // This combines vertex and fragment shaders into a complete, executable program
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        // Check for linking errors with detailed feedback
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Shader program linking failed:\n${error}`);
        }
        
        return program;
    }

    // GEOMETRY SETUP FOR FULL-SCREEN RENDERING
    // Sets up a simple quad that covers the entire screen for fractal rendering
    setupGeometry() {
        // Create a buffer containing the four corners of the screen
        // This simple geometry lets the fragment shader handle all the mathematical complexity
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        
        // Define a quad that covers the entire normalized device coordinate space
        const positions = new Float32Array([
            -1, -1,  // Bottom-left
             1, -1,  // Bottom-right
            -1,  1,  // Top-left
             1,  1   // Top-right
        ]);
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        // Connect the position buffer to the vertex shader's a_position attribute
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        console.log('📐 Full-screen quad geometry configured');
    }

    // UNIFORM SETUP SYSTEM - THE HEART OF PARAMETER CONTROL
    // This creates the communication channels between JavaScript parameters and GPU mathematics
    // Think of this as setting up a sophisticated telephone exchange with dedicated lines
    // for each parameter to reach its corresponding mathematical function in the shader
    setupUniforms() {
        console.log('📞 Setting up uniform communication channels...');
        
        // CORE SYSTEM UNIFORMS - Essential for basic operation
        const coreUniforms = [
            'u_resolution',                    // Screen dimensions for aspect ratio
            // 'u_time' removed - not used in shader
            'u_camera_position',              // Position along tunnel path
            'u_rotation_time',                // Accumulated rotation time
            'u_plane_rotation_time',          // Per-layer rotation time
            'u_color_time'                    // Color cycling time
        ];
        
        // ARTISTIC PARAMETER UNIFORMS - User-friendly creative controls
        const artisticUniforms = [
            // Speed uniforms removed - JavaScript handles time accumulation
            'u_contrast', 'u_kaleidoscope_segments', 'u_layer_count',
            'u_truchet_radius', 'u_center_fill_radius', 'u_zoom_level', 'u_color_intensity',
            'u_camera_tilt_x', 'u_camera_tilt_y', 'u_camera_roll',
            'u_path_stability', 'u_path_scale'
        ];
        
        // DEBUG PARAMETER UNIFORMS - Mathematical exploration controls
        // These correspond exactly to the debug parameters we defined in parameters.js
        const debugUniforms = [
            // Layer system mathematics
            'u_layer_distance', 'u_layer_fade_start', 'u_layer_fade_near',
            'u_layer_alpha_base', 'u_layer_alpha_range', 'u_layer_cutoff',
            
            // Camera path harmonics
            'u_path_freq_primary', 'u_path_freq_secondary', 'u_path_freq_tertiary',
            'u_path_amplitude',
            
            // Kaleidoscope system
            'u_kaleidoscope_smoothing', 'u_kaleidoscope_smooth_scale',
            
            // Pattern generation
            'u_pattern_threshold_full', 'u_pattern_threshold_partial_a',
            'u_pattern_threshold_partial_b', 'u_pattern_offset_scale',
            'u_pattern_base_offset',
            
            // Random seeds
            'u_hash_seed_rotation', 'u_hash_seed_offset', 'u_hash_seed_speed',
            
            // Field of view and perspective
            'u_fov_base', 'u_fov_distortion', 'u_perspective_curve',
            
            // Rendering quality
            'u_aa_multiplier', 'u_line_width_base', 'u_detail_frequency',
            'u_truchet_diagonal_threshold'
        ];
        
        // COLOR SYSTEM UNIFORMS - Mathematical color generation
        const colorUniforms = [
            // 'u_use_color_palette', 'u_use_layer_colors' removed - replaced by u_color_mode
            'u_invert_colors', 'u_color_mode',
            'u_palette_a', 'u_palette_b', 'u_palette_c', 'u_palette_d',
            'u_layer_color_0', 'u_layer_color_1', 'u_layer_color_2', 'u_layer_color_3',
            'u_layer_color_4', 'u_layer_color_5', 'u_layer_color_6', 'u_layer_color_7',
            'u_layer_color_8', 'u_layer_color_9', 'u_layer_color_10', 'u_layer_color_11',
            'u_layer_color_count'
        ];
        
        // Create the complete uniform registry
        const allUniforms = [
            ...coreUniforms,
            ...artisticUniforms,
            ...debugUniforms,
            ...colorUniforms
        ];
        
        // Establish communication channels for each uniform
        // This is like getting the "phone number" for each mathematical function in the shader
        let successfulConnections = 0;
        let debugConnections = 0;
        
        allUniforms.forEach(uniformName => {
            const location = this.gl.getUniformLocation(this.program, uniformName);
            
            if (location !== null) {
                this.uniforms[uniformName] = location;
                successfulConnections++;
                
                // Track debug uniforms separately for analytics
                if (debugUniforms.includes(uniformName)) {
                    debugConnections++;
                }
            } else {
                // Track missing uniforms for development feedback
                this.uniformStats.missingUniforms.push(uniformName);
                console.warn(`⚠️ Uniform '${uniformName}' not found in shader - may be optimized out or misspelled`);
            }
        });
        
        // Update statistics for monitoring and optimization
        this.uniformStats.totalUniforms = allUniforms.length;
        this.uniformStats.activeUniforms = successfulConnections;
        this.uniformStats.debugUniforms = debugConnections;
        
        console.log(`✅ Uniform system configured:`);
        console.log(`   📊 Total uniforms: ${this.uniformStats.totalUniforms}`);
        console.log(`   ✅ Successfully connected: ${this.uniformStats.activeUniforms}`);
        console.log(`   🔧 Debug uniforms: ${this.uniformStats.debugUniforms}`);
        console.log(`   ⚠️ Missing uniforms: ${this.uniformStats.missingUniforms.length}`);
        
        if (this.uniformStats.missingUniforms.length > 0) {
            console.log(`   Missing: ${this.uniformStats.missingUniforms.join(', ')}`);
        }
    }

    // DEVELOPMENT FEATURES SETUP
    // This adds helpful development and debugging capabilities
    setupDevelopmentFeatures() {
        // Only enable in development environments
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            // Add renderer-specific console commands for advanced debugging
            if (!window.kaldaoDebug) window.kaldaoDebug = {};
            
            window.kaldaoDebug.renderer = {
                getUniformStats: () => this.uniformStats,
                getRenderingMetrics: () => this.renderingMetrics,
                listActiveUniforms: () => Object.keys(this.uniforms),
                listMissingUniforms: () => this.uniformStats.missingUniforms
            };
            
            console.log('🔧 Renderer debug interface available at window.kaldaoDebug.renderer');
        }
    }

    // WINDOW RESIZE HANDLING
    // Maintains proper aspect ratio when the browser window changes size
    handleResize() {
        if (this.canvas && this.gl) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            
            console.log(`📐 Renderer resized to ${this.canvas.width}x${this.canvas.height}`);
        }
    }

    // MAIN RENDERING METHOD - WHERE MATHEMATICS BECOMES VISUAL ART
    // This is the culmination of our entire system - where JavaScript parameters
    // transform into GPU mathematics that generates beautiful fractal visualizations
    render(parameters, renderState) {
        const renderStartTime = performance.now();
        
        // Prepare the rendering context
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.program);
        
        // PHASE 1: Set core system uniforms that drive basic fractal mathematics
        this.setCoreUniforms(parameters);
        
        // PHASE 2: Set ALL parameter uniforms (artistic + debug)
        // This is where our comprehensive parameter system reaches the GPU
        this.setParameterUniforms(parameters);
        
        // PHASE 3: Set render state uniforms (color system, UI state)
        this.setRenderStateUniforms(renderState, parameters);
        
        // PHASE 4: Execute the actual rendering
        // This triggers the GPU to process our fractal mathematics and generate the visual output
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        // PHASE 5: Performance tracking for optimization feedback
        this.updateRenderingMetrics(renderStartTime);
    }
    
    // CORE UNIFORM SETTING - Essential mathematical drivers
    setCoreUniforms(parameters) {
        // These uniforms drive the fundamental mathematical evolution of the fractal
        this.gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
        // u_time removed from shader - JavaScript handles time accumulation
        this.gl.uniform1f(this.uniforms.u_camera_position, parameters.timeAccumulation.camera_position);
        this.gl.uniform1f(this.uniforms.u_rotation_time, parameters.timeAccumulation.rotation_time);
        this.gl.uniform1f(this.uniforms.u_plane_rotation_time, parameters.timeAccumulation.plane_rotation_time);
        this.gl.uniform1f(this.uniforms.u_color_time, parameters.timeAccumulation.color_time);
    }
    
    // PARAMETER UNIFORM SETTING - The heart of our mathematical control system
    // This sends ALL parameters (artistic + debug) to the GPU in one efficient operation
    setParameterUniforms(parameters) {
        const uniformUpdateStart = performance.now();
        
        // Get all parameters (both artistic and mathematical) from the parameter manager
        const allParams = parameters.getAllParameters();
        let uniformsSet = 0;
        
        // Send each parameter to its corresponding shader uniform
        // This is where JavaScript parameter values become GPU mathematical constants
        Object.keys(allParams).forEach(key => {
            const uniformName = `u_${key}`;
            const uniformLocation = this.uniforms[uniformName];
            
            if (uniformLocation !== undefined) {
                // Successfully send the parameter value to the GPU
                this.gl.uniform1f(uniformLocation, parameters.getValue(key));
                uniformsSet++;
            }
            // Note: We don't warn about missing uniforms during rendering for performance
            // Those warnings are handled during setup
        });
        
        // Track performance for optimization insights
        this.renderingMetrics.uniformUpdateTime = performance.now() - uniformUpdateStart;
        
        // In development mode, provide feedback about parameter transmission efficiency
        if (uniformsSet !== this.uniformStats.activeUniforms && location.hostname === 'localhost') {
            console.warn(`⚠️ Parameter count mismatch: set ${uniformsSet}, expected ${this.uniformStats.activeUniforms}`);
        }
    }
    
    // RENDER STATE UNIFORM SETTING - Visual presentation controls
    setRenderStateUniforms(renderState, parameters) {
        // Color system state  
        // u_use_color_palette removed - replaced by color_mode
        if (this.uniforms.u_invert_colors) {
            this.gl.uniform1f(this.uniforms.u_invert_colors, renderState.invertColors ? 1.0 : 0.0);
        }
        
        // New unified color mode system
        if (this.uniforms.u_color_mode) {
            this.gl.uniform1f(this.uniforms.u_color_mode, parameters.getValue('color_mode'));
        }
        
        // Layer colors from JSON presets
        this.setLayerColorUniforms();
        
        // Color palette coefficients for mathematical color generation
        const palette = parameters.getPalette(renderState.currentPaletteIndex);
        if (palette && this.uniforms.u_palette_a) {
            this.gl.uniform3f(this.uniforms.u_palette_a, palette.a[0], palette.a[1], palette.a[2]);
            this.gl.uniform3f(this.uniforms.u_palette_b, palette.b[0], palette.b[1], palette.b[2]);
            this.gl.uniform3f(this.uniforms.u_palette_c, palette.c[0], palette.c[1], palette.c[2]);
            this.gl.uniform3f(this.uniforms.u_palette_d, palette.d[0], palette.d[1], palette.d[2]);
        }
    }
    
    // Set layer color uniforms from color manager
    setLayerColorUniforms() {
        // Get the color manager's app reference to access layer colors
        if (!this.app || !this.app.color || !this.app.color.layerColorPalettes) {
            // Fallback colors if color manager not ready
            const fallbackColors = [
                [0.557, 0.141, 0.667], [0.098, 0.463, 0.824], [0.000, 0.475, 0.420], [0.220, 0.557, 0.235],
                [0.961, 0.486, 0.000], [0.902, 0.290, 0.098], [0.776, 0.157, 0.157], [0.678, 0.078, 0.341],
                [0.416, 0.106, 0.604], [0.271, 0.153, 0.627], [0.827, 0.184, 0.184], [0.271, 0.353, 0.392]
            ];
            
            for (let i = 0; i < 12; i++) {
                const uniformName = `u_layer_color_${i}`;
                if (this.uniforms[uniformName]) {
                    const color = fallbackColors[i] || [1.0, 1.0, 1.0];
                    this.gl.uniform3f(this.uniforms[uniformName], color[0], color[1], color[2]);
                }
            }
            
            if (this.uniforms.u_layer_color_count) {
                this.gl.uniform1i(this.uniforms.u_layer_color_count, 12);
            }
            return;
        }
        
        const currentPalette = this.app.color.layerColorPalettes[this.app.color.currentLayerPaletteIndex];
        
        if (currentPalette && currentPalette.colors) {
            // Convert hex colors to RGB and send to shader
            for (let i = 0; i < 12; i++) {
                const uniformName = `u_layer_color_${i}`;
                if (this.uniforms[uniformName]) {
                    // Cycle through colors if we have more layers than colors
                    const colorIndex = i % currentPalette.colors.length;
                    const hex = currentPalette.colors[colorIndex];
                    const rgb = this.hexToRgb(hex);
                    this.gl.uniform3f(this.uniforms[uniformName], rgb.r, rgb.g, rgb.b);
                }
            }
            
            if (this.uniforms.u_layer_color_count) {
                this.gl.uniform1i(this.uniforms.u_layer_color_count, currentPalette.colors.length);
            }
        }
    }
    
    // Convert hex color to normalized RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 1, b: 1 }; // fallback to white
    }
    
    // RENDERING PERFORMANCE TRACKING
    // This helps users understand the computational cost of their mathematical explorations
    updateRenderingMetrics(renderStartTime) {
        const renderEndTime = performance.now();
        this.renderingMetrics.lastRenderTime = renderEndTime - renderStartTime;
        this.renderingMetrics.totalFramesRendered++;
        
        // Provide performance warnings for complex mathematical configurations
        if (this.renderingMetrics.lastRenderTime > 33.33) { // Slower than 30 FPS
            // Only warn occasionally to avoid spam
            if (this.renderingMetrics.totalFramesRendered % 60 === 0) {
                console.warn(`⚡ Rendering performance: ${this.renderingMetrics.lastRenderTime.toFixed(2)}ms (target: <16.67ms for 60 FPS)`);
            }
        }
    }
}