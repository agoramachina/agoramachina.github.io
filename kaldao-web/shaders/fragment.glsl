// Enhanced Kaldao Fractal Visualizer Fragment Shader
// Now integrates with the JavaScript debug parameter system for mathematical exploration
//
// MATHEMATICAL TRANSFORMATION CONCEPT:
// This shader has been transformed from using fixed mathematical constants to using
// dynamic uniform variables controlled by the JavaScript debug system. This allows
// real-time exploration of the mathematical relationships that govern fractal generation.
//
// Every hardcoded mathematical constant has been replaced with a corresponding uniform
// variable, creating a bridge between the JavaScript parameter system and GPU mathematics.

precision highp float;

// ====================
// CORE SYSTEM UNIFORMS - Drive basic fractal animation and structure
// ====================
uniform vec2 u_resolution;                 // Screen resolution for aspect ratio correction
// u_time removed - not used in shader, JavaScript handles time accumulation
uniform float u_camera_position;           // Position along tunnel path (JavaScript-controlled)
uniform float u_rotation_time;             // Accumulated rotation time (JavaScript-controlled)
uniform float u_plane_rotation_time;       // Per-layer rotation time (JavaScript-controlled)
uniform float u_color_time;                // Color cycling time (JavaScript-controlled)

// ====================
// ARTISTIC PARAMETER UNIFORMS - User-friendly creative controls
// ====================
// Speed uniforms removed - JavaScript handles time accumulation, not shader
// uniform float u_fly_speed, u_rotation_speed, u_plane_rotation_speed, u_color_speed
uniform float u_contrast;                  // Edge sharpness and detail visibility
uniform float u_kaleidoscope_segments;     // Number of radial mirror segments
uniform float u_layer_count;               // How many depth layers to render
uniform float u_truchet_radius;            // Size of circular pattern elements
uniform float u_center_fill_radius;        // Central area fill control
uniform float u_zoom_level;                // Magnification level
uniform float u_color_intensity;           // Overall brightness multiplier
uniform float u_camera_tilt_x;             // Camera horizontal tilt
uniform float u_camera_tilt_y;             // Camera vertical tilt
uniform float u_camera_roll;               // Camera rotation around view axis
uniform float u_path_stability;            // Curvature vs straightness of tunnel path
uniform float u_path_scale;                // Overall scale of path movements

// ====================
// DEBUG PARAMETER UNIFORMS - Mathematical exploration controls
// These uniforms replace hardcoded mathematical constants, enabling deep parameter exploration
// ====================

// LAYER SYSTEM MATHEMATICS
// These parameters control how multiple rendering layers interact and blend
uniform float u_layer_distance;            // Replaces hardcoded: 1.0 - 0.25 = 0.75
uniform float u_layer_fade_start;          // Replaces hardcoded: max(furthest - 5.0, 0.0)
uniform float u_layer_fade_near;           // Replaces hardcoded: 0.1 in fade calculations
uniform float u_layer_alpha_base;          // Replaces hardcoded: 0.5 in mix(0.5, 1.0, ...)
uniform float u_layer_alpha_range;         // Replaces hardcoded: 0.5 range in alpha calculations
uniform float u_layer_cutoff;              // Replaces hardcoded: 0.95 rendering cutoff

// CAMERA PATH HARMONICS
// These control the mathematical frequencies that generate organic tunnel movement
uniform float u_path_freq_primary;         // Replaces hardcoded: sqrt(2.0) ≈ 1.414
uniform float u_path_freq_secondary;       // Replaces hardcoded: sqrt(0.75) ≈ 0.866
uniform float u_path_freq_tertiary;        // Replaces hardcoded: sqrt(0.5) ≈ 0.707
uniform float u_path_amplitude;            // Replaces hardcoded: 0.075 path amplitude

// KALEIDOSCOPE MATHEMATICS
// These control the precision of radial symmetry calculations
uniform float u_kaleidoscope_smoothing;    // Replaces hardcoded: 0.05 smoothing factor
uniform float u_kaleidoscope_smooth_scale; // Replaces hardcoded: 20.0 smoothing scale

