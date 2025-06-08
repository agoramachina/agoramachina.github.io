# Kaldao Fractal Visualizer - Claude Code Development Guide

## Project Overview

This is a sophisticated WebGL-based fractal visualization application with real-time audio reactivity, built using a modular ES6 architecture. The application creates stunning kaleidoscopic patterns with GPU acceleration and supports extensive customization through parameters, color palettes, and audio input.

## Architecture Principles

### Modular Design
The project follows strict separation of concerns with ES6 modules:
- Each module has a single responsibility
- Modules communicate through well-defined interfaces
- All modules are initialized through the main app instance
- State management is centralized where appropriate

### File Structure
```
kaldao-fractal/
├── index.html                 # Entry point with module loading
├── css/                       # Stylesheets by component
│   ├── main.css              # Base styles and utilities
│   ├── ui.css                # UI component styles
│   └── menu.css              # Menu and overlay styles
├── js/
│   ├── main.js               # App initialization and main loop
│   └── modules/              # Core functionality modules
│       ├── parameters.js     # Parameter definitions and state
│       ├── audio.js          # Audio system and reactivity
│       ├── controls.js       # Input handling and shortcuts
│       ├── renderer.js       # WebGL rendering and shaders
│       ├── ui.js             # UI updates and menu management
│       └── fileIO.js         # Save/load functionality
├── shaders/                  # GLSL shaders
│   ├── vertex.glsl           # Vertex shader (simple quad)
│   └── fragment.glsl         # Fragment shader (main effects)
└── assets/
    └── presets/              # Parameter preset files
```

## Core Technical Stack

- **WebGL 2.0/1.0**: GPU-accelerated rendering
- **ES6 Modules**: Native browser module system
- **GLSL**: Custom fragment shaders for visual effects
- **Web Audio API**: Real-time audio analysis and reactivity
- **File API**: Save/load parameter configurations

## Development Conventions

### Code Style
- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names (`currentParameterIndex` not `idx`)
- Add JSDoc comments for public methods
- Keep functions focused and single-purpose

### Module Pattern
```javascript
export class ModuleName {
    constructor() {
        this.app = null;
        // Module-specific state
    }

    init(app) {
        this.app = app;
        // Initialize module
    }

    // Public methods
    publicMethod() {
        // Implementation
    }
}
```

### Parameter Management
All visual parameters follow this structure:
```javascript
parameter_name: { 
    value: defaultValue, 
    min: minValue, 
    max: maxValue, 
    step: stepSize, 
    name: "Display Name" 
}
```

### Shader Integration
1. Add uniform to fragment shader: `uniform float u_parameter_name;`
2. Add to uniforms array in `renderer.js`
3. Parameter automatically maps to uniform via naming convention

### State Management
- Use `app.saveStateForUndo()` before parameter changes
- Parameters have getter/setter methods for validation
- UI updates are centralized through `ui.updateDisplay()`

## Key Systems

### Parameter System (`parameters.js`)
- Manages 16 core parameters affecting visuals, camera, and movement
- Provides validation, bounds checking, and default values
- Handles time accumulation for animation
- Supports randomization with smart ranges

### Audio System (`audio.js`)
- Supports file upload and microphone input
- Real-time frequency analysis with bass/mid/treble separation
- Maps audio frequencies to visual parameters
- Maintains base parameter values for smooth transitions

### Rendering System (`renderer.js`)
- WebGL setup with fallback shaders
- Uniform management and parameter binding
- Frame-by-frame rendering with proper state management
- Handles window resizing and canvas management

### Control System (`controls.js`)
- Keyboard shortcuts for all major functions
- Parameter navigation and adjustment
- File operations and audio controls
- Undo/redo functionality

### UI System (`ui.js`)
- Auto-hiding controls with fade timers
- Organized parameter categorization
- Real-time status updates
- Comprehensive menu system

## Adding New Features

### New Parameter
1. **Define in `parameters.js`**:
   ```javascript
   my_new_param: { 
       value: 1.0, 
       min: 0.0, 
       max: 5.0, 
       step: 0.1, 
       name: "My New Parameter" 
   }
   ```

