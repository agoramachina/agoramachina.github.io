// CC0: Truchet + Kaleidoscope FTW
// Heavily commented version to understand the math
// WebGL version of the Kaldao fractal visualizer

precision highp float;

// ====================
// SHADER UNIFORMS - These control the visual appearance
// ====================

uniform vec2 u_resolution;                 // Screen resolution
uniform float u_time;                      // Current time (unused in this version)
uniform float u_camera_position;           // Where we are along the tunnel path (managed by JavaScript)
uniform float u_rotation_time;             // How much the patterns have rotated (accumulated time)
uniform float u_plane_rotation_time;       // Per-plane rotation amount
uniform float u_color_time;                // Color cycling time
uniform float u_fly_speed;                 // How fast we move forward (used by JavaScript only)
uniform float u_contrast;                  // Sharpness of edges and details

// Pattern controls
uniform float u_kaleidoscope_segments;     // How many mirror segments (creates the star pattern)
uniform float u_layer_count;               // Number of layers to render
uniform float u_truchet_radius;            // Size of the circular patterns in each cell
uniform float u_center_fill_radius;        // Size of the center fill (0.0 for no fill)
uniform float u_rotation_speed;            // How fast patterns rotate
uniform float u_plane_rotation_speed;      // Per-layer rotation speed
uniform float u_zoom_level;                // How zoomed in we are (smaller = more zoomed in)
uniform float u_color_intensity;           // Brightness multiplier

// Camera movement controls
uniform float u_camera_tilt_x;             // Tilt camera left/right
uniform float u_camera_tilt_y;             // Tilt camera up/down
uniform float u_camera_roll;               // Roll camera around forward axis
uniform float u_path_stability;            // 1.0=curved path, 0.0=straight, negative=more curved
uniform float u_path_scale;                // Overall scale of path curvature

// Color system
uniform float u_use_color_palette;         // Enable colorful palettes vs black & white
uniform float u_invert_colors;             // Invert final colors (negative effect)
uniform float u_color_speed;               // How fast colors cycle
uniform vec3 u_palette_a;                  // Color palette math coefficients
uniform vec3 u_palette_b;                  // (these create different color schemes)
uniform vec3 u_palette_c;
uniform vec3 u_palette_d;

#define PI 3.14159265359

// ====================
// UTILITY FUNCTIONS - Basic math helpers
// ====================

// Create a 2D rotation matrix - rotates points around origin
mat2 ROT(float a) {
    return mat2(cos(a), sin(a), -sin(a), cos(a));
}

// Hash function: converts a number into a pseudo-random number (0 to 1)
float hashf(float co) {
    return fract(sin(co * 12.9898) * 13758.5453);
}

// Hash function for 2D points: converts coordinates into pseudo-random number
float hashv(vec2 p) {
    float a = dot(p, vec2(127.1, 311.7));
    return fract(sin(a) * 43758.5453123);
}

// Fast approximation of hyperbolic tangent (smooth S-curve from -1 to 1)
float tanh_approx(float x) {
    float x2 = x * x;
    return clamp(x * (27.0 + x2) / (27.0 + 9.0 * x2), -1.0, 1.0);
}

// "Polynomial minimum" - smooth minimum function (creates rounded corners)
// Instead of sharp min(a,b), this creates a smooth transition between a and b
float pmin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// "Polynomial maximum" - smooth maximum (opposite of pmin)
float pmax(float a, float b, float k) {
    return -pmin(-a, -b, k);
}

// "Polynomial absolute value" - smooth abs() function (rounded V-shape instead of sharp)
float pabs(float a, float k) {
    return pmax(a, -a, k);
}

// Convert from rectangular (x,y) to polar coordinates (radius, angle)
vec2 toPolar(vec2 p) {
    return vec2(length(p), atan(p.y, p.x));
}

// Convert from polar (radius, angle) back to rectangular (x,y)
vec2 toRect(vec2 p) {
    return vec2(p.x * cos(p.y), p.x * sin(p.y));
}