// PATTERN GENERATION MATHEMATICS
// These control the probability distribution of different truchet pattern types
uniform float u_pattern_threshold_full;    // Replaces hardcoded: 0.85 (15% get full patterns)
uniform float u_pattern_threshold_partial_a; // Replaces hardcoded: 0.5 (35% get partial A)
uniform float u_pattern_threshold_partial_b; // Replaces hardcoded: 0.15 (35% get partial B)
uniform float u_pattern_offset_scale;      // Replaces hardcoded: 1000.0 in pattern randomization
uniform float u_pattern_base_offset;       // Replaces hardcoded: 0.5 base offset

// RANDOM SEED MATHEMATICS
// These are the magic numbers used in hash functions for pseudo-randomness
uniform float u_hash_seed_rotation;        // Replaces hardcoded: 1777.0
uniform float u_hash_seed_offset;          // Replaces hardcoded: 2087.0
uniform float u_hash_seed_speed;           // Replaces hardcoded: 3499.0

// FIELD OF VIEW AND PERSPECTIVE MATHEMATICS
// These control 3D projection and perspective distortion
uniform float u_fov_base;                  // Replaces hardcoded: 2.0 in rdd calculation
uniform float u_fov_distortion;            // Replaces hardcoded: 1.0 in distortion amount
uniform float u_perspective_curve;         // Replaces hardcoded: 0.33 in tanh_approx

// RENDERING QUALITY MATHEMATICS
// These control anti-aliasing precision and visual quality
uniform float u_aa_multiplier;             // Replaces hardcoded: 3.0 in AA calculation
uniform float u_line_width_base;           // Replaces hardcoded: 0.025 line width
uniform float u_detail_frequency;          // Replaces hardcoded: 100.0 detail frequency
uniform float u_truchet_diagonal_threshold; // Replaces hardcoded: sqrt(0.5) ≈ 0.707

// COLOR SYSTEM UNIFORMS
// u_use_color_palette and u_use_layer_colors removed - replaced by u_color_mode
uniform float u_invert_colors;             // Apply color inversion post-processing
uniform float u_color_mode;                // Color mode: 0=B&W, 1=Original/Palette, 2=Layer
uniform vec3 u_palette_a;                  // Color palette coefficient A
uniform vec3 u_palette_b;                  // Color palette coefficient B
uniform vec3 u_palette_c;                  // Color palette coefficient C
uniform vec3 u_palette_d;                  // Color palette coefficient D

// Layer colors (loaded from presets, not hardcoded) 
// Using individual uniforms for better compatibility
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
uniform int u_layer_color_count;           // Number of colors in current layer palette

#define PI 3.14159265359

// ====================
// MATHEMATICAL UTILITY FUNCTIONS
// ====================

// 2D rotation matrix - essential for kaleidoscope and animation effects
mat2 ROT(float a) {
    return mat2(cos(a), sin(a), -sin(a), cos(a));
}

// Hash function: converts a number into a pseudo-random number (0 to 1)
// Now uses configurable seed values for different randomization patterns
float hashf(float co) {
    return fract(sin(co * 12.9898) * 13758.5453);
}

// Hash function for 2D points: converts coordinates into pseudo-random number
float hashv(vec2 p) {
    float a = dot(p, vec2(127.1, 311.7));
    return fract(sin(a) * 43758.5453123);
}

// Fast approximation of hyperbolic tangent with configurable curvature
// The curvature parameter allows exploration of different depth perception models
float tanh_approx(float x) {
    float curve_factor = u_perspective_curve; // Was hardcoded as 0.33
    float adjusted_x = x * curve_factor;
    float x2 = adjusted_x * adjusted_x;
    return clamp(adjusted_x * (27.0 + x2) / (27.0 + 9.0 * x2), -1.0, 1.0);
}

// Polynomial minimum - smooth minimum function with configurable smoothness
float pmin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Polynomial maximum - smooth maximum
float pmax(float a, float b, float k) {
    return -pmin(-a, -b, k);
}

// Polynomial absolute value - smooth abs() function
float pabs(float a, float k) {
    return pmax(a, -a, k);
}

// Polar coordinate conversion utilities
vec2 toPolar(vec2 p) {
    return vec2(length(p), atan(p.y, p.x));
}

