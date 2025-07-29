// Enhanced Parameter definitions and management
// This module now handles both user-facing artistic controls and low-level mathematical debug controls
// Think of it as managing two layers: the "artist's palette" and the "mathematician's toolbox"

export class ParameterManager {
    constructor() {
        // EXISTING USER-FACING PARAMETERS (completely unchanged)
        // These are the artistic controls that users interact with normally
        // Each parameter represents a high-level creative control over the visualization
        this.parameters = {
            fly_speed: { value: 0.25, min: -3.0, max: 3.0, step: 0.1, name: "Fly Speed" },
            contrast: { value: 1.0, min: 0.1, max: 5.0, step: 0.1, name: "Contrast" },
            kaleidoscope_segments: { value: 10.0, min: 4.0, max: 400.0, step: 2.0, name: "Kaleidoscope Segments" },
            truchet_radius: { value: 0.35, min: -1.0, max: 1.0, step: 0.01, name: "Truchet Radius" },
            center_fill_radius: { value: 0.0, min: -2.0, max: 2.0, step: 0.01, name: "Center Fill Radius" },
            layer_count: { value: 6, min: 1, max: 50, step: 1, name: "Layer Count" },
            rotation_speed: { value: 0.025, min: -6.0, max: 6.0, step: 0.01, name: "Rotation Speed" },
            zoom_level: { value: 0.3, min: -5.0, max: 5.0, step: 0.05, name: "Zoom Level" },
            color_intensity: { value: 1.0, min: 0.1, max: 2.0, step: 0.1, name: "Color Intensity" },
            plane_rotation_speed: { value: 0.5, min: -5.0, max: 5.0, step: 0.1, name: "Plane Rotation Speed" },
            camera_tilt_x: { value: 0.0, min: -10.0, max: 10.0, step: 1.0, name: "Camera Tilt X" },
            camera_tilt_y: { value: 0.0, min: -10.0, max: 10.0, step: 1.0, name: "Camera Tilt Y" },
            camera_roll: { value: 0.0, min: -3.14, max: 3.14, step: 0.1, name: "Camera Roll" },
            path_stability: { value: 1.0, min: -1.0, max: 1.0, step: 0.05, name: "Path Stability" },
            path_scale: { value: 1.0, min: -3.0, max: 3.0, step: 0.1, name: "Path Scale" },
            color_speed: { value: 0.5, min: 0.0, max: 2.0, step: 0.1, name: "Color Speed" }
        };

        // NEW: DEBUG PARAMETERS - Mathematical controls for shader internals
        // These expose the hardcoded constants from your fragment shader as adjustable parameters
        // Each category represents a different mathematical system within the shader
        this.debugParameters = {
            // LAYER SYSTEM CONTROLS
            // These parameters control how multiple layers are rendered and blended together
            // The layer system creates depth by rendering multiple planes at different distances
            layer_distance: { 
                value: 0.75,        // Default: planeDist = 1.0 - 0.25 = 0.75
                min: 0.1, max: 3.0, step: 0.01, 
                name: "Layer Distance" 
            },
            layer_fade_start: { 
                value: 5.0,         // Default: fadeFrom = max(furthest - 5.0, 0.0)
                min: 0.0, max: 10.0, step: 0.1, 
                name: "Layer Fade Start" 
            },
            layer_fade_near: { 
                value: 0.1,         // Default: fadeOut multiplier
                min: 0.01, max: 1.0, step: 0.01, 
                name: "Layer Fade Near" 
            },
            layer_alpha_base: { 
                value: 0.5,         // Default: mix(0.5, 1.0, ...) base value
                min: 0.0, max: 1.0, step: 0.01, 
                name: "Layer Alpha Base" 
            },
            layer_alpha_range: { 
                value: 0.5,         // Default: mix range (1.0 - 0.5 = 0.5)
                min: 0.0, max: 1.0, step: 0.01, 
                name: "Layer Alpha Range" 
            },
            layer_cutoff: { 
                value: 0.95,        // Default: cutOff = 0.95
                min: 0.1, max: 1.0, step: 0.01, 
                name: "Layer Cutoff" 
            },

            // CAMERA PATH HARMONICS
            // These control the mathematical frequencies that generate the curved tunnel path
            // The defaults are carefully chosen mathematical constants that create organic, non-repeating curves
            path_freq_primary: { 
                value: 1.414,       // Default: sqrt(2.0) ≈ 1.414 - creates organic curves
                min: 0.1, max: 5.0, step: 0.01, 
                name: "Path Freq Primary" 
            },
            path_freq_secondary: { 
                value: 0.866,       // Default: sqrt(0.75) ≈ 0.866 - adds complexity
                min: 0.1, max: 3.0, step: 0.01, 
                name: "Path Freq Secondary" 
            },
            path_freq_tertiary: { 
                value: 0.707,       // Default: sqrt(0.5) ≈ 0.707 - fine detail
                min: 0.1, max: 2.0, step: 0.01, 
                name: "Path Freq Tertiary" 
            },
            path_amplitude: { 
                value: 0.075,       // Default: -0.075 amplitude (we'll handle sign in shader)
                min: 0.0, max: 0.5, step: 0.005, 
                name: "Path Amplitude" 
            },

            // KALEIDOSCOPE SYSTEM
            // These control the mathematical precision of the kaleidoscope mirroring effect
            // The kaleidoscope creates radial symmetry by folding space mathematically
            kaleidoscope_smoothing: { 
                value: 0.05,        // Default: 0.05 in smoothKaleidoscope function
                min: 0.001, max: 0.2, step: 0.001, 
                name: "Kaleidoscope Smoothing" 
            },
            kaleidoscope_smooth_scale: { 
                value: 20.0,        // Default: 20.0 in smoothKaleidoscope function
                min: 1.0, max: 100.0, step: 1.0, 
                name: "Kaleidoscope Smooth Scale" 
            },

            // PATTERN GENERATION CONTROLS
            // These control the probability distribution of different truchet pattern types
            // By adjusting these thresholds, you can bias the pattern generation toward different styles
            pattern_threshold_full: { 
                value: 0.85,        // Default: if (h0 > 0.85) - 15% get full patterns
                min: 0.0, max: 1.0, step: 0.05, 
                name: "Pattern Threshold Full" 
            },
            pattern_threshold_partial_a: { 
                value: 0.5,         // Default: else if (h0 > 0.5) - 35% get partial A
                min: 0.0, max: 1.0, step: 0.05, 
                name: "Pattern Threshold Partial A" 
            },
            pattern_threshold_partial_b: { 
                value: 0.15,        // Default: else if (h0 > 0.15) - 35% get partial B
                min: 0.0, max: 1.0, step: 0.05, 
                name: "Pattern Threshold Partial B" 
            },
            pattern_offset_scale: { 
                value: 1000.0,      // Default: floor(h1 * 1000.0) for pattern variation
                min: 1.0, max: 10000.0, step: 100.0, 
                name: "Pattern Offset Scale" 
            },
            pattern_base_offset: { 
                value: 0.5,         // Default: 0.5 + floor(...) base offset
                min: 0.0, max: 2.0, step: 0.1, 
                name: "Pattern Base Offset" 
            },

            // RANDOM SEED CONTROLS
            // These are the magic numbers used in hash functions to generate pseudo-random values
            // Different seeds create completely different pattern distributions and behaviors
            hash_seed_rotation: { 
                value: 1777.0,      // Default: fract(1777.0 * h_) for rotation randomization
                min: 1.0, max: 9999.0, step: 1.0, 
                name: "Hash Seed Rotation" 
            },
            hash_seed_offset: { 
                value: 2087.0,      // Default: fract(2087.0 * h_) for offset randomization
                min: 1.0, max: 9999.0, step: 1.0, 
                name: "Hash Seed Offset" 
            },
            hash_seed_speed: { 
                value: 3499.0,      // Default: fract(3499.0 * h_) for speed randomization
                min: 1.0, max: 9999.0, step: 1.0, 
                name: "Hash Seed Speed" 
            },

            // FIELD OF VIEW AND PERSPECTIVE CONTROLS
            // These control how the 3D space is projected onto the 2D screen
            // They affect the "lens" through which you view the fractal tunnel
            fov_base: { 
                value: 2.0,         // Default: rdd = (2.0 + 1.0 * tanh_approx(lp))
                min: 0.5, max: 5.0, step: 0.1, 
                name: "FOV Base" 
            },
            fov_distortion: { 
                value: 1.0,         // Default: 1.0 * tanh_approx(lp) distortion amount
                min: 0.0, max: 3.0, step: 0.1, 
                name: "FOV Distortion" 
            },
            perspective_curve: { 
                value: 0.33,        // Default: tanh_approx(0.33 * l) in distance calculation
                min: 0.1, max: 2.0, step: 0.05, 
                name: "Perspective Curve" 
            },

            // RENDERING QUALITY CONTROLS
            // These control the visual quality and precision of the rendering
            // Higher values generally create better quality but may impact performance
            aa_multiplier: { 
                value: 3.0,         // Default: aa = 3.0 * length(pp - npp) for anti-aliasing
                min: 0.1, max: 10.0, step: 0.1, 
                name: "AA Multiplier" 
            },
            line_width_base: { 
                value: 0.025,       // Default: lw = 0.025 * z for line width
                min: 0.001, max: 0.1, step: 0.001, 
                name: "Line Width Base" 
            },
            detail_frequency: { 
                value: 100.0,       // Default: sin(PI * 100.0 * d) for detail generation
                min: 0.0, max: 500.0, step: 1.0, 
                name: "Detail Frequency" 
            },
            truchet_diagonal_threshold: { 
                value: 0.707,       // Default: abs(t2) > sqrt(0.5) ≈ 0.707 threshold
                min: 0.1, max: 1.0, step: 0.01, 
                name: "Truchet Diagonal Threshold" 
            },
            use_layer_colors: { 
                value: 0.0,         // Default: disabled (0.0) - traditional black & white
                min: 0.0, max: 1.0, step: 1.0, 
                name: "Use Layer Colors" 
            },
            color_mode: {
                value: 0.0,         // 0.0 = B&W, 1.0 = Original/Palette, 2.0 = Layer Colors
                min: 0.0, max: 2.0, step: 1.0,
                name: "Color Mode"
            }
        };

        // Time accumulation system (unchanged)
        // This tracks various time-based animations that drive the fractal movement
        this.timeAccumulation = {
            camera_position: 0.0,      // How far we've traveled through the tunnel
            rotation_time: 0.0,        // Accumulated rotation for pattern spinning
            plane_rotation_time: 0.0,  // Per-layer rotation accumulation
            color_time: 0.0            // Time for color palette cycling
        };

        // Audio modifiers system - non-destructive parameter modification
        // These store temporary audio-reactive adjustments that are applied on top of base parameter values
        this.audioModifiers = {};

        // Parameter navigation arrays (existing system unchanged)
        this.parameterKeys = [
            // MOVEMENT & ANIMATION category
            'fly_speed', 'rotation_speed', 'plane_rotation_speed', 'zoom_level',
            // PATTERN & VISUAL category  
            'kaleidoscope_segments', 'truchet_radius', 'center_fill_radius', 'layer_count', 'contrast', 'color_intensity',
            // CAMERA & PATH category
            'camera_tilt_x', 'camera_tilt_y', 'camera_roll', 'path_stability', 'path_scale',
            // COLOR & SPEED category
            'color_speed'
        ];

        // NEW: Debug parameter organization by logical categories
        // This organization helps users understand which parameters work together
        // and provides a logical navigation structure through the mathematical controls
        this.debugParameterCategories = {
            'LAYER SYSTEM': [
                'layer_distance', 'layer_fade_start', 'layer_fade_near', 
                'layer_alpha_base', 'layer_alpha_range', 'layer_cutoff'
            ],
            'CAMERA PATH': [
                'path_freq_primary', 'path_freq_secondary', 'path_freq_tertiary', 'path_amplitude'
            ],
            'KALEIDOSCOPE': [
                'kaleidoscope_smoothing', 'kaleidoscope_smooth_scale'
            ],
            'PATTERN GENERATION': [
                'pattern_threshold_full', 'pattern_threshold_partial_a', 'pattern_threshold_partial_b',
                'pattern_offset_scale', 'pattern_base_offset'
            ],
            'RANDOM SEEDS': [
                'hash_seed_rotation', 'hash_seed_offset', 'hash_seed_speed'
            ],
            'FIELD OF VIEW': [
                'fov_base', 'fov_distortion', 'perspective_curve'
            ],
            'RENDERING': [
                'aa_multiplier', 'line_width_base', 'detail_frequency', 'truchet_diagonal_threshold', 'use_layer_colors', 'color_mode'
            ]
        };
    }