// Color palette function: creates smooth color gradients from 4 coefficient vectors
// This is based on Inigo Quilez's palette technique - very powerful for procedural colors
vec3 palette(float t) {
    return u_palette_a + u_palette_b * cos(6.28318 * (u_palette_c * t + u_palette_d));
}

// ====================
// CAMERA PATH SYSTEM - Creates the tunnel movement
// ====================

// Generate the camera path: creates the curved tunnel we're flying through
vec3 offset(float z) {
    float a = z;    // Use z-position as parameter for path
    
    // Create a complex curved path using sine and cosine waves
    // The sqrt(2.0), sqrt(0.75), etc. create non-repeating, organic curves
    vec2 curved_path = -0.075 * u_path_scale * (
        vec2(cos(a), sin(a * sqrt(2.0))) +              // Primary curve
        vec2(cos(a * sqrt(0.75)), sin(a * sqrt(0.5)))   // Secondary curve for complexity
    );
    
    vec2 straight_path = vec2(0.0);     // No curve = straight tunnel
    
    // Interpolate between curved and straight based on path_stability
    vec2 p;
    if (u_path_stability >= 0.0) {
        p = mix(curved_path, straight_path, u_path_stability);   // 1.0=straight, 0.0=curved
    } else {
        p = curved_path * (1.0 + abs(u_path_stability) * 2.0);  // Negative = more curved
    }
    
    // Add camera tilt effects
    p += vec2(u_camera_tilt_x, u_camera_tilt_y) * z * 0.1 * u_path_scale;
    
    return vec3(p, z);  // Return 3D position
}

// Calculate the derivative (direction) of the path - which way we're heading
vec3 doffset(float z) {
    float eps = 0.1;
    return 0.5 * (offset(z + eps) - offset(z - eps)) / eps;    // Numerical derivative
}

// Calculate the second derivative (acceleration) of the path - how the direction changes
vec3 ddoffset(float z) {
    float eps = 0.1;
    return 0.125 * (doffset(z + eps) - doffset(z - eps)) / eps;    // Second derivative
}

// ====================
// KALEIDOSCOPE SYSTEM - Creates the radial mirror symmetry
// ====================

// Modular mirror: reflects coordinate back and forth in a repeating pattern
// This is what creates the "fold" effect in kaleidoscopes
float modMirror1(inout float p, float size) {
    float halfsize = size * 0.5;
    float c = floor((p + halfsize) / size);     // Which "cell" are we in?
    p = mod(p + halfsize, size) - halfsize;     // Wrap coordinate to cell
    p *= mod(c, 2.0) * 2.0 - 1.0;               // Flip every other cell (creates mirror effect)
    return c;
}

// Smooth kaleidoscope: creates the radial mirror segments you see in the image
// This takes any point and reflects it into one "slice" of the kaleidoscope
// Enhanced version that ensures even number of segments for proper mirroring
float smoothKaleidoscope(inout vec2 p, float sm, float rep) {
    vec2 hp = p;
    vec2 hpp = toPolar(hp);     // Convert to polar coordinates
    
    // Ensure rep is always even for proper mirroring
    float evenRep = floor(rep * 0.5) * 2.0;
    evenRep = max(evenRep, 4.0); // Minimum of 4 segments
    
    // Apply mirroring to the angle coordinate
    float rn = modMirror1(hpp.y, 2.0 * PI / evenRep);   // evenRep = number of mirror segments
    
    // Smooth the sharp edges between segments
    float sa = PI / evenRep - pabs(PI / evenRep - abs(hpp.y), sm);
    hpp.y = sign(hpp.y) * sa;
    
    hp = toRect(hpp);       // Convert back to rectangular coordinates
    p = hp;
    
    return rn;
}

// ====================
// TRUCHET PATTERN SYSTEM - Creates the curved patterns in each cell
// ====================