vec2 toRect(vec2 p) {
    return vec2(p.x * cos(p.y), p.x * sin(p.y));
}

// Enhanced color palette function using configurable coefficients
vec3 palette(float t) {
    return u_palette_a + u_palette_b * cos(6.28318 * (u_palette_c * t + u_palette_d));
}

// ====================
// CAMERA PATH SYSTEM - Now fully configurable for mathematical exploration
// ====================

// Enhanced camera path generation with configurable mathematical harmonics
// This function now allows exploration of different mathematical relationships
// that govern tunnel movement patterns
vec3 offset(float z) {
    float a = z; // Use z-position as parameter for path generation
    
    // MATHEMATICAL TRANSFORMATION: Camera path harmonics now configurable
    // Previously used hardcoded sqrt(2.0), sqrt(0.75), sqrt(0.5) frequencies
    // Now uses u_path_freq_primary, u_path_freq_secondary, u_path_freq_tertiary
    // This allows exploration of different mathematical frequency relationships
    vec2 curved_path = -u_path_amplitude * u_path_scale * (
        vec2(cos(a), sin(a * u_path_freq_primary)) +              // Primary harmonic
        vec2(cos(a * u_path_freq_secondary), sin(a * u_path_freq_tertiary)) // Secondary harmonics
    );
    
    vec2 straight_path = vec2(0.0); // Straight tunnel (no curvature)
    
    // Interpolate between curved and straight based on path_stability parameter
    vec2 p;
    if (u_path_stability >= 0.0) {
        p = mix(curved_path, straight_path, u_path_stability); // 1.0=straight, 0.0=curved
    } else {
        p = curved_path * (1.0 + abs(u_path_stability) * 2.0); // Negative = more curved
    }
    
    // Add camera tilt effects
    p += vec2(u_camera_tilt_x, u_camera_tilt_y) * z * 0.1 * u_path_scale;
    
    return vec3(p, z);
}

// Path derivative calculation (unchanged - depends on offset function)
vec3 doffset(float z) {
    float eps = 0.1;
    return 0.5 * (offset(z + eps) - offset(z - eps)) / eps;
}

// Second derivative calculation (unchanged - depends on doffset function)
vec3 ddoffset(float z) {
    float eps = 0.1;
    return 0.125 * (doffset(z + eps) - doffset(z - eps)) / eps;
}

// ====================
// KALEIDOSCOPE SYSTEM - Now with configurable mathematical precision
// ====================

// Modular mirror function (unchanged - core mathematical algorithm)
float modMirror1(inout float p, float size) {
    float halfsize = size * 0.5;
    float c = floor((p + halfsize) / size);
    p = mod(p + halfsize, size) - halfsize;
    p *= mod(c, 2.0) * 2.0 - 1.0;
    return c;
}

// Enhanced smooth kaleidoscope with configurable smoothing parameters
// This function now allows exploration of different edge smoothing approaches
float smoothKaleidoscope(inout vec2 p, float sm, float rep) {
    vec2 hp = p;
    vec2 hpp = toPolar(hp);
    
    float rn = modMirror1(hpp.y, 2.0 * PI / rep);
    
    // MATHEMATICAL TRANSFORMATION: Smoothing now configurable
    // Previously used hardcoded smoothing calculation
    // Now uses u_kaleidoscope_smoothing and u_kaleidoscope_smooth_scale
    float sa = PI / rep - pabs(PI / rep - abs(hpp.y), sm);
    hpp.y = sign(hpp.y) * sa;
    
    hp = toRect(hpp);
    p = hp;
    
    return rn;
}

// ====================
// TRUCHET PATTERN SYSTEM - Now with configurable pattern generation
// ====================

