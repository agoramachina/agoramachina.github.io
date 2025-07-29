// Debug UI Manager - Handles the low-level parameter debug interface
// This module provides deep mathematical control over the fractal visualization
// by exposing shader internals as adjustable parameters

export class DebugUIManager {
    constructor() {
        this.app = null;
        this.currentDebugParameterIndex = 0;
        this.allDebugKeys = []; // Flattened list of all debug parameter keys for navigation
        this.parameterModificationCount = 0; // Track how many debug params have been modified
        this.keyboardNavigationActive = false; // Track if we're currently navigating with keyboard
        this.keyboardNavigationTimeout = null; // Timeout to reset keyboard navigation flag
        
        // Debug logging menu state
        this.debugLoggingMenuVisible = false;
        
        // Debug logging settings - control what gets logged to console
        this.debugLogging = {
            audioLevels: false,      // 🎤 Audio level analysis
            audioRawData: false,     // 🎤 Raw audio data values
            audioEffects: false,     // 🎨 Which parameters audio affects
            performanceFrames: false, // 🎬 Frame performance every 60 frames
            microphoneSetup: true,   // 🎤 Microphone initialization info
            parameterChanges: false, // 📊 Parameter value changes
            systemStatus: false      // 🔧 System diagnostics
        };
    }

    init(app) {
        this.app = app;
        this.buildDebugParameterList();
        console.log('Debug UI Manager initialized with', this.allDebugKeys.length, 'total parameters (artistic + debug)');
    }

    // Build a flat list of ALL parameter keys for navigation (artistic + debug)
    // This creates a single array we can navigate through with arrow keys
    buildDebugParameterList() {
        this.allDebugKeys = [];
        
        // Add all parameters organized by category (includes artistic parameters as first category)
        const categories = this.app.parameters.getDebugParameterCategories();
        Object.keys(categories).forEach(categoryName => {
            this.allDebugKeys.push(...categories[categoryName]);
        });

        console.log('Debug parameter navigation order (unified categories):', this.allDebugKeys);
    }

    // Toggle debug menu visibility
    // This switches between normal operation and debug mode
    toggleDebugMenu() {
        this.app.debugMenuVisible = !this.app.debugMenuVisible;
        const debugMenu = document.getElementById('debugMenu');
        const ui = document.getElementById('ui');
        const controls = document.getElementById('controls');
        const menu = document.getElementById('menu');
        
        if (this.app.debugMenuVisible) {
            // Entering debug mode - hide everything else and show debug interface
            debugMenu.classList.remove('hidden');
            ui.classList.add('hidden');
            controls.classList.add('hidden');
            menu.classList.add('hidden');
            this.app.menuVisible = false; // Close main menu if open
            
            // Update the debug display with current parameter values
            this.updateDebugMenuDisplay();
            
            // Start real-time system status monitoring
            this.startSystemStatusUpdates();
            this.updateSystemStatus(); // Initial update
            
            
            // Provide user feedback about entering debug mode
            this.app.ui.updateStatus('DEBUG MODE: Use ↑/↓ to navigate, ←/→ to adjust', 'info');
        } else {
            // Exiting debug mode - restore normal interface
            debugMenu.classList.add('hidden');
            ui.classList.remove('hidden');
            controls.classList.remove('hidden');
            
            // Stop system status monitoring
            this.stopSystemStatusUpdates();
            
            
            
            // Update normal UI to reflect any changes made in debug mode
            this.app.ui.updateDisplay();
            this.app.ui.updateStatus('Debug mode closed', 'success');
        }
    }

    // Navigate through debug parameters
    // Delta of -1 moves up, +1 moves down through the parameter list
    switchDebugParameter(delta) {
        if (this.allDebugKeys.length === 0) return;
        
        // Set keyboard navigation flag to prevent mouse interference
        this.keyboardNavigationActive = true;
        
        // Add CSS class to disable hover effects during keyboard navigation
        const debugParamsList = document.getElementById('debugParametersList');
        if (debugParamsList) {
            debugParamsList.classList.add('keyboard-navigation');
        }
        
        // Clear any existing timeout
        if (this.keyboardNavigationTimeout) {
            clearTimeout(this.keyboardNavigationTimeout);
        }
        
        // Reset flag after a short delay to allow mouse interaction again
        this.keyboardNavigationTimeout = setTimeout(() => {
            this.keyboardNavigationActive = false;
            // Remove CSS class to re-enable hover effects
            if (debugParamsList) {
                debugParamsList.classList.remove('keyboard-navigation');
            }
        }, 500); // Slightly longer timeout to ensure hover effects don't interfere
        
        // Wrap around at the ends of the list for continuous navigation
        this.currentDebugParameterIndex = (this.currentDebugParameterIndex + delta + this.allDebugKeys.length) % this.allDebugKeys.length;
        
        // Use lightweight selection update instead of full HTML rebuild
        this.updateSelectionOnly();
        
        // Provide immediate feedback about which parameter is now selected
        const currentKey = this.allDebugKeys[this.currentDebugParameterIndex];
        const currentParam = this.app.parameters.getParameter(currentKey);
        this.app.ui.updateStatus(`Selected: ${currentParam.name}`, 'info');
    }