    // Initialize the parameter system with app reference
    init(app) {
        this.app = app;
    }

    // Enhanced parameter access methods
    // These methods now check both regular and debug parameters seamlessly
    getParameter(key) {
        return this.parameters[key] || this.debugParameters[key];
    }

    getValue(key) {
        const param = this.getParameter(key);
        const baseValue = param?.value ?? 0;
        
        // Apply audio modifier if present (non-destructive)
        const audioModifier = this.audioModifiers[key];
        if (audioModifier !== undefined) {
            return audioModifier;
        }
        
        return baseValue;
    }

    getBaseValue(key) {
        // Always returns the base parameter value, ignoring audio modifiers
        const param = this.getParameter(key);
        return param?.value ?? 0;
    }

    setValue(key, value) {
        const param = this.getParameter(key);
        if (param) {
            // Apply bounds checking to keep values within safe ranges
            param.value = Math.max(param.min, Math.min(param.max, value));
            
            // Special handling for parameters that need specific constraints
            if (key === 'kaleidoscope_segments') {
                // Kaleidoscope segments must be even numbers for proper symmetry
                param.value = Math.round(param.value / 2) * 2;
            }
        }
    }

    adjustParameter(key, delta) {
        const param = this.getParameter(key);
        if (param) {
            this.setValue(key, param.value + delta * param.step);
        }
    }

