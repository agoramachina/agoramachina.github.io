# Development Guide

This guide covers extending and modifying the Kaldao Fractal Visualizer.

## Architecture Overview

The application follows a modular ES6 architecture:

```
KaldaoApp (main.js)
├── ParameterManager (parameters.js) - Parameter definitions & state
├── AudioSystem (audio.js) - Audio analysis & reactivity
├── ControlsManager (controls.js) - Input handling
├── Renderer (renderer.js) - WebGL rendering
├── UIManager (ui.js) - UI updates & display
└── FileManager (fileIO.js) - Save/load functionality
```

## Adding New Parameters

### 1. Define Parameter in `parameters.js`

```javascript
// In ParameterManager constructor
this.parameters = {
    // ... existing parameters
    my_new_param: { 
        value: 1.0, 
        min: 0.0, 
        max: 5.0, 
        step: 0.1, 
        name: "My New Parameter" 
    }
};

// Add to parameterKeys array in appropriate category
this.parameterKeys = [
    // ... existing keys
    'my_new_param'
];
```

### 2. Add Uniform to Shaders

**In `shaders/fragment.glsl`:**
```glsl
uniform float u_my_new_param;
```

**In `renderer.js` setupUniforms():**
```javascript
const uniformNames = [
    // ... existing uniforms
    'u_my_new_param'
];
```

**In `renderer.js` render():**
```javascript
// Parameter uniforms are automatically set by this line:
parameters.getParameterKeys().forEach(key => {
    const uniformName = `u_${key}`;
    if (this.uniforms[uniformName] !== undefined) {
        this.gl.uniform1f(this.uniforms[uniformName], parameters.getValue(key));
    }
});
```

### 3. Update UI Categories

**In `ui.js` updateMenuDisplay():**
```javascript
// Add to appropriate category array
const patternParams = [
    // ... existing params
    'my_new_param'
];
```

### 4. Add Default Value

**In `parameters.js` resetParameter():**
```javascript
const defaults = {
    // ... existing defaults
    my_new_param: 1.0
};
```

## Creating New Modules

### Module Template

```javascript
// js/modules/my-module.js
export class MyModule {
    constructor() {
        this.app = null;
        // Module-specific state
    }

    init(app) {
        this.app = app;
        // Initialize module
    }

    // Module methods
    myMethod() {
        // Access other modules via this.app
        this.app.ui.updateStatus('Message', 'info');
        this.app.parameters.setValue('some_param', 1.0);
    }
}
```

### Integrating New Module

**In `main.js`:**
```javascript
import { MyModule } from './modules/my-module.js';

class KaldaoApp {
    constructor() {
        // ... existing modules
        this.myModule = new MyModule();
    }
    
    async init() {
        // ... existing init
        this.myModule.init(this);
    }
}
```

## Shader Development

### Fragment Shader Structure

```glsl
// 1. Uniforms and constants
uniform float u_time;
#define PI 3.14159265359

// 2. Utility functions
float myUtilityFunction(float x) {
    return x * 2.0;
}

// 3. Main effect function
vec3 myEffect(vec2 p, vec2 q) {
    // Your effect code here
    return vec3(1.0);
}

// 4. Post-processing
vec3 postProcess(vec3 col, vec2 q) {
    // Apply color palettes, gamma correction, etc.
    return col;
}

// 5. Main function
void main() {
    vec2 q = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = -1.0 + 2.0 * q;
    p.x *= u_resolution.x / u_resolution.y;
    
    vec3 col = myEffect(p, q);
    col = postProcess(col, q);
    
    gl_FragColor = vec4(col, 1.0);
}
```

### Shader Debugging

1. **Use browser dev tools**: Check console for compilation errors
2. **Fallback shaders**: Modify `renderer.js` fallback for testing
3. **Simple effects**: Start with simple color functions
4. **Incremental changes**: Build complexity gradually

## Audio System Extensions

### Custom Audio Analysis

```javascript
// In audio.js
customAudioAnalysis() {
    if (!this.analyser || !this.audioData) return {};
    
    this.analyser.getByteFrequencyData(this.audioData);
    
    // Custom frequency analysis
    const customRange = { start: 64, end: 128 };
    let sum = 0;
    for (let i = customRange.start; i < customRange.end; i++) {
        sum += this.audioData[i];
    }
    
    return {
        customLevel: sum / (customRange.end - customRange.start) / 255.0
    };
}
```

### Parameter Mapping

```javascript
// In audio.js applyReactivity()
const audioLevels = this.analyzeAudio();
const customLevels = this.customAudioAnalysis();

// Map custom analysis to parameters
if (this.baseParameterValues.my_new_param !== undefined) {
    const baseValue = this.baseParameterValues.my_new_param;
    const newValue = baseValue + (customLevels.customLevel * 2.0);
    parameters.setValue('my_new_param', newValue);
}
```

## UI Customization

### Adding New Menu Sections

```javascript
// In ui.js updateMenuDisplay()
paramsHTML += '<div style="color: #00BCD4; font-weight: bold; margin-bottom: 5px;">MY CATEGORY</div>';
const myParams = ['my_param_1', 'my_param_2'];
myParams.forEach(key => {
    const param = this.app.parameters.getParameter(key);
    const index = this.app.parameters.getParameterKeys().indexOf(key);
    const isCurrent = index === this.app.currentParameterIndex;
    const style = isCurrent ? 'color: #4CAF50; font-weight: bold;' : 'color: #ffffff;';
    paramsHTML += `<div style="${style}">${param.name}: ${param.value.toFixed(3)}</div>`;
});
```

### Custom Control Schemes

```javascript
// In controls.js handleKeydown()
case 'KeyN': // Custom key
    e.preventDefault();
    this.myCustomAction();
    break;
```

## Performance Optimization

### Reducing Computational Load

1. **Fewer layers**: Lower `layer_count` parameter
2. **Simplified shaders**: Remove complex calculations for mobile
3. **Dynamic quality**: Adjust based on frame rate

```javascript
// Performance monitoring example
let lastFrameTime = performance.now();
let frameCount = 0;

function checkPerformance() {
    frameCount++;
    if (frameCount % 60 === 0) {
        const currentTime = performance.now();
        const fps = 60000 / (currentTime - lastFrameTime);
        
        if (fps < 30) {
            // Reduce quality
            app.parameters.setValue('layer_count', 
                Math.max(3, app.parameters.getValue('layer_count') - 1));
        }
        
        lastFrameTime = currentTime;
    }
}
```

## Testing

### Manual Testing Checklist

- [ ] All parameters adjust correctly
- [ ] Audio reactivity works with file and microphone
- [ ] Save/load preserves all settings
- [ ] Undo/redo functions properly
- [ ] Menu displays all parameters correctly
- [ ] Keyboard shortcuts work
- [ ] Performance is acceptable on target devices

### Browser Testing

Test on multiple browsers and devices:
- Chrome (desktop/mobile)
- Firefox (desktop/mobile)  
- Safari (desktop/mobile)
- Edge (desktop)

## Build Process (Optional)

For production deployment, consider adding:

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
    entry: './js/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.glsl$/,
                use: 'raw-loader'
            }
        ]
    }
};
```

### Minification

Use tools like Terser for JavaScript and cssnano for CSS to reduce file sizes.

## Deployment

### Static Hosting

The application works on any static file server:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

### HTTPS Requirement

Audio features require secure context (HTTPS or localhost).

## Contributing

1. Follow existing code style
2. Add JSDoc comments for new functions
3. Test thoroughly across browsers
4. Update documentation for new features
5. Submit pull requests with clear descriptions