    // Adjust current debug parameter
    // This is where the mathematical magic happens - we're directly modifying shader behavior
    adjustDebugParameter(delta) {
        if (this.allDebugKeys.length === 0) return;
        
        // Set keyboard navigation flag to prevent mouse interference during value adjustment
        this.keyboardNavigationActive = true;
        
        // Add CSS class to disable hover effects during keyboard value adjustment
        const debugParamsList = document.getElementById('debugParametersList');
        if (debugParamsList) {
            debugParamsList.classList.add('keyboard-navigation');
        }
        
        // Clear any existing timeout
        if (this.keyboardNavigationTimeout) {
            clearTimeout(this.keyboardNavigationTimeout);
        }
        
        // Reset flag after a short delay to allow mouse interaction again
        this.keyboardNavigationTimeout = setTimeout(() => {
            this.keyboardNavigationActive = false;
            // Remove CSS class to re-enable hover effects
            if (debugParamsList) {
                debugParamsList.classList.remove('keyboard-navigation');
            }
        }, 500); // Same timeout as navigation
        
        // Save state for undo before making any changes
        // This is crucial because debug parameter changes can have dramatic effects
        this.app.saveStateForUndo();
        
        const paramKey = this.allDebugKeys[this.currentDebugParameterIndex];
        const oldValue = this.app.parameters.getValue(paramKey);
        
        // Apply the adjustment using the parameter's defined step size
        this.app.parameters.adjustParameter(paramKey, delta);
        
        const newValue = this.app.parameters.getValue(paramKey);
        
        // Track modifications for user awareness
        if (oldValue !== newValue) {
            this.parameterModificationCount++;
        }
        
        // Update the display to show the new value using lightweight update
        this.updateSelectionOnly();
        
        // Update system status to reflect parameter change
        this.updateSystemStatus();
        
        // Provide detailed feedback about the change
        const param = this.app.parameters.getParameter(paramKey);
        this.app.ui.updateStatus(`${param.name}: ${newValue.toFixed(3)} (${this.parameterModificationCount} total changes)`, 'success');
    }

    // ENHANCEMENT: Set up mouse interaction for parameter selection and editing
    setupMouseInteraction() {
        const parameterLines = document.querySelectorAll('.debug-param-line[data-param-key]');
        const parameterValues = document.querySelectorAll('.param-value[data-param-key]');
        const parameterSliders = document.querySelectorAll('.param-slider[data-param-key]');
        
        console.log('Debug: setupMouseInteraction found:', {
            lines: parameterLines.length,
            values: parameterValues.length,
            sliders: parameterSliders.length
        });
        
        parameterLines.forEach(line => {
            const paramKey = line.getAttribute('data-param-key');
            const paramType = line.getAttribute('data-param-type');
            
            // Click to select parameter (only if not in keyboard navigation mode)
            line.addEventListener('click', (e) => {
                // Don't select if clicking on the value span (that's for editing)
                if (e.target.classList.contains('param-value')) return;
                
                e.preventDefault();
                if (!this.keyboardNavigationActive) {
                    this.selectParameterByKey(paramKey, paramType);
                }
            });
            
            // Double-click to edit parameter value (only if not in keyboard navigation mode)
            line.addEventListener('dblclick', (e) => {
                e.preventDefault();
                if (!this.keyboardNavigationActive) {
                    this.editParameterValue(paramKey, line);
                }
            });
            
            // Prevent mouse hover effects during keyboard navigation
            line.addEventListener('mouseenter', (e) => {
                if (this.keyboardNavigationActive) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        });
        
        // Add click handlers for parameter values
        parameterValues.forEach(valueSpan => {
            const paramKey = valueSpan.getAttribute('data-param-key');
            
            valueSpan.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent line selection
                if (!this.keyboardNavigationActive) {
                    this.editParameterValue(paramKey, valueSpan.parentElement);
                }
            });
            
            // Add visual feedback for clickable values using CSS classes only
            valueSpan.addEventListener('mouseenter', (e) => {
                if (!this.keyboardNavigationActive) {
                    valueSpan.classList.add('param-value-hover');
                }
            });
            
            valueSpan.addEventListener('mouseleave', (e) => {
                valueSpan.classList.remove('param-value-hover');
            });
        });
        
        // Add minimal event handlers to test basic slider functionality
        console.log('Debug: Attempting to add event handlers to', parameterSliders.length, 'sliders');
        
        parameterSliders.forEach((slider, index) => {
            const paramKey = slider.getAttribute('data-param-key');
            console.log(`Debug: Setting up slider ${index} for parameter "${paramKey}"`);
            
            // Test if slider element is accessible
            console.log('Debug: Slider element:', slider, 'disabled?', slider.disabled, 'readonly?', slider.readOnly);
            
            // Update parameter when slider moves
            slider.addEventListener('input', function(e) {
                console.log('SUCCESS: Slider input event fired!', paramKey, e.target.value);
                const newValue = parseFloat(e.target.value);
                this.app.parameters.setValue(paramKey, newValue);
            }.bind(this));
            
            slider.addEventListener('click', function(e) {
                console.log('SUCCESS: Slider click event fired!', paramKey);
            });
            
            slider.addEventListener('mousedown', function(e) {
                console.log('SUCCESS: Slider mousedown event fired!', paramKey);
            });
        });
    }
    