    // Navigation and organization methods
    getParameterKeys() {
        return this.parameterKeys;
    }

    getDebugParameterCategories() {
        // Include artistic parameters as the first category in debug mode
        return {
            'ARTISTIC PARAMETERS': this.parameterKeys,
            ...this.debugParameterCategories
        };
    }

    getAllDebugParameterKeys() {
        return Object.values(this.debugParameterCategories).flat();
    }

    // NEW: Combined parameter access for renderer and save/load systems
    // This method provides access to ALL parameters (regular + debug) for comprehensive state management
    getAllParameters() {
        return { ...this.parameters, ...this.debugParameters };
    }

    // Color palette system methods - delegate to color module
    getColorPalettes() {
        return this.app ? this.app.color.getColorPalettes() : [];
    }

    getPalette(index) {
        return this.app ? this.app.color.getPalette(index) : null;
    }

    // Time accumulation system (unchanged)
    // This drives the continuous animation of the fractal tunnel
    updateTimeAccumulation(deltaTime) {
        this.timeAccumulation.camera_position += this.getValue('fly_speed') * deltaTime;
        this.timeAccumulation.rotation_time += this.getValue('rotation_speed') * deltaTime;
        this.timeAccumulation.plane_rotation_time += this.getValue('plane_rotation_speed') * deltaTime;
        this.timeAccumulation.color_time += this.getValue('color_speed') * deltaTime;
    }