2. **Add to parameterKeys array** in appropriate category

3. **Add shader uniform** in `fragment.glsl`:
   ```glsl
   uniform float u_my_new_param;
   ```

4. **Add to uniforms list** in `renderer.js`

5. **Update UI categories** in `ui.js` if needed

6. **Add default value** to resetParameter() function

### New Module
1. **Create module file**: `js/modules/my-module.js`
2. **Follow module pattern** with constructor, init(), and methods
3. **Import and initialize** in `main.js`
4. **Add to app instance** for cross-module communication

### New Shader Effect
1. **Add to fragment shader** with proper commenting
2. **Test with fallback shader** during development
3. **Add parameter controls** if needed
4. **Update documentation** for new visual effects

## Performance Considerations

### Rendering Optimization
- Reduce `layer_count` for better performance on slower devices
- Lower `kaleidoscope_segments` for mobile compatibility
- Consider dynamic quality adjustment based on frame rate

### Memory Management
- Clean up audio streams when switching sources
- Properly dispose of WebGL resources
- Limit undo stack size (currently 50 steps)

### Browser Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Ensure HTTPS for audio features
- Provide WebGL fallbacks where possible

## Error Handling

### Graceful Degradation
- Fallback shaders if external files fail to load
- Audio error handling with user-friendly messages
- WebGL capability detection

### User Feedback
- Status messages for all operations
- Clear error descriptions
- Progress indicators for file operations

## Testing Checklist

### Core Functionality
- [ ] All parameters adjust correctly
- [ ] Audio reactivity works (file and microphone)
- [ ] Save/load preserves all settings
- [ ] Undo/redo functions properly
- [ ] Keyboard shortcuts respond correctly

### Cross-browser Testing
- [ ] Chrome (desktop/mobile)
- [ ] Firefox (desktop/mobile)
- [ ] Safari (desktop/mobile)
- [ ] Edge (desktop)

### Performance Testing
- [ ] Smooth 60fps on target hardware
- [ ] Memory usage stays reasonable
- [ ] Audio latency is acceptable
- [ ] File operations complete quickly

## Development Workflow

### Local Development
```bash
# Serve files (required for CORS/modules)
python -m http.server 8000
# or
npx serve .
```

### Adding Features
1. **Plan the change** - identify affected modules
2. **Update parameters** if needed
3. **Modify shaders** if visual changes required
4. **Update UI** if new controls needed
5. **Test thoroughly** across browsers
6. **Update documentation**

### Debugging
- Use browser dev tools for shader compilation errors
- Check console for module loading issues
- Test audio permissions in secure contexts
- Use fallback shaders for development

## Security Considerations

- **HTTPS required** for microphone access
- **File upload validation** for audio files
- **No external dependencies** beyond browser APIs
- **CORS compliance** for local development

## Deployment

### Static Hosting
Compatible with any static file server:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

### Build Process (Optional)
Consider adding for production:
- JavaScript minification
- CSS optimization
- Shader validation
- Asset bundling

## Future Scalability

### Planned Enhancements
- **More shader effects**: Additional visual algorithms
- **MIDI control**: Hardware parameter control
- **Preset sharing**: Community preset exchange
- **VR support**: WebXR integration
- **Advanced audio**: Multi-channel analysis

### Architecture Readiness
- Modular design supports easy feature addition
- Parameter system scales to many more controls
- Shader system supports complex effects
- Audio system ready for advanced analysis

## Common Patterns

### Parameter Updates
```javascript
// Always save state before changes
this.app.saveStateForUndo();

// Update parameter with validation
this.app.parameters.setValue('parameter_name', newValue);

// Update UI
this.app.ui.updateDisplay();
```

### Error Handling
```javascript
try {
    // Operation
} catch (error) {
    this.app.ui.updateStatus(`❌ Error: ${error.message}`, 'error');
    console.error(error);
}
```

### Audio Integration
```javascript
// Check if audio is active
if (this.app.audio.isReactive()) {
    this.app.audio.applyReactivity(this.app.parameters);
}
```

This guide ensures consistent development practices and helps maintain the project's modular architecture as it scales.