    // Helper method to format parameter values with minimum 2 decimal places
    formatParameterValue(value, step) {
        // Determine appropriate decimal places based on step size, minimum 2
        let decimalPlaces;
        if (step >= 1.0) {
            decimalPlaces = 2; // Minimum 2 even for whole numbers (e.g., 5.00)
        } else if (step >= 0.1) {
            decimalPlaces = 2; // 2 decimal places (e.g., 1.50)
        } else if (step >= 0.01) {
            decimalPlaces = 2; // 2 decimal places (e.g., 0.50)
        } else if (step >= 0.001) {
            decimalPlaces = 3; // 3 decimal places for smaller steps (e.g., 0.125)
        } else if (step >= 0.0001) {
            decimalPlaces = 4; // 4 decimal places for very small steps
        } else {
            decimalPlaces = 5; // 5 decimal places for tiny steps
        }
        
        return value.toFixed(decimalPlaces);
    }
    
    // ENHANCEMENT: Select a parameter by its key (for mouse interaction)
    selectParameterByKey(paramKey, paramType) {
        if (paramType === 'artistic') {
            // Select artistic parameter in debug mode (don't close menu)
            const index = this.allDebugKeys.indexOf(paramKey);
            if (index !== -1) {
                this.currentDebugParameterIndex = index;
                this.updateDebugMenuDisplay();
                
                const param = this.app.parameters.getParameter(paramKey);
                this.app.ui.updateStatus(`Selected: ${param.name}`, 'info');
            }
        } else {
            // Select debug parameter
            const index = this.allDebugKeys.indexOf(paramKey);
            if (index !== -1) {
                this.currentDebugParameterIndex = index;
                this.updateDebugMenuDisplay();
                
                const param = this.app.parameters.getParameter(paramKey);
                this.app.ui.updateStatus(`Selected: ${param.name}`, 'info');
            }
        }
    }
    
