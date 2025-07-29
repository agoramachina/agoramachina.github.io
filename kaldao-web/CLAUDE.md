# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start local development server (required - no direct file:// access due to CORS)
python -m http.server 8000
# or
npx serve .
# or  
php -S localhost:8000

# Access application
open http://localhost:8000

# No build/compile step required - vanilla JavaScript ES6 modules
```

## Architecture Overview

This is a **dual-personality** fractal visualizer serving both artists (intuitive controls) and mathematicians (deep parameter access). The application switches between two operational modes using context-sensitive key routing.

### Core Application Flow
1. **Main Entry**: `js/main.js` - KaldaoApp class orchestrates all modules
2. **Mode Switching**: `;` toggles debug mode, `ESC` shows appropriate menu  
3. **Parameter Flow**: JavaScript parameters → GPU shader uniforms via automatic mapping
4. **State Management**: Comprehensive undo/redo with 50-step history across both modes

### Key Modules (`js/modules/`)

**ParameterManager** (`parameters.js`)
- Manages 16 artistic parameters + 50+ debug mathematical constants
- Automatic JavaScript-to-shader uniform mapping (`u_${parameterName}`)
- Categories: Movement, Pattern, Camera, Color with validation ranges

**ControlsManager** (`controls.js`) 
- Context-sensitive input routing based on `app.debugMode` state
- Same physical keys control different logical functions per mode
- Handles accelerated parameter adjustment for rapid key presses

**DebugUIManager** (`debug-ui.js`)
- Mathematical exploration interface with inline parameter editing
- Mouse interaction: click to select, double-click to edit values
- Safe parameter randomization with validation

**Renderer** (`renderer.js`)
- WebGL fractal mathematics with real-time uniform updates  
- Shader management: `shaders/vertex.glsl` + `shaders/fragment.glsl`
- 60 FPS target with performance monitoring

**AudioSystem** (`audio.js`)
- Frequency analysis → parameter modulation mapping
- Real-time parameter modification without affecting base values
- Dual input: file upload + live microphone

## Key Operational Patterns

### Dual-Mode System
- **Normal Mode**: `app.debugMode = false` - artistic parameter control
- **Debug Mode**: `app.debugMode = true` - mathematical parameter exploration
- Mode switching handled by `ControlsManager.toggleDebugMode()`

### Parameter-to-Shader Bridge
```javascript
// Automatic uniform mapping pattern used throughout renderer
const uniformName = `u_${parameterKey}`;
if (this.uniforms[uniformName] !== undefined) {
    this.gl.uniform1f(this.uniforms[uniformName], parameters.getValue(parameterKey));
}
```

### State Persistence
- **Undo/Redo**: `app.saveStateForUndo()` before parameter changes
- **File I/O**: JSON export/import of complete application state
- **URL Sharing**: Parameter encoding in URL hash for distribution

### Audio-Reactive Modulation
```javascript
// Pattern: base parameter + audio multiplier (non-destructive)
const audioModifiedValue = baseValue + (audioAnalysis.bass * multiplier);
```

## Mobile Support

The application provides responsive design and touch-friendly controls through the main UI system. Mobile interactions are handled through standard web APIs for touch events and device orientation.

## Parameter System Architecture

### Artistic Parameters (16 total)
Organized by visual function:
- **Movement**: `fly_speed`, `rotation_speed`, `plane_rotation_speed`, `zoom_level`
- **Pattern**: `kaleidoscope_segments`, `truchet_radius`, `center_fill_radius`, `layer_count`
- **Camera**: `camera_tilt_x`, `camera_tilt_y`, `camera_roll`, `path_stability`, `path_scale`
- **Visual**: `contrast`, `color_intensity`, `color_speed`

### Debug Parameters (50+ total)
Mathematical constants exposed from shader:
- **Layer System**: Multi-layer rendering mathematics
- **Camera Path**: Tunnel movement generation functions  
- **Kaleidoscope**: Radial symmetry mathematics
- **Pattern Generation**: Truchet pattern probability
- **Random Seeds**: Hash function multipliers

## WebGL Shader Architecture

**Fragment Shader** (`shaders/fragment.glsl`):
- 50+ uniform parameters for real-time mathematical control
- Kaleidoscope transformation with configurable segment count
- Multi-layer depth rendering with transparency blending
- Truchet pattern generation with probabilistic placement

**Uniform Naming Convention**: 
- JavaScript parameter `fly_speed` → Shader uniform `u_fly_speed`
- Automatic mapping eliminates manual synchronization

## Controls Reference

### Desktop Controls

| Keyboard shortcut | Description |
|-------------------|-------------|
| `↑` `↓` | Switch parameter (menu closed) / Navigate list (menu open) |
| `←` `→` | Adjust value (menu closed) / Navigate list (menu open) |
| `Mouse Wheel` | Zoom in/out |
| `ESC` | Toggle main menu |
| `Space` | Pause/resume animation |
| `R` | Reset current parameter |
| `Shift` + `R` | Reset all parameters (with confirmation) |
| `.` | Randomize parameters |
| `C` | Advanced color menu (palette editor & layer colors) |
| `Shift` + `C` | Reset to black & white |
| `I` | Invert colors |
| `A` | Toggle microphone |
| `Ctrl` + `S` | Save parameters |
| `Ctrl` + `L` | Load parameters |
| `Ctrl` + `Z` / `Y` | Undo/redo |
| `;` | Toggle debug mode (mathematical exploration) |

#### Debug Mode Only
| Keyboard shortcut | Description |
|-------------------|-------------|
| `C` | Advanced color menu (same as normal mode) |
| `Shift` + `C` | Reset to black & white |
| `I` | Invert colors |
| `R` | Reset current debug parameter |
| `Shift` + `R` | Reset all parameters (with confirmation) |
| `A` | Toggle microphone |
| `E` | Export debug state to clipboard |
| `D` | Show debug system statistics |
| `H` | Show debug mode help |
| `,` | Safe randomization of debug parameters |

### Mobile Controls

| Gesture | Description |
|---------|-------------|
| Swipe left/right | Switch parameters |
| Vertical drag | Adjust parameter value (fader-style) |
| Pinch | Zoom in/out |
| Single tap | Toggle menu |
| Long press (2s) | Reset all parameters |
| Two-finger tap | Advanced color menu |
| Shake device | Randomize parameters |
| Device tilt | Camera control (X/Y axes) |

## Development Workflow

1. **Edit Code**: Modify JS modules or shaders directly
2. **Refresh Browser**: No build step required  
3. **Test Modes**: Use `;` to toggle debug mode, `ESC` for menus
4. **Parameter Testing**: Use inline editing (click on values) or keyboard controls
5. **Audio Testing**: Upload file or enable microphone, verify reactive parameters
6. **Mobile Testing**: Test on actual devices for gesture/orientation features

## Common Debugging

- **Console Access**: `window.kaldaoDebug` for runtime diagnostics
- **Performance Monitoring**: Built-in FPS tracking and metrics
- **Parameter Validation**: Range checking with user feedback
- **Error Handling**: Graceful degradation with status messages
- **WebGL Debugging**: Check browser console for shader compilation errors

## CRITICAL: Debug UI Parameter Highlighting

**PROBLEM**: The artistic parameter highlighting in debug mode breaks frequently when modifying `debug-ui.js` or `debug.css`.

**ROOT CAUSE**: Inline styles in HTML generation override CSS classes, regardless of `!important` declarations.

**WORKING SOLUTION** (DO NOT DEVIATE FROM THIS):

1. **HTML Generation** (`updateDebugMenuDisplay()` in `debug-ui.js`):
   ```javascript
   // ✅ CORRECT - NO inline styles, only CSS classes
   const selectionClass = isCurrent ? 'selected' : 'unselected';
   debugHTML += `<div class="debug-param-line ${selectionClass}" data-param-key="${key}" data-param-type="artistic">`;
   debugHTML += `<span class="param-name">${param.name.padEnd(26)}: </span>`;
   debugHTML += `<span class="param-value" data-param-key="${key}">${displayValue.padStart(8)}</span>`;
   debugHTML += `<input type="range" class="param-slider" data-param-key="${key}" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}">`;
   debugHTML += `</div>`;
   
   // ❌ WRONG - inline styles break highlighting
   debugHTML += `<span style="color: #fff; flex: 0 0 70px;">...</span>`;
   ```

2. **Selection Updates** (`updateSelectionOnly()` in `debug-ui.js`):
   ```javascript
   // ✅ CORRECT - Only use 'selected'/'unselected' classes
   line.classList.remove('selected');
   line.classList.add('unselected');
   
   currentLine.classList.remove('unselected');
   currentLine.classList.add('selected');
   
   // ❌ WRONG - multiple conflicting classes break highlighting
   currentLine.classList.add('debug-param-current', 'selected');
   ```

3. **CSS Classes** (`debug.css`):
   ```css
   /* ✅ CORRECT - Simple, clear selection states with !important */
   .debug-param-line.selected {
       color: #4CAF50 !important;
       font-weight: bold !important;
       background: rgba(76, 175, 80, 0.1) !important;
   }
   
   .debug-param-line.unselected {
       color: #ffffff !important;
       font-weight: normal !important;
       background: transparent !important;
   }
   ```

**WHAT NOT TO DO**:
- ❌ Never add `style="..."` attributes in HTML generation
- ❌ Never mix `debug-param-current` with `selected` classes  
- ❌ Never remove `!important` from selection CSS rules
- ❌ Never modify CSS specificity by changing class combinations

**TESTING**: After ANY changes to debug UI, immediately test that artistic parameters (at top of debug menu) highlight in green when selected with arrow keys.