// Distance field for a single truchet cell - this defines the pattern shapes
// Returns: x = distance to nearest pattern edge, y = distance to cell center, z = center circle info
vec3 cell_df(float r, vec2 np, vec2 mp, vec2 off) {
    // These are the two diagonal directions that define truchet patterns
    vec2 n0 = normalize(vec2(1.0, 1.0));   // Northeast diagonal
    vec2 n1 = normalize(vec2(1.0, -1.0));  // Southeast diagonal
    
    np += off;  // Apply offset to cell coordinate
    mp -= off;  // Apply offset to local position
    
    float hh = hashv(np);   // Get random value for this cell
    float h0 = hh;
    
    // Calculate distance to cell center
    vec2 p0 = mp;
    p0 = abs(p0);           // Fold into first quadrant
    p0 -= 0.5;              // Center the cell
    float d0 = length(p0);  // Distance to center
    float d1 = abs(d0 - r); // Distance to circle of radius r
    
    // Calculate distances to diagonal lines (these create the curved connections)
    float dot0 = dot(n0, mp);   // Distance to northeast diagonal
    float dot1 = dot(n1, mp);   // Distance to southeast diagonal
    
    // Create the truchet pattern shapes based on the diagonals
    float d2 = abs(dot0);
    float t2 = dot1;
    d2 = abs(t2) > sqrt(0.5) ? d0 : d2;    // Use center distance outside main area
    
    float d3 = abs(dot1);
    float t3 = dot0;
    d3 = abs(t3) > sqrt(0.5) ? d0 : d3;    // Use center distance outside main area
    
    // Combine patterns based on the random hash value
    float d = d0;           // Start with center distance
    d = min(d, d1);         // Always include the center circle
    
    // Add different pattern elements based on hash (creates variety)
    if (h0 > 0.85) {        // 15% chance: full truchet (circle + both diagonals)
        d = min(d, d2);
        d = min(d, d3);
    } else if (h0 > 0.5) {  // 35% chance: circle + one diagonal
        d = min(d, d2);
    } else if (h0 > 0.15) { // 35% chance: circle + other diagonal
        d = min(d, d3);
    }
    // 15% chance: just the circle (h0 <= 0.15)
    
    // Check if we're inside the center circle
    float center_circle_factor = length(mp) <= r ? 1.0 : 0.0;  // 1.0 if inside center circle, 0.0 if outside
    return vec3(d, (d0 - r), center_circle_factor);            // Return pattern distance, circle distance, and center info
}

// Main truchet distance function: calculates pattern for any world position
vec3 truchet_df(float r, vec2 p) {
    vec2 np = floor(p + 0.5);       // Which cell are we in?
    vec2 mp = fract(p + 0.5) - 0.5; // Position within that cell (-0.5 to 0.5)
    return cell_df(r, np, mp, vec2(0.0));
}

// ====================
// BLENDING FUNCTIONS - For combining layers
// ====================

// Alpha blending: combines two colors with transparency
vec4 alphaBlend(vec4 back, vec4 front) {
    float w = front.w + back.w * (1.0 - front.w);
    vec3 xyz = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / w;
    return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
}

// Blend a color with transparency onto an opaque background
vec3 alphaBlend34(vec3 back, vec4 front) {
    return mix(back, front.xyz, front.w);
}

// ====================
// MAIN RENDERING FUNCTIONS - Puts it all together
// ====================