    // ENHANCEMENT: Direct editing of parameter values
    editParameterValue(paramKey, lineElement) {
        const param = this.app.parameters.getParameter(paramKey);
        if (!param) return;
        
        // Find the value span within the line element
        const valueSpan = lineElement.querySelector('.param-value[data-param-key="' + paramKey + '"]');
        if (!valueSpan) return;
        
        const currentValue = param.value;
        
        // Store original content for restoration
        const originalContent = valueSpan.textContent;
        
        // Create inline editor
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.min = param.min;
        input.max = param.max;
        input.step = param.step;
        input.style.cssText = `
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4CAF50;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 1px 3px;
            border-radius: 2px;
            width: 70px;
            text-align: right;
        `;
        
        // Replace value span content with editor
        valueSpan.innerHTML = '';
        valueSpan.appendChild(input);
        
        // Focus and select all text
        input.focus();
        input.select();
        
        // Handle editing completion
        const finishEdit = () => {
            const newValue = parseFloat(input.value);
            
            if (!isNaN(newValue) && newValue >= param.min && newValue <= param.max) {
                // Save state for undo
                this.app.saveStateForUndo();
                
                // Update parameter value
                this.app.parameters.setValue(paramKey, newValue);
                
                // Restore the value span with new value using consistent formatting
                let displayValue = this.formatParameterValue(newValue, param.step);
                valueSpan.textContent = displayValue.padStart(8);
                
                // Update displays - use lightweight update to avoid losing focus
                this.updateSelectionOnly();
                this.app.ui.updateDisplay();
                
                this.app.ui.updateStatus(`${param.name} set to ${newValue.toFixed(3)}`, 'success');
            } else {
                // Invalid value, revert value span content
                valueSpan.textContent = originalContent;
                this.app.ui.updateStatus(`Invalid value for ${param.name} (range: ${param.min} to ${param.max})`, 'error');
            }
        };
        
        // Handle keyboard events
        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Prevent all event propagation
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Restore value span content on escape
                valueSpan.textContent = originalContent;
            }
        });
        
        // Prevent all other events from propagating during editing
        input.addEventListener('keyup', (e) => e.stopPropagation());
        input.addEventListener('keypress', (e) => e.stopPropagation());
        input.addEventListener('input', (e) => e.stopPropagation());
        input.addEventListener('mousemove', (e) => e.stopPropagation());
        input.addEventListener('mouseenter', (e) => e.stopPropagation());
        input.addEventListener('mouseleave', (e) => e.stopPropagation());
        
        // Handle focus loss
        input.addEventListener('blur', finishEdit);
    }
    
    // ENHANCEMENT: Get currently selected parameter key (works for both artistic and debug)
    getCurrentSelectedParameterKey() {
        if (this.app.debugMenuVisible) {
            // In debug mode, return current debug parameter
            return this.allDebugKeys[this.currentDebugParameterIndex] || null;
        } else {
            // In normal mode, return current artistic parameter
            const paramKeys = this.app.parameters.getParameterKeys();
            return paramKeys[this.app.currentParameterIndex] || null;
        }
    }

    // Update the debug menu display
    // This rebuilds the entire debug interface to reflect current parameter values and includes ALL parameters
    updateDebugMenuDisplay() {
        if (!this.app.debugMenuVisible) return;

        const debugParamsList = document.getElementById('debugParametersList');
        if (!debugParamsList) return;

        const categories = this.app.parameters.getDebugParameterCategories();
        let debugHTML = '';

        // Build the display category by category for all parameters (artistic + debug)
        Object.keys(categories).forEach(categoryName => {
            // Wrap each category in a container to keep it together in columns
            debugHTML += `<div class="debug-category-wrapper">`;
            
            // Category header with consistent styling - add special class for artistic parameters
            const categoryClass = categoryName === 'ARTISTIC PARAMETERS' ? 'debug-category-header artistic-category' : 'debug-category-header';
            debugHTML += `<div class="${categoryClass}">${categoryName}</div>`;
            
            // Parameters in this category
            categories[categoryName].forEach(key => {
                const param = this.app.parameters.getParameter(key);
                if (!param) return;
                
                const isCurrent = key === this.getCurrentSelectedParameterKey();
                
                // Format with appropriate decimal places based on step size
                let displayValue = this.formatParameterValue(param.value, param.step);
                
                const selectionClass = isCurrent ? 'selected' : 'unselected';
                
                // Determine parameter type based on category
                const paramType = categoryName === 'ARTISTIC PARAMETERS' ? 'artistic' : 'debug';
                
                debugHTML += `<div class="debug-param-line ${selectionClass}" data-param-key="${key}" data-param-type="${paramType}">`;
                debugHTML += `<span class="param-name">${param.name.padEnd(26)}: </span>`;
                debugHTML += `<span class="param-value" data-param-key="${key}">${displayValue.padStart(8)}</span>`;
                debugHTML += `<input type="range" class="param-slider" data-param-key="${key}" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}">`;
                debugHTML += `</div>`;
            });
            
            // Close category wrapper
            debugHTML += `</div>`;
        });

        debugParamsList.innerHTML = debugHTML;
        
        // ENHANCEMENT: Add click event listeners for mouse interaction
        this.setupMouseInteraction();
        
        // Update the current parameter info panel
        this.updateCurrentParameterInfo();
    }

    // Lightweight selection update that doesn't rebuild HTML (prevents hover animation re-triggering)
    updateSelectionOnly() {
        if (!this.app.debugMenuVisible || this.allDebugKeys.length === 0) return;

        const currentKey = this.allDebugKeys[this.currentDebugParameterIndex];
        
        // Update all parameter values in case any have changed
        const allParamLines = document.querySelectorAll('.debug-param-line');
        allParamLines.forEach(line => {
            const paramKey = line.getAttribute('data-param-key');
            const paramType = line.getAttribute('data-param-type');
            
            // Update the parameter value display and slider position
            const param = this.app.parameters.getParameter(paramKey);
            if (param) {
                const valueSpan = line.querySelector('.param-value');
                const slider = line.querySelector('.param-slider');
                
                if (valueSpan) {
                    // Format with appropriate decimal places based on step size
                    let displayValue = this.formatParameterValue(param.value, param.step);
                    valueSpan.textContent = displayValue.padStart(8);
                }
                
                // Update slider position to match current parameter value
                if (slider) {
                    slider.value = param.value;
                }
            }
            
            // Restore appropriate non-selected styling using CSS classes (preserves layout)
            line.classList.remove('selected');
            line.classList.add('unselected');
        });
        
        // Apply current selection to the right item
        const currentLine = document.querySelector(`[data-param-key="${currentKey}"]`);
        if (currentLine) {
            currentLine.classList.remove('unselected');
            currentLine.classList.add('selected');
        }
        
        // Update the current parameter info panel
        this.updateCurrentParameterInfo();
    }

    // Update the side panel with detailed information about the current parameter
    updateCurrentParameterInfo() {
        const currentParamInfo = document.getElementById('debugCurrentParamInfo');
        if (!currentParamInfo || this.allDebugKeys.length === 0) return;
        
        const currentKey = this.allDebugKeys[this.currentDebugParameterIndex];
        const currentParam = this.app.parameters.getParameter(currentKey);
        
        if (!currentParam) return;
        
        // Build detailed parameter information
        let infoHTML = `<div style="color: #4CAF50; font-weight: bold; margin-bottom: 5px;">${currentParam.name}</div>`;
        infoHTML += `<div style="margin-bottom: 3px;">Value: ${currentParam.value.toFixed(4)}</div>`;
        infoHTML += `<div style="margin-bottom: 3px;">Range: ${currentParam.min} to ${currentParam.max}</div>`;
        infoHTML += `<div style="margin-bottom: 3px;">Step: ${currentParam.step}</div>`;
        
        // Add parameter-specific descriptions to help understand what each parameter does
        const descriptions = this.getParameterDescriptions();
        if (descriptions[currentKey]) {
            infoHTML += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444; color: #cccccc; font-size: 9px; line-height: 1.3;">`;
            infoHTML += descriptions[currentKey];
            infoHTML += `</div>`;
        }
        
        currentParamInfo.innerHTML = infoHTML;
    }

    // Get human-readable descriptions for both artistic and debug parameters
    // These help users understand what each parameter actually controls
    getParameterDescriptions() {
        return {
            // Artistic parameter descriptions
            'fly_speed': 'Speed of forward movement through the fractal tunnel. Higher values create faster flight.',
            'rotation_speed': 'Speed of overall rotation around the tunnel axis. Creates spinning motion effect.',
            'plane_rotation_speed': 'Speed of pattern plane rotation. Controls how fast individual pattern layers spin.',
            'zoom_level': 'Camera zoom factor. Higher values zoom in closer, lower values zoom out for wider view.',
            'kaleidoscope_segments': 'Number of mirror segments in kaleidoscope effect. Must be even for proper symmetry.',
            'truchet_radius': 'Size of truchet pattern circles. Larger values create bigger, more prominent circular patterns.',
            'center_fill_radius': 'Size of the central filled circle. Creates a focal point in the center of the view.',
            'layer_count': 'Number of pattern layers rendered in depth. More layers create richer, more complex visuals.',
            'camera_tilt_x': 'Camera tilt on X-axis. Positive values tilt the view up, negative values tilt down.',
            'camera_tilt_y': 'Camera tilt on Y-axis. Positive values tilt the view right, negative values tilt left.',
            'camera_roll': 'Camera roll rotation. Creates a tilting horizon effect for dynamic composition.',
            'path_stability': 'Stability of the camera path. Lower values create more curved, organic movement.',
            'path_scale': 'Scale of path variations. Higher values create wider, more dramatic path curves.',
            'contrast': 'Visual contrast between light and dark areas. Higher values create more dramatic lighting.',
            'color_intensity': 'Intensity of colors in the palette. Higher values create more vibrant, saturated colors.',
            'color_speed': 'Speed of color cycling through the palette. Higher values create faster color changes.',
            
            // Layer system descriptions
            'layer_distance': 'Distance between rendered layers. Lower values create tighter, more dense layering.',
            'layer_fade_start': 'Distance at which layers begin fading. Higher values show more distant layers.',
            'layer_fade_near': 'Near fade distance. Controls how quickly close layers fade in.',
            'layer_alpha_base': 'Base transparency for layers. Lower values make layers more see-through.',
            'layer_alpha_range': 'Transparency variation range. Controls transparency contrast between layers.',
            'layer_cutoff': 'Rendering cutoff threshold. Higher values render more layers (slower).',
            
            // Camera path descriptions
            'path_freq_primary': 'Primary frequency for curved path generation. √2 (1.414) creates organic, non-repeating curves.',
            'path_freq_secondary': 'Secondary frequency harmonic. √0.75 (0.866) adds complexity to path curves.',
            'path_freq_tertiary': 'Tertiary frequency harmonic. √0.5 (0.707) creates fine detail in path movement.',
            'path_amplitude': 'Overall amplitude of path curvature. Higher values create wider, more dramatic curves.',
            
            // Kaleidoscope descriptions
            'kaleidoscope_smoothing': 'Smoothing factor for kaleidoscope edges. Lower values create sharper mirror lines.',
            'kaleidoscope_smooth_scale': 'Scale factor for smoothing calculation. Affects how smoothing interacts with segment count.',
            
            // Pattern generation descriptions
            'pattern_threshold_full': 'Threshold for full truchet patterns (circle + both diagonals). Lower = more complex patterns.',
            'pattern_threshold_partial_a': 'Threshold for first partial pattern type. Controls pattern variety distribution.',
            'pattern_threshold_partial_b': 'Threshold for second partial pattern type. Affects visual density.',
            'pattern_offset_scale': 'Scale for random pattern offsets. Higher values create more pattern variation.',
            'pattern_base_offset': 'Base offset for pattern positioning. Affects overall pattern alignment.',
            
            // Random seed descriptions
            'hash_seed_rotation': 'Seed for rotation randomization. Different values create different rotation patterns.',
            'hash_seed_offset': 'Seed for position randomization. Controls how patterns are distributed spatially.',
            'hash_seed_speed': 'Seed for speed randomization. Affects how layers rotate at different rates.',
            
            // Field of view descriptions
            'fov_base': 'Base field of view. Higher values create wider perspective, like a wide-angle lens.',
            'fov_distortion': 'Perspective distortion amount. Controls barrel/fisheye distortion at screen edges.',
            'perspective_curve': 'Curvature factor for perspective calculation. Affects depth perception.',
            
            // Rendering descriptions
            'aa_multiplier': 'Anti-aliasing intensity multiplier. Higher values create smoother edges (slower).',
            'line_width_base': 'Base line width for pattern edges. Thicker lines create bolder patterns.',
            'detail_frequency': 'Frequency for fine detail generation. Higher values create more intricate edge details.',
            'truchet_diagonal_threshold': 'Threshold for diagonal pattern elements. √0.5 (0.707) is mathematically optimal.'
        };
    }

    // Reset current debug parameter to default
    resetCurrentDebugParameter() {
        if (this.allDebugKeys.length === 0) return;
        
        this.app.saveStateForUndo();
        const paramKey = this.allDebugKeys[this.currentDebugParameterIndex];
        this.app.parameters.resetParameter(paramKey);
        this.updateDebugMenuDisplay();
        
        const param = this.app.parameters.getParameter(paramKey);
        this.app.ui.updateStatus(`Reset: ${param.name} to default`, 'success');
    }

    // Randomize debug parameters (use with caution!)
    // Randomizes ALL debug parameters - can create wild/broken visualizations!
    randomizeDebugParameters() {
        this.app.saveStateForUndo();
        
        // Get ALL debug parameters and randomize them
        const allDebugKeys = this.app.parameters.getAllDebugParameterKeys();
        
        let randomizedCount = 0;
        allDebugKeys.forEach(key => {
            const param = this.app.parameters.getParameter(key);
            if (param) {
                const range = param.max - param.min;
                const newValue = param.min + Math.random() * range;
                this.app.parameters.setValue(key, newValue);
                randomizedCount++;
            }
        });
        
        this.parameterModificationCount += randomizedCount;
        this.updateDebugMenuDisplay();
        this.app.ui.updateStatus(`🎲 ${randomizedCount} debug parameters randomized (ALL OF THEM!)`, 'success');
    }

    // Export current debug parameter state for sharing
    // This creates a snapshot of all debug parameter values that can be shared or saved
    exportDebugState() {
        const debugState = {};
        this.allDebugKeys.forEach(key => {
            debugState[key] = this.app.parameters.getValue(key);
        });
        
        const stateString = JSON.stringify(debugState, null, 2);
        
        // Try to copy to clipboard, fall back to console logging
        if (navigator.clipboard) {
            navigator.clipboard.writeText(stateString).then(() => {
                this.app.ui.updateStatus('Debug state copied to clipboard', 'success');
            }).catch(() => {
                console.log('Debug state:', stateString);
                this.app.ui.updateStatus('Debug state logged to console', 'info');
            });
        } else {
            console.log('Debug state:', stateString);
            this.app.ui.updateStatus('Debug state logged to console', 'info');
        }
    }

    // Import debug state from clipboard or object
    // This allows loading previously saved debug configurations
    importDebugState(stateObject) {
        if (typeof stateObject === 'string') {
            try {
                stateObject = JSON.parse(stateObject);
            } catch (error) {
                this.app.ui.updateStatus('Invalid debug state format', 'error');
                return false;
            }
        }
        
        this.app.saveStateForUndo();
        
        let importedCount = 0;
        Object.keys(stateObject).forEach(key => {
            if (this.allDebugKeys.includes(key)) {
                this.app.parameters.setValue(key, stateObject[key]);
                importedCount++;
            }
        });
        
        this.updateDebugMenuDisplay();
        this.app.ui.updateStatus(`Imported ${importedCount} debug parameters`, 'success');
        return true;
    }

    // Get statistics about current debug parameter state
    getDebugStatistics() {
        const stats = {
            totalParameters: this.allDebugKeys.length,
            modifiedParameters: 0,
            categories: Object.keys(this.app.parameters.getDebugParameterCategories()).length
        };
        
        // Count how many parameters have been changed from defaults
        // This helps users understand how much they've customized the system
        this.allDebugKeys.forEach(key => {
            const param = this.app.parameters.getParameter(key);
            // We'd need to compare against default values to determine if modified
            // For now, just return the counts we have
        });
        
        return stats;
    }
    
    // Update the system status display in debug menu
    updateSystemStatus() {
        const statusElement = document.getElementById('debugSystemStatus');
        if (!statusElement || !this.app.debugMenuVisible) return;
        
        const systemStatus = this.app.getSystemStatus();
        const currentTime = new Date().toLocaleTimeString();
        
        let statusHTML = `<div style="margin-bottom: 6px;"><strong>🔧 System Performance [${currentTime}]</strong></div>`;
        
        // Core system metrics
        statusHTML += `<div style="margin-bottom: 4px;">`;
        statusHTML += `⏱️ Frame Time: ${systemStatus.averageFrameTime} (${systemStatus.estimatedFPS} FPS)<br>`;
        statusHTML += `🎬 Total Frames: ${systemStatus.totalFramesRendered.toLocaleString()}<br>`;
        statusHTML += `💾 Undo Stack: ${systemStatus.undoStackSize}/${50} steps`;
        statusHTML += `</div>`;
        
        // Current operational state
        statusHTML += `<div style="margin-bottom: 4px;"><strong>🎮 Active Systems:</strong><br>`;
        statusHTML += `${systemStatus.debugModeActive ? '🧮' : '🎨'} ${systemStatus.debugModeActive ? 'Debug Mode' : 'Artistic Mode'}<br>`;
        statusHTML += `${systemStatus.animationPaused ? '⏸️' : '▶️'} ${systemStatus.animationPaused ? 'Paused' : 'Animation'}<br>`;
        statusHTML += `${systemStatus.audioReactive ? '🎵' : '🔇'} Audio: ${systemStatus.audioReactive ? 'Reactive' : 'Static'}`;
        
        statusHTML += `</div>`;
        
        // Memory and performance warnings
        if (systemStatus.undoStackSize > 40) {
            statusHTML += `<div style="color: #FF9800;">⚠️ High memory usage</div>`;
        }
        
        const frameTime = parseFloat(systemStatus.averageFrameTime);
        if (frameTime > 20) {
            statusHTML += `<div style="color: #FF5722;">⚠️ Performance impact detected</div>`;
        }
        
        statusElement.innerHTML = statusHTML;
    }
    
    // Start periodic system status updates
    startSystemStatusUpdates() {
        // Update every 2 seconds for real-time monitoring
        this.systemStatusInterval = setInterval(() => {
            if (this.app.debugMenuVisible) {
                this.updateSystemStatus();
            }
        }, 2000);
    }
    
    // Stop system status updates
    stopSystemStatusUpdates() {
        if (this.systemStatusInterval) {
            clearInterval(this.systemStatusInterval);
            this.systemStatusInterval = null;
        }
    }
    
    
    
    
    // Set up microphone selection controls
    async setupMicrophoneControls() {
        const micSelect = document.getElementById('microphoneSelect');
        const refreshButton = document.getElementById('microphoneRefresh');
        const connectButton = document.getElementById('microphoneConnect');
        
        if (!micSelect || !refreshButton || !connectButton) {
            console.warn('Microphone controls not found in debug menu');
            return;
        }
        
        // Refresh devices list
        const refreshDevices = async () => {
            const devices = await this.app.audio.getAvailableDevices();
            
            // Clear existing options
            micSelect.innerHTML = '<option value="">Select microphone...</option>';
            
            // Add device options
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${device.deviceId.substring(0, 8)}`;
                micSelect.appendChild(option);
            });
            
            console.log(`🎤 Found ${devices.length} audio input devices`);
        };
        
        // Set up event handlers
        refreshButton.onclick = refreshDevices;
        
        connectButton.onclick = async () => {
            const selectedDeviceId = micSelect.value;
            if (!selectedDeviceId) {
                this.app.ui.updateStatus('Please select a microphone first', 'error');
                return;
            }
            
            // Initialize audio context if needed
            if (!this.app.audio.audioContext) {
                await this.app.audio.initAudioContext();
            }
            
            // Stop current microphone if active
            if (this.app.audio.microphoneActive) {
                this.app.audio.stopMicrophone();
            }
            
            // Set selected device and start
            this.app.audio.selectedMicrophoneId = selectedDeviceId;
            await this.app.audio.startMicrophone(selectedDeviceId);
        };
        
        // Initial device refresh
        await refreshDevices();
        
        console.log('Microphone selection controls initialized');
    }
    
    // Update microphone status display
    updateMicrophoneStatus() {
        const statusDiv = document.getElementById('microphoneStatus');
        const volumeBar = document.getElementById('microphoneVolumeBar');
        const volumeLevel = document.getElementById('microphoneVolumeLevel');
        const volumeText = document.getElementById('microphoneVolumeText');
        
        if (!statusDiv) return;
        
        if (this.app.audio.microphoneActive) {
            const deviceInfo = this.app.audio.availableDevices.find(
                device => device.deviceId === this.app.audio.selectedMicrophoneId
            );
            const deviceName = deviceInfo?.label || 'Unknown device';
            statusDiv.innerHTML = `<span style="color: #9C27B0;">● Active: ${deviceName}</span>`;
            
            // Show and update volume bar
            if (volumeBar) {
                volumeBar.style.display = 'block';
                
                // Get current volume level (0-1)
                const currentVolume = this.app.audio.getCurrentVolumeLevel();
                const volumePercent = Math.round(currentVolume * 100);
                
                if (volumeLevel) {
                    volumeLevel.style.width = `${volumePercent}%`;
                }
                
                if (volumeText) {
                    volumeText.textContent = `${volumePercent}%`;
                }
            }
        } else {
            statusDiv.innerHTML = '<span style="color: #888;">○ Not connected</span>';
            
            // Hide volume bar when not connected
            if (volumeBar) {
                volumeBar.style.display = 'none';
            }
        }
    }
    
    // Show debug logging control popup
    showDebugLoggingControls() {
        // Don't create if already visible
        if (this.debugLoggingMenuVisible) {
            return;
        }
        
        // Create menu dialog (no full-screen overlay)
        const dialog = document.createElement('div');
        dialog.id = 'debugLoggingOverlay';
        this.debugLoggingMenuVisible = true;
        dialog.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(26, 26, 26, 0.95);
            border: 2px solid #2196F3;
            border-radius: 12px;
            padding: 25px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            color: #ffffff;
            z-index: 10000;
            font-family: 'Courier New', monospace;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        const loggingOptions = [
            { key: 'audioLevels', label: '🎤 Audio Levels', desc: 'Real-time bass/mid/treble analysis' },
            { key: 'audioRawData', label: '🎤 Audio Raw Data', desc: 'Raw microphone data values' },
            { key: 'audioEffects', label: '🎨 Audio Effects', desc: 'Which parameters audio modifies' },
            { key: 'performanceFrames', label: '🎬 Performance Frames', desc: 'Frame timing every 60 frames' },
            { key: 'microphoneSetup', label: '🎤 Microphone Setup', desc: 'Device initialization info' },
            { key: 'parameterChanges', label: '📊 Parameter Changes', desc: 'When parameters are modified' },
            { key: 'systemStatus', label: '🔧 System Status', desc: 'Internal system diagnostics' }
        ];

        let checkboxHTML = '';
        loggingOptions.forEach(option => {
            const checked = this.debugLogging[option.key] ? 'checked' : '';
            checkboxHTML += `
                <div style="margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="debug_${option.key}" ${checked} 
                               style="margin-right: 10px; transform: scale(1.2);">
                        <div>
                            <div style="color: #2196F3; font-weight: bold; font-size: 13px;">${option.label}</div>
                            <div style="color: #cccccc; font-size: 11px; margin-top: 2px;">${option.desc}</div>
                        </div>
                    </label>
                </div>
            `;
        });

        dialog.innerHTML = `
            <h3 style="color: #2196F3; margin-bottom: 15px; font-size: 16px;">🔧 Debug Console Logging</h3>
            
            <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.4; color: #cccccc;">
                Choose which debug information to show in the browser console.
            </div>
            
            <div style="margin-bottom: 20px;">
                ${checkboxHTML}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="debugLoggingClear" style="padding: 8px 16px; background: #FF5722; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace;">Clear Console</button>
                <button id="debugLoggingClose" style="padding: 8px 16px; background: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: 'Courier New', monospace;">Close</button>
            </div>
        `;

        document.body.appendChild(dialog);

        // Set up event handlers for checkboxes
        loggingOptions.forEach(option => {
            const checkbox = document.getElementById(`debug_${option.key}`);
            if (checkbox) {
                checkbox.onchange = () => {
                    this.debugLogging[option.key] = checkbox.checked;
                    console.log(`🔧 Debug logging ${option.label}: ${checkbox.checked ? 'ON' : 'OFF'}`);
                };
            }
        });

        // Handle buttons
        const clearButton = document.getElementById('debugLoggingClear');
        const closeButton = document.getElementById('debugLoggingClose');
        
        if (clearButton) {
            clearButton.onclick = () => {
                console.clear();
                console.log('🔧 Console cleared');
            };
        }

        if (closeButton) {
            closeButton.onclick = () => {
                this.hideDebugLoggingControls(dialog);
            };
        }

        // ESC key handling moved to main controls for coordination

        // Focus the dialog
        setTimeout(() => dialog.focus(), 100);
    }
    
    // Hide debug logging controls
    hideDebugLoggingControls(dialog = null) {
        if (!dialog) {
            dialog = document.getElementById('debugLoggingOverlay');
        }
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
        this.debugLoggingMenuVisible = false;
    }
    
    // Helper method to check if a specific debug type should be logged
    shouldLog(type) {
        return this.debugLogging[type] || false;
    }
}