    // Enhanced reset functionality that handles both parameter types
    resetParameter(key) {
        // Comprehensive default values for ALL parameters (regular + debug)
        const defaults = {
            // Regular parameter defaults (unchanged)
            fly_speed: 0.25, contrast: 1.0, kaleidoscope_segments: 10.0,
            truchet_radius: 0.35, center_fill_radius: 0.0, layer_count: 6,
            rotation_speed: 0.025, zoom_level: 0.3, color_intensity: 1.0,
            plane_rotation_speed: 0.5, camera_tilt_x: 0.0, camera_tilt_y: 0.0,
            camera_roll: 0.0, path_stability: 1.0, path_scale: 1.0, color_speed: 0.5,
            
            // Debug parameter defaults - these restore the original shader mathematics
            layer_distance: 0.75, layer_fade_start: 5.0, layer_fade_near: 0.1,
            layer_alpha_base: 0.5, layer_alpha_range: 0.5, layer_cutoff: 0.95,
            path_freq_primary: 1.414, path_freq_secondary: 0.866, path_freq_tertiary: 0.707,
            path_amplitude: 0.075, kaleidoscope_smoothing: 0.05, kaleidoscope_smooth_scale: 20.0,
            pattern_threshold_full: 0.85, pattern_threshold_partial_a: 0.5, pattern_threshold_partial_b: 0.15,
            pattern_offset_scale: 1000.0, pattern_base_offset: 0.5,
            hash_seed_rotation: 1777.0, hash_seed_offset: 2087.0, hash_seed_speed: 3499.0,
            fov_base: 2.0, fov_distortion: 1.0, perspective_curve: 0.33,
            aa_multiplier: 3.0, line_width_base: 0.025, detail_frequency: 100.0,
            truchet_diagonal_threshold: 0.707, use_layer_colors: 0.0, color_mode: 0.0
        };
        
        if (defaults[key] !== undefined) {
            this.setValue(key, defaults[key]);
        }
    }