// Render a single plane/layer of the fractal
vec4 plane(vec3 ro, vec3 rd, vec3 pp, vec3 off, float aa, float n) {
    // Generate hash values for this plane (makes each layer different)
    float h_ = hashf(n);
    float h0 = fract(1777.0 * h_); // Random rotation
    float h1 = fract(2087.0 * h_); // Random offset
    float h4 = fract(3499.0 * h_); // Random rotation speed
    
    float l = length(pp - ro);  // Distance from camera to this plane
    
    // Get 2D coordinates on this plane
    vec2 p = (pp - off * vec3(1.0, 1.0, 0.0)).xy;
    
    // Store the original plane coordinates for center detection
    vec2 original_p = p;
    
    // Apply per-plane rotation (each layer rotates at different speed)
    p = ROT(u_plane_rotation_time * (h4 - 0.5)) * p;
    
    // Apply kaleidoscope effect
    float rep = u_kaleidoscope_segments;    // Number of mirror segments
    float sm = 0.05 * 20.0 / rep;           // Smoothing amount (less for more segments)
    float sn = smoothKaleidoscope(p, sm, rep);  // Apply the mirroring
    
    // Apply main rotation
    p = ROT(2.0 * PI * h0 + u_rotation_time) * p;
    
    // Apply zoom and offset
    float z = u_zoom_level;
    p /= z;                             // Zoom in (smaller z = more zoomed)
    p += 0.5 + floor(h1 * 1000.0);     // Random offset for variety
    
    // Calculate truchet pattern
    float tl = tanh_approx(0.33 * l);       // Distance-based effect
    float r = u_truchet_radius;             // Size of circular elements
    vec3 d3 = truchet_df(r, p);             // Get distance to pattern + center circle info
    d3.xy *= z;                             // Scale distance by zoom
    float d = d3.x;                         // Distance to nearest pattern edge
    float lw = 0.025 * z;                   // Line width
    d -= lw;                                // Expand the pattern slightly
    
    // Convert distance to color (black and white pattern)
    vec3 col = mix(vec3(1.0), vec3(0.0), smoothstep(aa, -aa, d)); // White outside, black inside
    
    // Add fine detail lines
    col = mix(col, vec3(0.0), smoothstep(mix(1.0, -0.5, tl), 1.0, sin(PI * 100.0 * d)));
    
    // Center fill - using original plane coordinates (before all transformations)
    float center_distance = length(original_p);
    float center_edge = smoothstep(u_center_fill_radius + aa, u_center_fill_radius - aa, center_distance);
    float transparency = 0.99;  // Adjust this for transparency level (0.0 = invisible, 1.0 = opaque)
    col = mix(col, vec3(0.0), center_edge * (u_center_fill_radius > 0.01 ? 1.0 : 0.0) * transparency);
    
    // Calculate transparency (alpha) for this layer
    float t = smoothstep(aa, -aa, -d3.y - 3.0 * lw) *
        mix(0.5, 1.0, smoothstep(aa, -aa, -d3.y - lw));
    
    // Cut out areas outside the main circle
    col = mix(col, vec3(0.01), d3.y <= 0.0 ? 1.0 : 0.0);
    
    return vec4(col, t);    // Return color with transparency
}

// Sky color: what we see in the distance/background
vec3 skyColor(vec3 ro, vec3 rd) {
    // Simple gradient based on looking up or down
    float d = pow(max(dot(rd, vec3(0.0, 0.0, 1.0)), 0.0), 20.0);
    return vec3(d);  // Dark sky with bright spot in forward direction
}

// Main color calculation: renders multiple layers and combines them
vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
    float lp = length(p);   // Distance from center of screen
    
    // Calculate slightly offset ray for anti-aliasing
    vec2 np = p + 1.0 / (u_resolution * u_contrast);
    
    // Field of view effect: wider angle at edges
    float rdd = (2.0 + 1.0 * tanh_approx(lp));
    
    // Calculate ray direction in 3D space
    vec3 rd = normalize(p.x * uu + p.y * vv + rdd * ww);   // Main ray
    vec3 nrd = normalize(np.x * uu + np.y * vv + rdd * ww); // Offset ray for AA
    
    // Layer rendering parameters
    float planeDist = 1.0 - 0.25;          // Distance between layers
    float furthest = u_layer_count;        // How many layers to render
    float fadeFrom = max(furthest - 5.0, 0.0); // When to start fading
    
    float nz = floor(ro.z / planeDist);     // Which layer are we starting from?
    
    vec3 skyCol = skyColor(ro, rd);         // Background color
    
    vec4 acol = vec4(0.0);                  // Accumulated color
    float cutOff = 0.95;                    // Stop rendering when mostly opaque
    
    // Render each layer from far to near
    for (float i = 1.0; i <= 10.0; i += 1.0) {
        if (i > furthest) break;    // Don't render more layers than specified
        
        float pz = planeDist * nz + planeDist * i;  // Z position of this layer
        float pd = (pz - ro.z) / rd.z;              // Distance along ray to layer
        
        if (pd > 0.0 && acol.w < cutOff) {  // Only render if in front and not fully opaque
            vec3 pp = ro + rd * pd;         // 3D position on layer
            vec3 npp = ro + nrd * pd;       // Offset position for anti-aliasing
            
            float aa = 3.0 * length(pp - npp); // Anti-aliasing amount
            vec3 off = offset(pp.z);            // Camera path offset for this layer
            
            // Render this layer
            vec4 pcol = plane(ro, rd, pp, off, aa, nz + i);
            
            // Apply distance-based fading
            float nz1 = pp.z - ro.z;
            float fadeIn = smoothstep(planeDist * furthest, planeDist * fadeFrom, nz1);
            float fadeOut = smoothstep(0.0, planeDist * 0.1, nz1);
            
            pcol.xyz = mix(skyCol, pcol.xyz, fadeIn);   // Fade to sky color in distance
            pcol.w *= fadeOut;                          // Fade out very close layers
            pcol = clamp(pcol, 0.0, 1.0);               // Keep in valid range
            
            // Blend this layer with accumulated color
            acol = alphaBlend(pcol, acol);
        }
    }
    
    // Combine with sky color
    vec3 col = alphaBlend34(skyCol, acol);
    return col;
}