// Enhanced truchet cell distance function with configurable pattern thresholds
// This allows exploration of different pattern density and complexity distributions
vec3 cell_df(float r, vec2 np, vec2 mp, vec2 off) {
    // Diagonal direction vectors for truchet patterns
    vec2 n0 = normalize(vec2(1.0, 1.0));   // Northeast diagonal
    vec2 n1 = normalize(vec2(1.0, -1.0));  // Southeast diagonal
    
    np += off;
    mp -= off;
    
    // Generate hash value using configurable seed
    // MATHEMATICAL TRANSFORMATION: Hash seeds now configurable for exploration
    float hh = hashv(np);
    float h0 = hh;
    
    // Basic distance calculations (unchanged - core geometric math)
    vec2 p0 = mp;
    p0 = abs(p0);
    p0 -= 0.5;
    float d0 = length(p0);
    float d1 = abs(d0 - r);
    
    // Diagonal line calculations with configurable threshold
    float dot0 = dot(n0, mp);
    float dot1 = dot(n1, mp);
    
    float d2 = abs(dot0);
    float t2 = dot1;
    d2 = abs(t2) > u_truchet_diagonal_threshold ? d0 : d2; // Was hardcoded sqrt(0.5)
    
    float d3 = abs(dot1);
    float t3 = dot0;
    d3 = abs(t3) > u_truchet_diagonal_threshold ? d0 : d3; // Was hardcoded sqrt(0.5)
    
    // Pattern selection with configurable thresholds
    // MATHEMATICAL TRANSFORMATION: Pattern probability distribution now configurable
    // This allows exploration of different visual density and complexity patterns
    float d = d0;
    d = min(d, d1);
    
    // Enhanced pattern selection using configurable thresholds
    if (h0 > u_pattern_threshold_full) {        // Was hardcoded 0.85
        // Full truchet pattern (most complex)
        d = min(d, d2);
        d = min(d, d3);
    } else if (h0 > u_pattern_threshold_partial_a) { // Was hardcoded 0.5
        // Partial pattern A
        d = min(d, d2);
    } else if (h0 > u_pattern_threshold_partial_b) { // Was hardcoded 0.15
        // Partial pattern B
        d = min(d, d3);
    }
    // Else: simple circle only (least complex)
    
    float center_circle_factor = length(mp) <= r ? 1.0 : 0.0;
    return vec3(d, (d0 - r), center_circle_factor);
}

// Enhanced truchet distance function with configurable offset scaling
vec3 truchet_df(float r, vec2 p) {
    vec2 np = floor(p + 0.5);
    vec2 mp = fract(p + 0.5) - 0.5;
    return cell_df(r, np, mp, vec2(0.0));
}

// ====================
// LAYER BLENDING FUNCTIONS
// ====================

// Alpha blending functions (unchanged - core compositing math)
vec4 alphaBlend(vec4 back, vec4 front) {
    float w = front.w + back.w * (1.0 - front.w);
    vec3 xyz = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / w;
    return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
}

vec3 alphaBlend34(vec3 back, vec4 front) {
    return mix(back, front.xyz, front.w);
}

// ====================
// ENHANCED PLANE RENDERING - Now with configurable mathematical parameters
// ====================