    resetAllParameters() {
        // Reset both regular and debug parameters to their mathematical defaults
        [...this.parameterKeys, ...this.getAllDebugParameterKeys()].forEach(key => {
            this.resetParameter(key);
        });
    }

    // Enhanced state management that includes debug parameters
    // This ensures save/load operations capture the complete mathematical state
    getState() {
        const state = {};
        const allParams = this.getAllParameters();
        Object.keys(allParams).forEach(key => {
            state[key] = allParams[key].value;
        });
        return state;
    }

    setState(state) {
        Object.keys(state).forEach(key => {
            // Only set values for parameters that actually exist in our system
            if (this.parameters[key] || this.debugParameters[key]) {
                const param = this.getParameter(key);
                if (param) {
                    param.value = state[key];
                }
            }
        });
    }

    // Color palette state management - delegate to color module
    getPalettesState() {
        return this.app ? this.app.color.getPalettesState() : [];
    }

    setPalettesState(palettes) {
        if (this.app) {
            this.app.color.setPalettesState(palettes);
        }
    }

    // Enhanced randomization that only affects user-facing parameters by default
    // Debug parameters are generally not randomized to avoid breaking the mathematical foundations
    randomizeParameters() {
        const excludeParams = ['color_intensity', 'color_speed'];
        
        // Define reasonable randomization ranges that create interesting but stable results
        const randomRanges = {
            fly_speed: { min: -1.0, max: 2.0 },
            contrast: { min: 0.5, max: 3.0 },
            kaleidoscope_segments: { min: 6.0, max: 32.0 },
            truchet_radius: { min: 0.1, max: 0.8 },
            center_fill_radius: { min: -0.5, max: 0.5 },
            layer_count: { min: 4, max: 8 },
            rotation_speed: { min: -2.0, max: 2.0 },
            zoom_level: { min: 0.1, max: 2.0 },
            plane_rotation_speed: { min: -2.0, max: 2.0 },
            camera_tilt_x: { min: -3.0, max: 3.0 },
            camera_tilt_y: { min: -3.0, max: 3.0 },
            camera_roll: { min: -1.0, max: 1.0 },
            path_stability: { min: -0.5, max: 1.0 },
            path_scale: { min: 0.5, max: 2.0 }
        };
        
        // Only randomize regular parameters, leaving debug parameters at their carefully chosen defaults
        Object.keys(this.parameters).forEach(key => {
            if (excludeParams.includes(key)) return;
            
            const param = this.parameters[key];
            const range = randomRanges[key];
            
            if (range) {
                // Use constrained range for better artistic results
                param.value = Math.random() * (range.max - range.min) + range.min;
            } else {
                // Fallback to full parameter range if no specific range defined
                param.value = Math.random() * (param.max - param.min) + param.min;
            }
            
            // Round to appropriate step size for clean values
            param.value = Math.round(param.value / param.step) * param.step;
            
            // Apply special constraints
            if (key === 'kaleidoscope_segments') {
                param.value = Math.round(param.value / 2) * 2;
            }
            
            // Final bounds checking
            param.value = Math.max(param.min, Math.min(param.max, param.value));
        });
    }

    // Color palette randomization - delegate to color module
    randomizePalette(index) {
        if (this.app) {
            this.app.color.randomizePalette(index);
        }
    }

    // Advanced color menu - delegate to color module
    showAdvancedColorMenu() {
        if (this.app) {
            this.app.color.showAdvancedColorMenu();
        }
    }

    // Delegate color palette methods to color module
    randomizePalette(index) {
        return this.app ? this.app.color.randomizePalette(index) : null;
    }
    
    resetPalette(index) {
        return this.app ? this.app.color.resetPalette(index) : null;
    }
    
    resetAllPalettes() {
        return this.app ? this.app.color.resetAllPalettes() : null;
    }

    // Audio modifiers system - for audio-reactive parameter control
    setAudioModifier(key, value) {
        // Only allow audio modifiers for parameters that exist
        if (this.getParameter(key)) {
            this.audioModifiers[key] = value;
        }
    }

    resetAudioModifiers() {
        this.audioModifiers = {};
    }

    getAudioModifier(key) {
        return this.audioModifiers[key];
    }

    hasAudioModifier(key) {
        return this.audioModifiers[key] !== undefined;
    }
}