// ====================
// MAIN EFFECT - Camera setup and final rendering
// ====================

vec3 effect(vec2 p, vec2 q) {
    // Calculate camera position and orientation along the path
    vec3 ro = offset(u_camera_position);       // Camera position
    vec3 dro = doffset(u_camera_position);     // Camera forward direction
    vec3 ddro = ddoffset(u_camera_position);   // Camera acceleration (for banking)
    
    // Create camera coordinate system
    vec3 ww = normalize(dro);                  // Forward direction
    vec3 uu = normalize(cross(                 // Right direction
        normalize(vec3(0.0, 1.0, 0.0) + ddro), // Up + banking
        ww
    ));
    vec3 vv = normalize(cross(ww, uu));        // True up direction
    
    // Apply camera roll if enabled
    if (abs(u_camera_roll) > 0.001) {
        mat2 roll_rot = ROT(u_camera_roll);
        p = roll_rot * p;
    }
    
    // Render the scene
    vec3 col = color(ww, uu, vv, ro, p);
    
    return col;
}

// Post-processing: applies colors, gamma correction, vignette, and effects
vec3 postProcess(vec3 col, vec2 q) {
    // Apply color palette if enabled
    if (u_use_color_palette > 0.5) {
        float t = length(col) + u_color_time;  // Use brightness + time as palette input
        col = palette(t) * length(col);        // Apply palette while preserving relative brightness
    }

    col = clamp(col, 0.0, 1.0);                                    // Ensure colors stay in valid range
    col = pow(col, vec3(1.0 / 2.2));                               // Gamma correction (makes it look right on screen)
    col = col * 0.6 + 0.4 * col * col * (3.0 - 2.0 * col);        // Contrast enhancement
    col = mix(col, vec3(dot(col, vec3(0.33))), -0.4);              // Slight desaturation for more natural look

    // Vignette effect: darker at edges, brighter in center
    col *= 0.5 + 0.5 * pow(19.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.7);
    col *= u_color_intensity;  // Apply overall brightness control

    // Color inversion: flip all colors (like a photo negative)
    if (u_invert_colors > 0.5) {
        col = vec3(1.0) - col;
    }
    return col;
}

// ====================
// FRAGMENT SHADER ENTRY POINT
// ====================

void main() {
    // Convert screen coordinates to normalized coordinates
    vec2 q = gl_FragCoord.xy / u_resolution.xy;    // 0 to 1
    vec2 p = -1.0 + 2.0 * q;                       // -1 to 1
    p.x *= u_resolution.x / u_resolution.y;        // Correct aspect ratio
    
    // Render the effect and apply post-processing
    vec3 col = effect(p, q);
    col = postProcess(col, q);
    
    // Output final color
    gl_FragColor = vec4(col, 1.0);
}