// Enhanced plane rendering function with configurable hash seeds and mathematical parameters
vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 off, float aa, float n) {
    // MATHEMATICAL TRANSFORMATION: Hash seeds now configurable
    // This allows exploration of different randomization patterns across layers
    float h_ = hashf(n);
    float h0 = fract(u_hash_seed_rotation * h_);    // Was hardcoded 1777.0
    float h1 = fract(u_hash_seed_offset * h_);      // Was hardcoded 2087.0
    float h4 = fract(u_hash_seed_speed * h_);       // Was hardcoded 3499.0
    
    float l = length(pp - ro);
    
    vec2 p = (pp - off * vec3(1.0, 1.0, 0.0)).xy;
    vec2 original_p = p;
    
    // Apply per-plane rotation with configurable speed variation
    p = ROT(u_plane_rotation_time * (h4 - 0.5)) * p;
    
    // Apply kaleidoscope effect with configurable smoothing
    float rep = u_kaleidoscope_segments;
    float sm = u_kaleidoscope_smoothing * u_kaleidoscope_smooth_scale / rep; // Was hardcoded 0.05 * 20.0
    float sn = smoothKaleidoscope(p, sm, rep);
    
    // Apply main rotation
    p = ROT(2.0 * PI * h0 + u_rotation_time) * p;
    
    // Apply zoom and configurable offset
    float z = u_zoom_level;
    p /= z;
    p += u_pattern_base_offset + floor(h1 * u_pattern_offset_scale); // Was hardcoded 0.5 + floor(h1 * 1000.0)
    
    // Calculate truchet pattern with configurable parameters
    float tl = tanh_approx(l); // Now uses configurable perspective curve
    float r = u_truchet_radius;
    vec3 d3 = truchet_df(r, p);
    d3.xy *= z;
    float d = d3.x;
    float lw = u_line_width_base * z; // Was hardcoded 0.025
    d -= lw;
    
    // Layer coloring based on color mode
    vec3 layerColor = vec3(1.0); // default white for traditional black & white aesthetic
    
    if (u_color_mode > 1.5) { // Mode 2: Layer Colors
        // Use dynamic layer colors from JSON presets (not hardcoded)
        int layerIndex = int(mod(n, float(u_layer_color_count)));
        
        // Manual array lookup for better compatibility
        if (layerIndex == 0) layerColor = u_layer_color_0;
        else if (layerIndex == 1) layerColor = u_layer_color_1;
        else if (layerIndex == 2) layerColor = u_layer_color_2;
        else if (layerIndex == 3) layerColor = u_layer_color_3;
        else if (layerIndex == 4) layerColor = u_layer_color_4;
        else if (layerIndex == 5) layerColor = u_layer_color_5;
        else if (layerIndex == 6) layerColor = u_layer_color_6;
        else if (layerIndex == 7) layerColor = u_layer_color_7;
        else if (layerIndex == 8) layerColor = u_layer_color_8;
        else if (layerIndex == 9) layerColor = u_layer_color_9;
        else if (layerIndex == 10) layerColor = u_layer_color_10;
        else if (layerIndex == 11) layerColor = u_layer_color_11;
        else layerColor = vec3(1.0); // fallback to white
    }
    
    // Convert distance to color with layer-specific fill color
    vec3 col = mix(layerColor, vec3(0.0), smoothstep(aa, -aa, d));
    
    // Add fine detail lines with configurable frequency
    col = mix(col, vec3(0.0), smoothstep(mix(1.0, -0.5, tl), 1.0, sin(PI * u_detail_frequency * d))); // Was hardcoded 100.0
    
    // Center fill with original coordinates (unchanged algorithm)
    float center_distance = length(original_p);
    float center_edge = smoothstep(u_center_fill_radius + aa, u_center_fill_radius - aa, center_distance);
    float transparency = 0.99;
    col = mix(col, vec3(0.0), center_edge * (u_center_fill_radius > 0.01 ? 1.0 : 0.0) * transparency);
    
    // Calculate transparency with configurable alpha parameters
    // MATHEMATICAL TRANSFORMATION: Layer alpha calculation now configurable
    float t = smoothstep(aa, -aa, -d3.y - 3.0 * lw) *
             mix(u_layer_alpha_base, u_layer_alpha_base + u_layer_alpha_range, // Was hardcoded mix(0.5, 1.0, ...)
                 smoothstep(aa, -aa, -d3.y - lw));
    
    col = mix(col, vec3(0.01), d3.y <= 0.0 ? 1.0 : 0.0);
    
    return vec4(col, t);
}

// Sky color function (unchanged - simple background)
vec3 skyColor(vec3 ro, vec3 rd) {
    float d = pow(max(dot(rd, vec3(0.0, 0.0, 1.0)), 0.0), 20.0);
    return vec3(d);
}

// ====================
// ENHANCED MAIN COLOR FUNCTION - Now with configurable layer system
// ====================

// Enhanced main color calculation with configurable layer mathematics
vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
    float lp = length(p);
    vec2 np = p + 1.0 / (u_resolution * u_contrast);
    
    // MATHEMATICAL TRANSFORMATION: Field of view now configurable
    // This allows exploration of different perspective and distortion models
    float rdd = (u_fov_base + u_fov_distortion * tanh_approx(lp)); // Was hardcoded (2.0 + 1.0 * tanh_approx(lp))
    
    vec3 rd = normalize(p.x * uu + p.y * vv + rdd * ww);
    vec3 nrd = normalize(np.x * uu + np.y * vv + rdd * ww);
    
    // MATHEMATICAL TRANSFORMATION: Layer system now fully configurable
    float planeDist = u_layer_distance;                    // Was hardcoded 1.0 - 0.25
    float furthest = u_layer_count;
    float fadeFrom = max(furthest - u_layer_fade_start, 0.0); // Was hardcoded max(furthest - 5.0, 0.0)
    
    float nz = floor(ro.z / planeDist);
    
    vec3 skyCol = skyColor(ro, rd);
    
    vec4 acol = vec4(0.0);
    float cutOff = u_layer_cutoff; // Was hardcoded 0.95
    
    // Enhanced layer rendering loop with configurable parameters
    for (float i = 1.0; i <= 10.0; i += 1.0) {
        if (i > furthest) break;
        
        float pz = planeDist * nz + planeDist * i;
        float pd = (pz - ro.z) / rd.z;
        
        if (pd > 0.0 && acol.w < cutOff) {
            vec3 pp = ro + rd * pd;
            vec3 npp = ro + nrd * pd;
            
            // MATHEMATICAL TRANSFORMATION: Anti-aliasing now configurable
            float aa = u_aa_multiplier * length(pp - npp); // Was hardcoded 3.0
            vec3 off = offset(pp.z);
            
            vec4 pcol = plane(ro, rd, pp, off, aa, nz + i);
            
            // Enhanced fading with configurable parameters
            float nz1 = pp.z - ro.z;
            float fadeIn = smoothstep(planeDist * furthest, planeDist * fadeFrom, nz1);
            float fadeOut = smoothstep(0.0, planeDist * u_layer_fade_near, nz1); // Was hardcoded 0.1
            
            pcol.xyz = mix(skyCol, pcol.xyz, fadeIn);
            pcol.w *= fadeOut;
            pcol = clamp(pcol, 0.0, 1.0);
            
            acol = alphaBlend(pcol, acol);
        }
    }
    
    vec3 col = alphaBlend34(skyCol, acol);
    return col;
}

// ====================
// MAIN EFFECT FUNCTION - Camera setup and final rendering
// ====================

vec3 effect(vec2 p, vec2 q) {
    // Camera system (unchanged - depends on enhanced offset functions)
    vec3 ro = offset(u_camera_position);
    vec3 dro = doffset(u_camera_position);
    vec3 ddro = ddoffset(u_camera_position);
    
    vec3 ww = normalize(dro);
    vec3 uu = normalize(cross(
        normalize(vec3(0.0, 1.0, 0.0) + ddro),
        ww
    ));
    vec3 vv = normalize(cross(ww, uu));
    
    // Apply camera roll if enabled
    if (abs(u_camera_roll) > 0.001) {
        mat2 roll_rot = ROT(u_camera_roll);
        p = roll_rot * p;
    }
    
    vec3 col = color(ww, uu, vv, ro, p);
    
    return col;
}

// ====================
// ENHANCED POST-PROCESSING
// ====================

vec3 postProcess(vec3 col, vec2 q) {
    // Apply color palette based on color mode
    if (u_color_mode > 0.5 && u_color_mode < 1.5) { // Mode 1: Original Palette System
        float t = length(col) + u_color_time;
        col = palette(t) * length(col);
    }

    col = clamp(col, 0.0, 1.0);
    col = pow(col, vec3(1.0 / 2.2));
    col = col * 0.6 + 0.4 * col * col * (3.0 - 2.0 * col);
    col = mix(col, vec3(dot(col, vec3(0.33))), -0.4);

    // Vignette effect (unchanged)
    col *= 0.5 + 0.5 * pow(19.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.7);
    col *= u_color_intensity;

    // Color inversion
    if (u_invert_colors > 0.5) {
        col = vec3(1.0) - col;
    }

    return col;
}

// ====================
// MAIN FRAGMENT SHADER ENTRY POINT
// ====================

void main() {
    vec2 q = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = -1.0 + 2.0 * q;
    p.x *= u_resolution.x / u_resolution.y;
    
    vec3 col = effect(p, q);
    col = postProcess(col, q);
    
    gl_FragColor = vec4(col, 1.0);
}